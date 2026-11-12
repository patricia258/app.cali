import { supabase } from '../supabase';

const unavailable = { message: 'Conexão indisponível.' };
const commentFields = 'id,notice_id,company_id,author_user_id,author_role,body,created_at';

type NoticeActor = { id: string; companyId: string | null };

export async function readNoticesBoard(admin: boolean) {
  if (!supabase) throw new Error(unavailable.message);
  const { data: session } = await supabase.auth.getSession();
  const id = session.session?.user?.id || '';
  const profile = id ? await supabase.from('profiles').select('company_id').eq('id', id).maybeSingle() : { data: null };
  const [notices, targets, acknowledgements, comments, reactions, people, companies] = await Promise.all([
    supabase.from('notices').select('id,protocol,category,title,body,notice_date,time_label,coverage,cover_path,audience,status,published_at')
      .order('published_at', { ascending: false }),
    supabase.from('notice_targets').select('notice_id,company_id'),
    supabase.from('notice_acknowledgements').select('notice_id,user_id,company_id,acknowledged_at'),
    supabase.from('notice_comments').select(commentFields).order('created_at'),
    supabase.from('notice_reactions').select('notice_id,user_id,reaction'),
    supabase.from('profiles').select('id,full_name'),
    admin ? supabase.from('companies').select('id,display_name').neq('status', 'archived').order('display_name') : { data: [] },
  ]);
  if (notices.error) throw notices.error;
  return {
    me: { id, companyId: admin ? null : profile.data?.company_id || null } satisfies NoticeActor,
    notices: notices.data ?? [],
    targets: (targets.data ?? []).reduce<Record<string, string[]>>((map, row) => {
      (map[row.notice_id] ||= []).push(row.company_id);
      return map;
    }, {}),
    reactions: (reactions.error ? [] : reactions.data ?? []).map((row) => ({ noticeId: row.notice_id, userId: row.user_id, reaction: row.reaction })),
    acknowledgements: (acknowledgements.data ?? []).map((row) => ({
      noticeId: row.notice_id, userId: row.user_id, companyId: row.company_id, at: row.acknowledged_at,
    })),
    comments: (comments.data ?? []).map(noticeComment),
    names: Object.fromEntries((people.data ?? []).map((row) => [row.id, row.full_name || ''])),
    companies: (companies.data ?? []).map((row) => ({ id: row.id, name: row.display_name })),
  };
}

function noticeComment(row: { id: string; notice_id: string; company_id: string | null; author_user_id: string; author_role: 'admin' | 'client'; body: string; created_at: string }) {
  return {
    id: row.id, noticeId: row.notice_id, companyId: row.company_id, authorId: row.author_user_id,
    authorRole: row.author_role, body: row.body, createdAt: row.created_at,
  };
}

export async function setNoticeReaction(noticeId: string, actor: NoticeActor, reaction: string | null) {
  if (!supabase) return { error: unavailable };
  return reaction === null
    ? await supabase.from('notice_reactions').delete().eq('notice_id', noticeId).eq('user_id', actor.id)
    : await supabase.from('notice_reactions').upsert({
      notice_id: noticeId, user_id: actor.id, company_id: actor.companyId, reaction,
    }, { onConflict: 'notice_id,user_id' });
}

export async function setNoticeAcknowledgement(noticeId: string, actor: NoticeActor, value: boolean) {
  if (!supabase) return { error: unavailable };
  return value
    ? await supabase.from('notice_acknowledgements').insert({ notice_id: noticeId, user_id: actor.id, company_id: actor.companyId })
    : await supabase.from('notice_acknowledgements').delete().eq('notice_id', noticeId).eq('user_id', actor.id);
}

export async function addNoticeComment(noticeId: string, actor: NoticeActor, role: 'admin' | 'client', text: string) {
  if (!supabase) return { data: null, error: unavailable };
  const result = await supabase.from('notice_comments').insert({
    notice_id: noticeId, company_id: actor.companyId, author_user_id: actor.id, author_role: role, body: text.trim(),
  }).select(commentFields).maybeSingle();
  return { data: result.data ? noticeComment(result.data) : null, error: result.error };
}

type NoticeDraft = {
  id: string | null; category: string; title: string; body: string; date: string; time: string;
  coverage: string; audience: 'all' | 'selected'; targets: string[];
};

export async function publishNotice(draft: NoticeDraft, coverFile: File | null) {
  if (!supabase) throw new Error(unavailable.message);
  const payload = {
    category: draft.category, title: draft.title.trim(), body: draft.body.trim(), notice_date: draft.date || null,
    time_label: draft.time.trim() || null, coverage: draft.coverage || null, audience: draft.audience,
  };
  const saved = draft.id
    ? await supabase.from('notices').update(payload).eq('id', draft.id).select('id').maybeSingle()
    : await supabase.from('notices').insert(payload).select('id').maybeSingle();
  if (saved.error) throw saved.error;
  const id = saved.data?.id || draft.id;
  if (!id) throw new Error('O aviso não foi gravado.');
  if (coverFile) {
    const path = `notices/${id}/${Date.now()}-${coverFile.name.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-60)}`;
    const upload = await supabase.storage.from('cali-workspace-private').upload(path, coverFile, {
      upsert: true, contentType: coverFile.type || undefined,
    });
    if (upload.error) throw upload.error;
    const cover = await supabase.from('notices').update({ cover_path: `private:${path}` }).eq('id', id);
    if (cover.error) throw cover.error;
  }
  const clear = await supabase.from('notice_targets').delete().eq('notice_id', id);
  if (clear.error) throw clear.error;
  if (draft.audience === 'selected') {
    const insert = await supabase.from('notice_targets').insert(draft.targets.map((companyId) => ({ notice_id: id, company_id: companyId })));
    if (insert.error) throw insert.error;
  }
  // A RPC ignora destinatários já avisados.
  await supabase.rpc('notify_notice', { p_notice_id: id });
}

export async function setNoticeStatus(id: string, status: 'published' | 'archived') {
  if (!supabase) return { error: unavailable };
  return await supabase.from('notices').update({ status }).eq('id', id);
}

export async function readClientHomeNotices() {
  if (!supabase) return [];
  const { data: session } = await supabase.auth.getSession();
  const uid = session.session?.user?.id || '';
  const [notices, receipts] = await Promise.all([
    supabase.from('notices').select('id,category,title,cover_path,published_at').eq('status', 'published')
      .order('published_at', { ascending: false }).limit(2),
    supabase.from('notice_acknowledgements').select('notice_id').eq('user_id', uid),
  ]);
  const acked = new Set((receipts.data ?? []).map((row) => row.notice_id));
  return (notices.data ?? []).map((row) => ({ ...row, acked: acked.has(row.id) }));
}

export async function readCalendarNotice(noticeId: string) {
  if (!supabase) return null;
  const result = await supabase.from('notices').select('protocol,category,title,body,notice_date,time_label,coverage,cover_path')
    .eq('id', noticeId).limit(1);
  return result.data?.[0] ?? null;
}
