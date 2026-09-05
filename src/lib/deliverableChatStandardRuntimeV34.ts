import { supabase } from './supabase';

type Role = 'admin' | 'client';
type ReactionCode = 'ok' | 'like' | 'question' | 'heart' | 'smile';
type Identity = {
  id?: string | null;
  full_name: string;
  avatar_url?: string | null;
  avatar_position_x?: number | null;
  avatar_position_y?: number | null;
  avatar_zoom?: number | null;
  role?: string | null;
};
type CommentRow = {
  id: string;
  company_id: string;
  target_id: string;
  author_user_id?: string | null;
  body: string;
  client_visible: boolean;
  source_actor?: 'admin' | 'client' | 'system' | null;
  created_at: string;
};
type ReactionRow = { id?: string; comment_id: string; user_id: string; reaction: ReactionCode };
type FileToken = { name: string; path: string; mime: string; size: number };
type DeliverableContext = { id: string; company_id: string; project_id?: string | null; protocol?: string | null };

let installed = false;
let observer: MutationObserver | null = null;
let debounce = 0;
let busy = false;
let activeDeliverable = '';
let activeChannel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null;
let pending: FileToken[] = [];
const signedMediaCache = new Map<string, string>();
const emojis = ['🙂', '😊', '👍', '🙏', '✨', '✅', '💡', '📌', '📎', '❤️', '👏', '🤝'];
const fileToken = /\[\[arquivo\|([^|]+)\|([^|]+)\|([^|]+)\|(\d+)\]\]/g;
const reactions: Array<{ code: ReactionCode; symbol: string; label: string }> = [
  { code: 'ok', symbol: '✓', label: 'Entendido' },
  { code: 'like', symbol: '👍', label: 'Gostei' },
  { code: 'question', symbol: '?', label: 'Tenho uma dúvida' },
  { code: 'heart', symbol: '♥', label: 'Amei' },
  { code: 'smile', symbol: '☺', label: 'Legal' },
];

function pageRole(): Role | null {
  if (location.pathname.startsWith('/admin/projetos')) return 'admin';
  if (location.pathname.startsWith('/cliente/entregaveis')) return 'client';
  return null;
}

function initials(value: string) {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('') || 'C';
}

function when(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date).replace('.', '');
}

function safe(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').slice(0, 90) || 'arquivo';
}

function setValue(element: HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
  setter?.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.focus();
}

async function resolvePrivateMedia(raw?: string | null) {
  if (!raw || !supabase || !raw.startsWith('private:')) return raw || '';
  const cached = signedMediaCache.get(raw);
  if (cached) return cached;
  const { data, error } = await supabase.storage.from('cali-workspace-private').createSignedUrl(raw.slice('private:'.length), 3600);
  if (error || !data?.signedUrl) return '';
  signedMediaCache.set(raw, data.signedUrl);
  return data.signedUrl;
}

async function hydrateIdentity(value: Identity): Promise<Identity> {
  return { ...value, avatar_url: await resolvePrivateMedia(value.avatar_url) };
}

function createAvatar(identity: Identity) {
  const avatar = document.createElement('span');
  avatar.className = 'workspace-chat-avatar';
  if (identity.avatar_url) {
    const x = Number(identity.avatar_position_x ?? 50);
    const y = Number(identity.avatar_position_y ?? 50);
    const zoom = Math.max(1, Number(identity.avatar_zoom ?? 1));
    avatar.style.backgroundImage = `url("${identity.avatar_url.replace(/"/g, '\\"')}")`;
    avatar.style.backgroundRepeat = 'no-repeat';
    avatar.style.backgroundPosition = `${x}% ${y}%`;
    avatar.style.backgroundSize = `${zoom * 100}%`;
  } else {
    avatar.textContent = initials(identity.full_name);
  }
  avatar.title = identity.full_name;
  return avatar;
}

function parseBody(body: string) {
  const files: FileToken[] = [];
  const clean = body.replace(fileToken, (_match, name, path, mime, size) => {
    try {
      files.push({ name: decodeURIComponent(name), path: decodeURIComponent(path), mime: decodeURIComponent(mime), size: Number(size || 0) });
    } catch {
      files.push({ name, path, mime, size: Number(size || 0) });
    }
    return '';
  }).trim();
  return { clean, files };
}

function linkify(parent: HTMLElement, text: string) {
  text.split(/(https?:\/\/[^\s]+)/g).forEach((part) => {
    if (/^https?:\/\//i.test(part)) {
      const link = document.createElement('a');
      link.href = part;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = part;
      parent.append(link);
    } else if (part) parent.append(document.createTextNode(part));
  });
}

async function openFile(file: FileToken) {
  if (!supabase) return;
  const { data, error } = await supabase.storage.from('cali-workspace-private').createSignedUrl(file.path, 300);
  if (error || !data?.signedUrl) {
    alert('Não foi possível abrir este anexo agora.');
    return;
  }
  window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
}

async function identities(role: Role, companyId: string) {
  const map = new Map<string, Identity>();
  let admin: Identity = { full_name: 'Patrícia Lima' };
  let client: Identity = { full_name: 'Cliente' };
  if (!supabase) return { map, admin, client };

  const { data: session } = await supabase.auth.getSession();
  const uid = session.session?.user?.id || '';
  const selfResult = uid
    ? await supabase.from('profiles').select('id,full_name,role,avatar_url,avatar_position_x,avatar_position_y,avatar_zoom').eq('id', uid).maybeSingle()
    : { data: null } as any;
  const self = selfResult.data ? await hydrateIdentity(selfResult.data as Identity) : null;
  if (self?.id) map.set(String(self.id), self);

  if (role === 'admin') {
    if (self) admin = self;
    const clients = await supabase.from('profiles').select('id,full_name,role,avatar_url,avatar_position_x,avatar_position_y,avatar_zoom').eq('company_id', companyId).eq('role', 'client').eq('active', true);
    for (const row of (clients.data || []) as Identity[]) {
      const person = await hydrateIdentity(row);
      if (person.id) map.set(String(person.id), person);
      if (client.full_name === 'Cliente') client = person;
    }
  } else {
    if (self?.role === 'client') client = self;
    if (self?.role === 'admin') {
      admin = self;
      const clients = await supabase.from('profiles').select('id,full_name,role,avatar_url,avatar_position_x,avatar_position_y,avatar_zoom').eq('company_id', companyId).eq('role', 'client').eq('active', true).limit(5);
      for (const row of (clients.data || []) as Identity[]) {
        const person = await hydrateIdentity(row);
        if (person.id) map.set(String(person.id), person);
        if (client.full_name === 'Cliente') client = person;
      }
    } else {
      const contact = await supabase.rpc('get_client_account_contact');
      const row = Array.isArray(contact.data) ? contact.data[0] : contact.data;
      if (row) admin = await hydrateIdentity(row as Identity);
    }
  }
  return { map, admin, client };
}

function who(message: CommentRow, all: Awaited<ReturnType<typeof identities>>) {
  if (message.author_user_id && all.map.has(message.author_user_id)) return all.map.get(message.author_user_id)!;
  if (message.source_actor === 'client') return all.client;
  if (message.source_actor === 'system') return { full_name: 'CALI Workspace' } as Identity;
  return all.admin;
}

function currentVisibleChannel(role: Role) {
  if (role === 'client') return true;
  const active = document.querySelector<HTMLElement>('.deliverable-workspace-modal-v2 .conversation-channels-v2 button.active');
  return !active || /cliente/i.test(active.textContent || '');
}

async function toggleReaction(comment: CommentRow, reaction: ReactionCode) {
  if (!supabase) return;
  const { data: session } = await supabase.auth.getSession();
  const uid = session.session?.user?.id;
  if (!uid) return;
  const existing = await supabase.from('comment_reactions').select('id').eq('comment_id', comment.id).eq('user_id', uid).eq('reaction', reaction).maybeSingle();
  if (existing.data?.id) {
    const result = await supabase.from('comment_reactions').delete().eq('id', existing.data.id);
    if (result.error) alert(result.error.message);
  } else {
    const result = await supabase.from('comment_reactions').insert({ company_id: comment.company_id, comment_id: comment.id, user_id: uid, reaction });
    if (result.error) alert(result.error.message);
  }
  window.setTimeout(schedule, 60);
}

function reactionBar(message: CommentRow, rows: ReactionRow[], viewerId: string) {
  const bar = document.createElement('div');
  bar.className = 'workspace-chat-reactions';
  reactions.forEach((option) => {
    const matching = rows.filter((row) => row.comment_id === message.id && row.reaction === option.code);
    const mine = matching.some((row) => row.user_id === viewerId);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = mine ? 'active' : '';
    button.title = option.label;
    button.setAttribute('aria-label', option.label);
    button.setAttribute('aria-pressed', String(mine));
    const symbol = document.createElement('span');
    symbol.textContent = option.symbol;
    button.append(symbol);
    if (matching.length) {
      const count = document.createElement('small');
      count.textContent = String(matching.length);
      button.append(count);
    }
    button.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      void toggleReaction(message, option.code);
    };
    bar.append(button);
  });
  return bar;
}

async function renderConversation(context: DeliverableContext, role: Role) {
  if (!supabase) return;
  const list = document.querySelector<HTMLElement>('.deliverable-workspace-modal-v2 .conversation-list-v2');
  if (!list) return;
  const visible = currentVisibleChannel(role);
  let query = supabase.from('comments').select('id,company_id,target_id,author_user_id,body,client_visible,source_actor,created_at').eq('target_type', 'deliverable').eq('target_id', context.id).eq('client_visible', visible).order('created_at');
  const [commentResult, identitySet, sessionResult] = await Promise.all([query, identities(role, context.company_id), supabase.auth.getSession()]);
  if (commentResult.error) return;
  const messages = (commentResult.data || []) as CommentRow[];
  const ids = messages.map((message) => message.id);
  const reactionRows = ids.length
    ? ((await supabase.from('comment_reactions').select('id,comment_id,user_id,reaction').in('comment_id', ids)).data || []) as ReactionRow[])
    : [];
  const viewerId = sessionResult.data.session?.user?.id || '';
  const signature = `${visible}:${messages.map((message) => `${message.id}:${message.body}:${message.created_at}`).join('|')}:${reactionRows.map((row) => `${row.comment_id}:${row.user_id}:${row.reaction}`).join('|')}`;
  if (list.dataset.workspaceChatSignature === signature && list.querySelector('.workspace-chat-line,.workspace-chat-empty')) return;
  list.dataset.workspaceChatSignature = signature;
  list.classList.add('workspace-chat-list');
  list.replaceChildren();

  if (!messages.length) {
    const empty = document.createElement('div');
    empty.className = 'workspace-chat-empty';
    empty.textContent = visible ? 'A conversa começa aqui.' : 'Nenhuma nota interna neste entregável.';
    list.append(empty);
    return;
  }

  messages.forEach((message) => {
    const identity = who(message, identitySet);
    const actor = message.source_actor || (message.client_visible ? 'admin' : 'admin');
    const mine = actor === role;
    const line = document.createElement('div');
    line.className = `workspace-chat-line role-${actor} ${mine ? 'mine' : 'other'} ${visible ? '' : 'internal'}`;
    line.dataset.commentId = message.id;

    const bubble = document.createElement('div');
    bubble.className = 'workspace-chat-bubble';
    const head = document.createElement('div');
    head.className = 'workspace-chat-head';
    const name = document.createElement('strong');
    name.textContent = visible ? identity.full_name : `${identity.full_name} · nota interna`;
    const time = document.createElement('time');
    time.textContent = when(message.created_at);
    head.append(name, time);
    bubble.append(head);

    const parsed = parseBody(message.body);
    if (parsed.clean) {
      const paragraph = document.createElement('p');
      linkify(paragraph, parsed.clean);
      bubble.append(paragraph);
    }
    if (parsed.files.length) {
      const attachments = document.createElement('div');
      attachments.className = 'workspace-chat-attachments';
      parsed.files.forEach((file) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'workspace-chat-attachment';
        button.innerHTML = `<span>📎</span><span><strong></strong><small></small></span>`;
        const strong = button.querySelector('strong');
        const small = button.querySelector('small');
        if (strong) strong.textContent = file.name;
        if (small) small.textContent = file.size ? `${Math.max(1, Math.round(file.size / 1024))} KB` : 'arquivo';
        button.onclick = () => void openFile(file);
        attachments.append(button);
      });
      bubble.append(attachments);
    }
    if (visible && actor !== 'system') bubble.append(reactionBar(message, reactionRows, viewerId));

    if (mine) line.append(bubble, createAvatar(identity));
    else line.append(createAvatar(identity), bubble);
    list.append(line);
  });
  window.requestAnimationFrame(() => { list.scrollTop = list.scrollHeight; });
}

function pendingTray(compose: HTMLElement) {
  let tray = compose.querySelector<HTMLElement>('.workspace-chat-pending');
  if (!tray) {
    tray = document.createElement('div');
    tray.className = 'workspace-chat-pending';
    compose.prepend(tray);
  }
  tray.replaceChildren();
  pending.forEach((file, index) => {
    const chip = document.createElement('span');
    chip.className = 'workspace-chat-pending-chip';
    const label = document.createElement('span');
    label.textContent = `📎 ${file.name}`;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = '×';
    remove.onclick = async () => {
      pending.splice(index, 1);
      if (supabase) await supabase.storage.from('cali-workspace-private').remove([file.path]);
      pendingTray(compose);
    };
    chip.append(label, remove);
    tray!.append(chip);
  });
  tray.style.display = pending.length ? 'flex' : 'none';
}

async function upload(file: File, context: DeliverableContext, compose: HTMLElement) {
  if (!supabase) return;
  const allowed = new Set([
    'application/pdf', 'image/png', 'image/jpeg', 'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ]);
  if (!allowed.has(file.type)) { alert('Use PDF, imagem, Word, Excel ou PowerPoint.'); return; }
  if (file.size > 10 * 1024 * 1024) { alert('Cada anexo pode ter até 10 MB.'); return; }
  if (pending.length >= 5) { alert('Você pode enviar até 5 anexos por mensagem.'); return; }
  const { data: session } = await supabase.auth.getSession();
  const uid = session.session?.user?.id;
  if (!uid) return;
  const path = `deliverable-chat/${context.company_id}/${context.id}/${uid}/${Date.now()}-${safe(file.name)}`;
  const { error } = await supabase.storage.from('cali-workspace-private').upload(path, file, { contentType: file.type, upsert: false });
  if (error) { alert(`Não consegui anexar “${file.name}”.`); return; }
  pending.push({ name: file.name, path, mime: file.type, size: file.size });
  pendingTray(compose);
}

async function send(context: DeliverableContext, role: Role, textarea: HTMLTextAreaElement, button: HTMLButtonElement, compose: HTMLElement) {
  if (!supabase) return;
  const text = textarea.value.trim();
  if (!text && !pending.length) return;
  const tokens = pending.map((file) => `[[arquivo|${encodeURIComponent(file.name)}|${encodeURIComponent(file.path)}|${encodeURIComponent(file.mime)}|${file.size}]]`).join('\n');
  const body = [text, tokens].filter(Boolean).join('\n');
  button.disabled = true;
  try {
    if (role === 'client') {
      const result = await supabase.rpc('client_submit_deliverable_comment', { p_deliverable_id: context.id, p_body: body });
      if (result.error) throw result.error;
    } else {
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user?.id || null;
      const visible = currentVisibleChannel(role);
      const result = await supabase.from('comments').insert({
        company_id: context.company_id,
        target_type: 'deliverable',
        target_id: context.id,
        author_user_id: uid,
        body,
        client_visible: visible,
        source_actor: 'admin',
      });
      if (result.error) throw result.error;
    }
    pending = [];
    setValue(textarea, '');
    pendingTray(compose);
    window.setTimeout(schedule, 80);
  } catch (error) {
    alert(error instanceof Error ? error.message : 'Não foi possível enviar a mensagem.');
  } finally {
    button.disabled = false;
  }
}

function enhanceComposer(context: DeliverableContext, role: Role) {
  const pane = document.querySelector<HTMLElement>('.deliverable-workspace-modal-v2 .conversation-pane-v2');
  const compose = pane?.querySelector<HTMLElement>('.conversation-composer-v2');
  const textarea = compose?.querySelector<HTMLTextAreaElement>('textarea');
  const sendButton = compose?.querySelector<HTMLButtonElement>('button.primary');
  if (!compose || !textarea || !sendButton) return;
  compose.classList.add('workspace-chat-compose');

  if (!compose.querySelector('.workspace-chat-tools')) {
    const tools = document.createElement('div');
    tools.className = 'workspace-chat-tools';

    const attach = document.createElement('button');
    attach.type = 'button';
    attach.textContent = '📎';
    attach.title = 'Anexar arquivo';
    attach.setAttribute('aria-label', 'Anexar arquivo');
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.hidden = true;
    input.accept = '.pdf,.png,.jpg,.jpeg,.webp,.docx,.xlsx,.pptx';
    attach.onclick = () => input.click();
    input.onchange = async () => {
      for (const file of Array.from(input.files || [])) await upload(file, context, compose);
      input.value = '';
    };

    const link = document.createElement('button');
    link.type = 'button';
    link.textContent = '🔗';
    link.title = 'Inserir link';
    link.setAttribute('aria-label', 'Inserir link');
    link.onclick = () => {
      const value = prompt('Cole o link que deseja compartilhar:');
      if (!value) return;
      const url = /^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`;
      setValue(textarea, `${textarea.value}${textarea.value ? ' ' : ''}${url}`);
    };

    const emoji = document.createElement('button');
    emoji.type = 'button';
    emoji.textContent = '😊';
    emoji.title = 'Emojis';
    emoji.setAttribute('aria-label', 'Abrir emojis');
    const picker = document.createElement('div');
    picker.className = 'workspace-chat-emoji-picker';
    picker.hidden = true;
    emojis.forEach((symbol) => {
      const option = document.createElement('button');
      option.type = 'button';
      option.textContent = symbol;
      option.onclick = () => {
        setValue(textarea, `${textarea.value}${symbol}`);
        picker.hidden = true;
      };
      picker.append(option);
    });
    emoji.onclick = () => { picker.hidden = !picker.hidden; };

    tools.append(attach, input, link, emoji, picker);
    compose.insertBefore(tools, textarea);
    pendingTray(compose);

    // O admin antigo já trazia seu próprio botão de anexo. Mantemos apenas o padrão novo.
    if (role === 'admin') {
      compose.querySelectorAll<HTMLButtonElement>('.secondary').forEach((button) => {
        if (/anexar/i.test(button.textContent || '')) button.style.display = 'none';
      });
    }
  }

  if (!sendButton.dataset.workspaceChatBound) {
    sendButton.dataset.workspaceChatBound = '1';
    sendButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      void send(context, role, textarea, sendButton, compose);
    }, true);
    textarea.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        void send(context, role, textarea, sendButton, compose);
      }
    }, true);
  }
}

async function subscribe(context: DeliverableContext) {
  if (!supabase || (activeDeliverable === context.id && activeChannel)) return;
  if (activeChannel) await supabase.removeChannel(activeChannel);
  activeDeliverable = context.id;
  activeChannel = supabase.channel(`deliverable-chat-standard-${context.id}-${Date.now()}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'cali_workspace', table: 'comments', filter: `target_id=eq.${context.id}` }, () => {
      window.dispatchEvent(new CustomEvent('cali:workspace-chime'));
      window.setTimeout(schedule, 70);
    })
    .on('postgres_changes', { event: '*', schema: 'cali_workspace', table: 'comment_reactions', filter: `company_id=eq.${context.company_id}` }, () => window.setTimeout(schedule, 60))
    .subscribe();
}

async function enhance() {
  if (busy || !supabase) return;
  const role = pageRole();
  if (!role) return;
  const modal = document.querySelector<HTMLElement>('.deliverable-workspace-modal-v2');
  if (!modal) return;

  // Na visão do cliente o status já aparece no rodapé. Remove a duplicação no cabeçalho.
  if (role === 'client') modal.querySelector<HTMLElement>('.deliverable-workspace-header-v2 .status-chip-v3')?.remove();

  const protocol = modal.querySelector<HTMLElement>('.deliverable-title-v2 .section-kicker')?.textContent?.trim() || '';
  if (!protocol || !protocol.startsWith('CALI-DEL-')) return;
  busy = true;
  try {
    const result = await supabase.from('deliverables').select('id,company_id,project_id,protocol').eq('protocol', protocol).maybeSingle();
    const context = result.data as DeliverableContext | null;
    if (!context?.id || !context.company_id) return;
    await subscribe(context);
    const pane = modal.querySelector<HTMLElement>('.conversation-pane-v2');
    if (pane) {
      pane.classList.add('workspace-chat-standard');
      await renderConversation(context, role);
      enhanceComposer(context, role);
    }
  } finally {
    busy = false;
  }
}

function schedule() {
  window.clearTimeout(debounce);
  debounce = window.setTimeout(() => void enhance(), 65);
}

export function installDeliverableChatStandardRuntimeV34() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  schedule();
  observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('focus', schedule);
  window.addEventListener('popstate', schedule);
}
