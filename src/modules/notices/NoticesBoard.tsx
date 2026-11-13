import { AdminRowActions, AdminRowButton } from '../../components/workspace/components/AdminRowActions';
import { NoticeFeedCard } from './components/NoticeFeedCard';
import {
  NoticeBadge,
  noticeCategories as CATEGORIES,
  type NoticeCategory as Category,
} from './components/NoticeBadge';
import { NoticeContent, formatNoticeDay as formatDay } from './components/NoticeContent';
import {
  NoticeBoardLink,
  NoticeButton,
  NoticeComposeFields,
  NoticeDialog,
  NoticeDialogBody,
  NoticeDialogFooter,
} from './components/NoticeDialog';
import { InlineNotice } from '../../components/ds/InlineNotice';
import { LoadingState } from '../../components/ds/LoadingState';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useObjectUrl } from '../../hooks/useObjectUrl';
import { useSearchParams } from '../../hooks/useSearchParams';
import {
  Archive,
  ArrowRight,
  Check,
  Megaphone,
  Pencil,
  Plus,
  RotateCcw,
  Send,
} from 'lucide-react';
import { Shell, type Role } from '../../components/workspace/WorkspaceShell';
import {
  addNoticeComment,
  publishNotice,
  readCalendarNotice,
  readNoticesBoard,
  setNoticeAcknowledgement,
  setNoticeReaction,
  setNoticeStatus,
} from '../../api/notices/board';
import { AdminNoticeReviews } from './AdminNoticeReviews';
import { resolveWorkspaceMedia } from '../../lib/workspaceMedia';

/* Quadro de Avisos — composição aprovada na V2 (mural com capa, categoria, ciência e comentários).
   Só a administradora publica; o cliente lê os avisos da própria empresa, registra ciência e comenta.
   Tabelas: notices, notice_targets, notice_acknowledgements, notice_comments (migração 20261011220000). */

type Notice = {
  id: string;
  protocol: string;
  category: Category;
  title: string;
  body: string;
  date: string | null;
  time: string | null;
  coverage: string | null;
  coverPath: string | null;
  coverUrl: string;
  audience: 'all' | 'selected';
  status: 'published' | 'archived';
  publishedAt: string;
};
type Company = { id: string; name: string };
type Ack = { noticeId: string; userId: string; companyId: string | null; at: string };
type Comment = {
  id: string;
  noticeId: string;
  companyId: string | null;
  authorId: string;
  authorRole: 'admin' | 'client';
  body: string;
  createdAt: string;
};
type Draft = {
  id: string | null;
  category: Category;
  title: string;
  body: string;
  date: string;
  time: string;
  coverage: string;
  audience: 'all' | 'selected';
  targets: string[];
  coverPath: string | null;
};

const COVERAGES = ['Nacional', 'Estadual', 'Municipal', 'Equipe CALI', 'Cliente'];
const formatMoment = (value: string) =>
  new Date(value)
    .toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    .replace('.', '');
const today = () => new Date().toISOString().slice(0, 10);
const emptyDraft = (): Draft => ({
  id: null,
  category: 'comunicado',
  title: '',
  body: '',
  date: today(),
  time: '',
  coverage: 'Nacional',
  audience: 'all',
  targets: [],
  coverPath: null,
});

const REACTIONS: [string, string, string][] = [
  ['like', '👍', 'Curti'],
  ['love', '❤️', 'Amei'],
  ['clap', '👏', 'Parabéns'],
];

/* `staff`: o Partner (Equipe CALI) vê o mesmo mural, sem ciência/comentário/reação, e publica pelo botão do topo. */
function NoticesBoard({ role, staff }: { role: Role; staff?: { onCompose: () => void } }) {
  const admin = role === 'admin';
  const [searchParams, setSearchParams] = useSearchParams();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [targets, setTargets] = useState<Record<string, string[]>>({});
  const [acks, setAcks] = useState<Ack[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [reactions, setReactions] = useState<{ noticeId: string; userId: string; reaction: string }[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [me, setMe] = useState<{ id: string; companyId: string | null }>({ id: '', companyId: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Category | 'all'>('all');
  const [view, setView] = useState<'mural' | 'manage'>('mural');
  const [showArchived, setShowArchived] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  // A resposta da CALI vai para a empresa escolhida: comentários de empresas diferentes não se misturam.
  const [replyCompany, setReplyCompany] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const coverPreview =
    useObjectUrl(draft ? coverFile : null) ?? notices.find((item) => item.id === draft?.id)?.coverUrl;
  const [saving, setSaving] = useState(false);

  async function load() {
    setError('');
    try {
      const board = await readNoticesBoard(admin);
      setMe(board.me);
      const rows = await Promise.all(
        board.notices.map(async (row): Promise<Notice> => ({
          id: row.id,
          protocol: row.protocol,
          category: row.category,
          title: row.title,
          body: row.body || '',
          date: row.notice_date,
          time: row.time_label,
          coverage: row.coverage,
          coverPath: row.cover_path,
          coverUrl: row.cover_path ? (await resolveWorkspaceMedia(row.cover_path, 86400)) || '' : '',
          audience: row.audience,
          status: row.status,
          publishedAt: row.published_at,
        })),
      );
      setNotices(rows);
      setTargets(board.targets);
      setReactions(board.reactions);
      setAcks(board.acknowledgements);
      setComments(board.comments);
      setNames(board.names);
      if (admin) setCompanies(board.companies);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar os avisos.');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    const wanted = searchParams.get('aviso');
    if (wanted && notices.some((item) => item.id === wanted)) setActiveId(wanted);
  }, [searchParams, notices]);

  const companyName = useMemo(() => new Map(companies.map((item) => [item.id, item.name])), [companies]);
  const visible = useMemo(
    () =>
      notices.filter(
        (item) =>
          (admin && view === 'manage'
            ? showArchived
              ? item.status === 'archived'
              : item.status === 'published'
            : item.status === 'published') &&
          (filter === 'all' || item.category === filter),
      ),
    [notices, admin, view, showArchived, filter],
  );
  const active = notices.find((item) => item.id === activeId) || null;
  const iAcked = (id: string) => acks.some((item) => item.noticeId === id && item.userId === me.id);
  const acksOf = (id: string) => acks.filter((item) => item.noticeId === id);
  const commentsOf = (id: string) => comments.filter((item) => item.noticeId === id);
  const commentCompanies = (id: string) =>
    Array.from(
      new Set(
        commentsOf(id)
          .map((item) => item.companyId)
          .filter((value): value is string => Boolean(value)),
      ),
    );
  const audienceLabel = (item: Notice) =>
    item.audience === 'all'
      ? 'Todas as empresas'
      : (targets[item.id] || []).map((id) => companyName.get(id) || 'Empresa').join(', ') ||
        'Nenhuma empresa escolhida';
  const authorLabel = (item: Comment) =>
    item.authorRole === 'admin'
      ? 'CALI · Assessoria'
      : `${names[item.authorId] || 'Cliente'}${admin && item.companyId ? ` · ${companyName.get(item.companyId) || ''}` : ''}`;

  function closeDetail() {
    setActiveId(null);
    setCommentText('');
    setReplyCompany('');
    setError('');
    if (searchParams.get('aviso')) {
      const next = new URLSearchParams(searchParams);
      next.delete('aviso');
      setSearchParams(next, { replace: true });
    }
  }

  const myReaction = (id: string) =>
    reactions.find((item) => item.noticeId === id && item.userId === me.id)?.reaction || '';
  async function react(item: Notice, reaction: string) {
    if (!me.id) return;
    const current = myReaction(item.id);
    const previous = reactions;
    setError('');
    setReactions((list) => [
      ...list.filter((row) => !(row.noticeId === item.id && row.userId === me.id)),
      ...(current === reaction ? [] : [{ noticeId: item.id, userId: me.id, reaction }]),
    ]);
    const result = await setNoticeReaction(item.id, me, current === reaction ? null : reaction);
    if (result.error) {
      setReactions(previous);
      setError('Não foi possível registrar a reação. Tente de novo.');
    }
  }
  const reactionBar = (item: Notice) => (
    <div
      className="tw:flex tw:flex-wrap tw:items-center tw:gap-[0.615rem]"
      role="group"
      aria-label="Reagir ao comunicado"
    >
      {REACTIONS.map(([key, emoji, label]) => {
        const count = reactions.filter((row) => row.noticeId === item.id && row.reaction === key).length;
        if (staff && !count) return null;
        return (
          <button
            type="button"
            key={key}
            className="tw:inline-flex tw:h-[2.462rem] tw:items-center tw:gap-[0.462rem] tw:rounded-full tw:border tw:border-solid tw:border-[#e7ddd5] tw:bg-white tw:px-[0.846rem] tw:text-[0.846rem] tw:text-[#67574c] tw:enabled:hover:border-[#d9c9c0] tw:motion-safe:enabled:hover:-translate-y-px tw:aria-pressed:border-cali-brand tw:aria-pressed:bg-[#f6edf0] tw:aria-pressed:font-bold tw:aria-pressed:text-cali-brand tw:[&_span]:text-[1.154rem]/none tw:[&_i]:not-italic"
            aria-pressed={myReaction(item.id) === key}
            title={label}
            disabled={Boolean(staff)}
            onClick={(event) => {
              event.stopPropagation();
              void react(item, key);
            }}
          >
            <span aria-hidden="true">{emoji}</span>
            {count > 0 && <b>{count}</b>}
            <i>{label}</i>
          </button>
        );
      })}
    </div>
  );
  async function toggleAck(item: Notice) {
    if (admin || !me.id) return;
    setError('');
    const done = iAcked(item.id);
    const result = await setNoticeAcknowledgement(item.id, me, !done);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setAcks((current) =>
      done
        ? current.filter((ack) => !(ack.noticeId === item.id && ack.userId === me.id))
        : [
            ...current,
            { noticeId: item.id, userId: me.id, companyId: me.companyId, at: new Date().toISOString() },
          ],
    );
  }

  async function sendComment(item: Notice) {
    if (!commentText.trim() || !me.id) return;
    const replyTo = admin ? replyCompany || commentCompanies(item.id)[0] || '' : '';
    if (admin && !replyTo) return;
    setError('');
    const result = await addNoticeComment(
      item.id,
      { id: me.id, companyId: admin ? replyTo : me.companyId },
      admin ? 'admin' : 'client',
      commentText,
    );
    if (result.error) {
      setError(result.error.message);
      return;
    }
    if (result.data) {
      const comment = result.data;
      setComments((current) => [...current, comment]);
    }
    setCommentText('');
  }

  function openCompose(item?: Notice) {
    setError('');
    setCoverFile(null);
    setDraft(
      item
        ? {
            id: item.id,
            category: item.category,
            title: item.title,
            body: item.body,
            date: item.date || '',
            time: item.time || '',
            coverage: item.coverage || 'Nacional',
            audience: item.audience,
            targets: targets[item.id] || [],
            coverPath: item.coverPath,
          }
        : emptyDraft(),
    );
  }
  function closeCompose() {
    setDraft(null);
    setCoverFile(null);
  }

  async function saveNotice(event: FormEvent) {
    event.preventDefault();
    if (!draft || !draft.title.trim() || !draft.body.trim()) return;
    if (draft.audience === 'selected' && !draft.targets.length) {
      setError('Escolha pelo menos uma empresa ou publique para todas.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await publishNotice(draft, coverFile);
      closeCompose();
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível publicar o aviso.');
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(item: Notice, status: Notice['status']) {
    const result = await setNoticeStatus(item.id, status);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setNotices((current) => current.map((notice) => (notice.id === item.id ? { ...notice, status } : notice)));
  }

  if (loading && staff)
    return (
      <section className="v2-client-module data-loading" aria-live="polite" aria-busy="true">
        Carregando avisos…
      </section>
    );
  if (loading)
    return (
      <Shell role={role}>
        <section className="v2-client-module data-loading" aria-live="polite" aria-busy="true">
          Carregando avisos…
        </section>
      </Shell>
    );

  const head = (
    <div className="tw:mb-[1.538rem] tw:flex tw:items-center tw:justify-between tw:gap-[1.846rem] tw:max-[50rem]:flex-col tw:max-[50rem]:items-start tw:[&_small]:text-[0.769rem] tw:[&_small]:font-bold tw:[&_small]:tracking-[0.123rem] tw:[&_small]:text-[#ab8a6b] tw:[&_h1]:my-[0.385rem] tw:[&_h1]:text-[2rem]/[1.2] tw:[&_h1]:tracking-[-0.054rem] tw:[&_h1_span]:text-cali-gold tw:[&_p]:m-0 tw:[&_p]:text-[0.923rem] tw:[&_p]:text-[#8b8179]">
      <div>
        <small>
          {admin
            ? 'BACKOFFICE / COMUNICAÇÃO'
            : staff
              ? 'EQUIPE CALI / COMUNICAÇÃO'
              : 'ÁREA DA EMPRESA / COMUNICAÇÃO'}
        </small>
        <h1>
          Quadro de Avisos<span>.</span>
        </h1>
        <p>
          {admin
            ? 'Comunicados da CALI para as empresas clientes: feriados, atendimento e informações da parceria.'
            : staff
              ? 'Comunicados publicados para as empresas que você atende.'
              : 'Comunicados da parceria, datas importantes e informações de atendimento.'}
        </p>
      </div>
      {(admin || staff) && (
        <NoticeButton appearance="primary" onClick={() => (staff ? staff.onCompose() : openCompose())}>
          <Plus size={16} /> Novo comunicado
        </NoticeButton>
      )}
    </div>
  );

  const toolbar = (
    <div className="tw:mt-[1.769rem] tw:mb-[1.077rem] tw:flex tw:items-center tw:justify-between tw:gap-[0.769rem] tw:text-[0.846rem] tw:text-[#8e8076]">
      <div className="tw:flex tw:flex-wrap tw:gap-[0.385rem] tw:[&_button]:cursor-pointer tw:[&_button]:rounded-[0.538rem] tw:[&_button]:border tw:[&_button]:border-solid tw:[&_button]:border-[#eadfd7] tw:[&_button]:bg-white tw:[&_button]:px-4 tw:[&_button]:py-[0.692rem] tw:[&_button]:text-[0.846rem] tw:[&_button]:text-[#7a706a] tw:[&_button[aria-pressed=true]]:border-[#d6bcb5] tw:[&_button[aria-pressed=true]]:bg-[#f5efec] tw:[&_button[aria-pressed=true]]:font-bold tw:[&_button[aria-pressed=true]]:text-cali-brand">
        {admin && (
          <>
            <button type="button" aria-pressed={view === 'mural'} onClick={() => setView('mural')}>
              Mural
            </button>
            <button type="button" aria-pressed={view === 'manage'} onClick={() => setView('manage')}>
              Gerenciar publicações
            </button>
            <i className="tw:mx-[0.462rem] tw:inline-block tw:h-[1.692rem] tw:w-px tw:bg-[#e2d5cb] tw:align-middle" />
          </>
        )}
        <button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
          Todos
        </button>
        {CATEGORIES.map(([key, label]) => (
          <button type="button" key={key} aria-pressed={filter === key} onClick={() => setFilter(key)}>
            {label}
          </button>
        ))}
        {admin && view === 'manage' && (
          <button type="button" aria-pressed={showArchived} onClick={() => setShowArchived((current) => !current)}>
            {showArchived ? 'Vendo arquivados' : 'Ver arquivados'}
          </button>
        )}
      </div>
      <span>
        {visible.length} {visible.length === 1 ? 'publicação' : 'publicações'}
      </span>
    </div>
  );

  const feed = (
    <div className="tw:grid tw:grid-cols-3 tw:items-start tw:gap-4 tw:max-[68.75rem]:grid-cols-2 tw:max-[43.75rem]:grid-cols-1">
      {visible.map((item) => (
        <NoticeFeedCard
          key={item.id}
          notice={item}
          role={admin ? 'admin' : staff ? 'partner' : 'client'}
          commentCount={commentsOf(item.id).length}
          acknowledgementCount={acksOf(item.id).length}
          acknowledged={iAcked(item.id)}
          onOpen={() => {
            setActiveId(item.id);
            setCommentText('');
          }}
          onAcknowledge={() => void toggleAck(item)}
        />
      ))}
    </div>
  );

  const manage = (
    <div className="wf-records tw:[&>.wf-record-row]:cursor-pointer tw:[&>.wf-record-row]:grid-cols-[minmax(0,2.2fr)_minmax(0,.9fr)_minmax(0,1.1fr)_minmax(0,1.5fr)_minmax(0,.9fr)_5.846rem]! tw:max-[53.75rem]:[&>.wf-record-row]:grid-cols-[minmax(0,1fr)_5.846rem]! tw:max-[53.75rem]:[&>.header]:hidden! tw:max-[53.75rem]:[&>.wf-record-row>span:nth-child(n+2):not(:last-child)]:hidden">
      <div className="wf-record-row header">
        <span>Comunicado</span>
        <span>Categoria</span>
        <span>Data</span>
        <span>Quem recebe</span>
        <span>Ciências / Comentários</span>
        <span />
      </div>
      {visible.map((item) => (
        <div
          className="wf-record-row"
          key={item.id}
          role="button"
          tabIndex={0}
          onClick={() => setActiveId(item.id)}
          onKeyDown={(event) => {
            if (event.target === event.currentTarget && event.key === 'Enter') setActiveId(item.id);
          }}
        >
          <span>
            <small>
              {item.protocol} · publicado em {formatDay(item.publishedAt)}
            </small>
            <strong>{item.title}</strong>
          </span>
          <span>
            <NoticeBadge category={item.category} />
          </span>
          <span>{item.date ? `${formatDay(item.date)}${item.time ? ` · ${item.time}` : ''}` : '—'}</span>
          <span className="tw:line-clamp-2">{audienceLabel(item)}</span>
          <span>
            {acksOf(item.id).length} · {commentsOf(item.id).length}
          </span>
          <AdminRowActions>
            <AdminRowButton
              title="Editar"
              aria-label="Editar"
              onClick={(event) => {
                event.stopPropagation();
                openCompose(item);
              }}
            >
              <Pencil size={15} />
            </AdminRowButton>
            <AdminRowButton
              title={item.status === 'archived' ? 'Publicar de novo' : 'Arquivar'}
              aria-label={item.status === 'archived' ? 'Publicar de novo' : 'Arquivar'}
              onClick={(event) => {
                event.stopPropagation();
                void setStatus(item, item.status === 'archived' ? 'published' : 'archived');
              }}
            >
              {item.status === 'archived' ? <RotateCcw size={15} /> : <Archive size={15} />}
            </AdminRowButton>
          </AdminRowActions>
        </div>
      ))}
    </div>
  );

  const empty = (
    <div className="empty tw:flex tw:flex-col tw:items-center tw:gap-[0.615rem] tw:rounded-[0.769rem] tw:border tw:border-solid tw:border-[#e9e0d8] tw:bg-white tw:px-[1.923rem] tw:py-[3.538rem] tw:[&_strong]:text-base tw:[&_strong]:text-[#3e3533] tw:[&_p]:m-0 tw:[&_p]:text-[0.846rem]">
      <Megaphone size={22} />
      <strong>
        {admin
          ? view === 'manage' && showArchived
            ? 'Nenhum comunicado arquivado.'
            : 'Nenhum comunicado publicado.'
          : 'Nenhum comunicado publicado.'}
      </strong>
      <p>
        {admin
          ? 'Use “Novo comunicado” para avisar as empresas sobre feriados, atendimento e novidades.'
          : 'Quando a CALI publicar um aviso para a sua empresa, ele aparecerá aqui.'}
      </p>
    </div>
  );

  const page = (
    <div
      className={`tw:mx-auto tw:text-[#342d2b] ${admin || staff ? '' : 'tw:max-w-[110.769rem] tw:px-[2.692rem] tw:pt-[2.077rem] tw:pb-[4.615rem] tw:max-[50rem]:px-[1.154rem] tw:max-[50rem]:py-[1.692rem]'}`}
    >
      {head}
      {admin && <AdminNoticeReviews companies={companies} onPublish={load} />}
      {error && !draft && !active && <InlineNotice tone="danger">{error}</InlineNotice>}
      {toolbar}
      {visible.length ? (admin && view === 'manage' ? manage : feed) : empty}

      {active && (
        <NoticeDialog
          mode="detail"
          title="Comunicado"
          heading={`COMUNICADO · ${active.protocol}`}
          onClose={closeDetail}
        >
          <NoticeDialogBody mode="detail">
            {error && <InlineNotice tone="danger">{error}</InlineNotice>}
            <NoticeContent notice={active} audience={admin ? audienceLabel(active) : undefined} />
            {reactionBar(active)}
            {admin && (
              <>
                <h3 className="tw:mt-[0.308rem]! tw:mb-[-0.308rem]! tw:text-[0.923rem]">Ciências registradas</h3>
                {acksOf(active.id).length ? (
                  <div className="tw:flex tw:flex-wrap tw:gap-[0.462rem] tw:[&>span]:inline-flex tw:[&>span]:items-center tw:[&>span]:gap-[0.462rem] tw:[&>span]:rounded-[0.385rem] tw:[&>span]:bg-[#e6f6ec] tw:[&>span]:px-[0.692rem] tw:[&>span]:py-[0.385rem] tw:[&>span]:text-[0.769rem] tw:[&>span]:font-semibold tw:[&>span]:text-[#31805a] tw:[&_small]:font-normal tw:[&_small]:text-[#5d9b7c]">
                    {acksOf(active.id).map((ack) => (
                      <span key={ack.userId}>
                        <Check size={12} />
                        {names[ack.userId] || 'Cliente'}
                        {ack.companyId ? ` · ${companyName.get(ack.companyId) || ''}` : ''}
                        <small>{formatMoment(ack.at)}</small>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="tw:text-[0.923rem]/[1.55] tw:text-[#a1948c]">Ninguém registrou ciência ainda.</p>
                )}
              </>
            )}
            <h3 className="tw:mt-[0.308rem]! tw:mb-[-0.308rem]! tw:text-[0.923rem]">Comentários</h3>
            {!commentsOf(active.id).length && (
              <p className="tw:text-[0.923rem]/[1.55] tw:text-[#a1948c]">Nenhum comentário ainda.</p>
            )}
            {commentsOf(active.id).map((item) => (
              <div
                className="tw:rounded-[0.538rem] tw:bg-[#f7f3ee] tw:px-[0.923rem] tw:py-[0.769rem] tw:[&_strong]:text-[0.846rem] tw:[&_p]:my-[0.308rem] tw:[&_p]:text-[0.923rem] tw:[&_small]:text-[#9a8e84]"
                key={item.id}
              >
                <strong>{authorLabel(item)}</strong>
                <p>{item.body}</p>
                <small>{formatMoment(item.createdAt)}</small>
              </div>
            ))}
          </NoticeDialogBody>
          {!staff && (
            <NoticeDialogFooter mode="detail">
              {admin ? (
                <NoticeButton
                  compact
                  onClick={() => {
                    const item = active;
                    closeDetail();
                    openCompose(item);
                  }}
                >
                  <Pencil size={15} /> Editar
                </NoticeButton>
              ) : (
                <NoticeButton compact onClick={() => void toggleAck(active)}>
                  <Check size={15} />
                  {iAcked(active.id) ? 'Ciente registrado' : 'Estou ciente'}
                </NoticeButton>
              )}
              {admin && !commentCompanies(active.id).length ? (
                <span className="tw:flex-1 tw:text-[0.846rem] tw:text-[#a1948c]">
                  A resposta fica disponível quando uma empresa comentar.
                </span>
              ) : (
                <div className="tw:flex tw:min-w-0 tw:flex-1 tw:rounded-[0.538rem] tw:border tw:border-solid tw:border-[#e4d8cf] tw:max-[23rem]:min-w-full tw:[&_input]:min-w-0 tw:[&_input]:flex-1 tw:[&_input]:border-0 tw:[&_input]:bg-transparent tw:[&_input]:px-[0.769rem] tw:[&_input]:py-[0.615rem] tw:[&_input]:text-[0.923rem] tw:[&_select]:h-[2.923rem] tw:[&_select]:max-w-[min(40%,13.077rem)] tw:[&_select]:flex-none tw:[&_select]:rounded-[0.538rem] tw:[&_select]:border tw:[&_select]:border-solid tw:[&_select]:border-[#e5d8d0] tw:[&_select]:bg-white tw:[&_select]:px-[0.615rem] tw:[&_select]:text-[0.846rem] tw:[&_select]:text-[#322f2c] tw:[&_button]:cursor-pointer tw:[&_button]:rounded-r-[0.462rem] tw:[&_button]:border-0 tw:[&_button]:bg-cali-brand tw:[&_button]:px-[1.077rem] tw:[&_button]:text-white tw:[&_button:disabled]:opacity-35">
                  {admin && commentCompanies(active.id).length > 1 && (
                    <select
                      aria-label="Responder para"
                      value={replyCompany || commentCompanies(active.id)[0]}
                      onChange={(event) => setReplyCompany(event.target.value)}
                    >
                      {commentCompanies(active.id).map((id) => (
                        <option value={id} key={id}>
                          {companyName.get(id) || 'Empresa'}
                        </option>
                      ))}
                    </select>
                  )}
                  <input
                    placeholder={
                      admin
                        ? `Responder para ${companyName.get(replyCompany || commentCompanies(active.id)[0]) || 'a empresa'}…`
                        : 'Escrever comentário…'
                    }
                    value={commentText}
                    onChange={(event) => setCommentText(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') void sendComment(active);
                    }}
                  />
                  <button
                    type="button"
                    disabled={!commentText.trim()}
                    aria-label="Enviar comentário"
                    onClick={() => void sendComment(active)}
                  >
                    <Send size={17} />
                  </button>
                </div>
              )}
            </NoticeDialogFooter>
          )}
        </NoticeDialog>
      )}

      {draft && (
        <NoticeDialog
          mode="compose"
          title="Editar aviso"
          heading={draft.id ? 'EDITAR COMUNICADO' : 'NOVO COMUNICADO'}
          onClose={closeCompose}
          onSubmit={saveNotice}
        >
          <NoticeDialogBody mode="compose">
            <h2>{draft.id ? 'Atualizar publicação' : 'Publicar no quadro de avisos'}</h2>
            <p>O comunicado aparece no mural das empresas escolhidas e acende o sino de quem recebe.</p>
            {error && <InlineNotice>{error}</InlineNotice>}
            <NoticeComposeFields>
              <label>
                Categoria
                <select
                  value={draft.category}
                  onChange={(event) => setDraft({ ...draft, category: event.target.value as Category })}
                >
                  {CATEGORIES.map(([key, label]) => (
                    <option value={key} key={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Título
                <input
                  value={draft.title}
                  onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                  placeholder="Ex.: Feriado municipal"
                />
              </label>
              <div className="tw:grid tw:grid-cols-2 tw:gap-[0.923rem]">
                <label>
                  Data
                  <input
                    type="date"
                    value={draft.date}
                    onChange={(event) => setDraft({ ...draft, date: event.target.value })}
                  />
                </label>
                <label>
                  Horário (opcional)
                  <input
                    value={draft.time}
                    onChange={(event) => setDraft({ ...draft, time: event.target.value })}
                    placeholder="09:00 às 13:00"
                  />
                </label>
              </div>
              <label>
                Abrangência
                <select
                  value={draft.coverage}
                  onChange={(event) => setDraft({ ...draft, coverage: event.target.value })}
                >
                  {COVERAGES.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label>
                Quem recebe
                <select
                  value={draft.audience}
                  onChange={(event) => setDraft({ ...draft, audience: event.target.value as Draft['audience'] })}
                >
                  <option value="all">Todas as empresas</option>
                  <option value="selected">Só as empresas que eu escolher</option>
                </select>
              </label>
              {draft.audience === 'selected' && (
                <div className="tw:grid tw:min-h-[3.538rem] tw:max-h-[13.077rem] tw:shrink-0 tw:grid-cols-2 tw:gap-x-[1.077rem] tw:gap-y-[0.462rem] tw:overflow-y-auto tw:rounded-[0.692rem] tw:border tw:border-solid tw:border-[#efe7df] tw:bg-[#fffdfb] tw:px-4 tw:py-[0.846rem] tw:[scrollbar-width:none] tw:max-[53.75rem]:grid-cols-1">
                  {companies.map((company) => (
                    <label key={company.id}>
                      <input
                        type="checkbox"
                        checked={draft.targets.includes(company.id)}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            targets: event.target.checked
                              ? [...draft.targets, company.id]
                              : draft.targets.filter((id) => id !== company.id),
                          })
                        }
                      />{' '}
                      {company.name}
                    </label>
                  ))}
                </div>
              )}
              <label>
                Imagem de capa (opcional)
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => setCoverFile(event.target.files?.[0] ?? null)}
                />
              </label>
              {coverPreview && (
                <img
                  className="tw:max-h-[12.308rem] tw:w-full tw:rounded-[0.538rem] tw:object-cover"
                  src={coverPreview}
                  alt="Prévia da capa"
                />
              )}
              <label>
                Mensagem
                <textarea
                  value={draft.body}
                  onChange={(event) => setDraft({ ...draft, body: event.target.value })}
                  placeholder="O que o cliente precisa saber?"
                />
              </label>
            </NoticeComposeFields>
          </NoticeDialogBody>
          <NoticeDialogFooter mode="compose">
            <NoticeButton onClick={closeCompose}>Cancelar</NoticeButton>
            <NoticeButton
              appearance="primary"
              type="submit"
              disabled={saving || !draft.title.trim() || !draft.body.trim()}
            >
              {saving ? 'Publicando…' : draft.id ? 'Salvar alterações' : 'Publicar comunicado'}{' '}
              <ArrowRight size={15} />
            </NoticeButton>
          </NoticeDialogFooter>
        </NoticeDialog>
      )}
    </div>
  );

  if (staff) return page;
  return (
    <Shell role={role}>
      {admin ? (
        <div className="ap-app v2-admin-page">
          <div className="ap-content">{page}</div>
        </div>
      ) : (
        page
      )}
    </Shell>
  );
}

export function ClientNoticesPage() {
  return <NoticesBoard role="client" />;
}
export function AdminNoticesPage() {
  return <NoticesBoard role="admin" />;
}
export function StaffNoticesPage({ onCompose }: { onCompose: () => void }) {
  return <NoticesBoard role="client" staff={{ onCompose }} />;
}

/* Aviso aberto a partir da Agenda (cliente ou administradora): capa, texto e o atalho para o comunicado no mural. */
export function NoticeCalendarCard({
  noticeId,
  href,
  onClose,
}: {
  noticeId: string;
  href: string;
  onClose: () => void;
}) {
  const [notice, setNotice] = useState<{
    protocol: string;
    category: Category;
    title: string;
    body: string;
    date: string | null;
    time: string | null;
    coverage: string | null;
    coverUrl: string;
  } | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    setFailed(false);
    void (async () => {
      const row = await readCalendarNotice(noticeId);
      if (!active) return;
      if (!row) {
        setFailed(true);
        return;
      }
      const coverUrl = row.cover_path ? (await resolveWorkspaceMedia(row.cover_path, 86400)) || '' : '';
      if (active)
        setNotice({
          protocol: row.protocol,
          category: row.category,
          title: row.title,
          body: row.body || '',
          date: row.notice_date,
          time: row.time_label,
          coverage: row.coverage,
          coverUrl,
        });
    })();
    return () => {
      active = false;
    };
  }, [noticeId]);
  return (
    <NoticeDialog
      mode="calendar"
      title="Aviso da CALI"
      heading={`AVISO DA CALI${notice ? ` · ${notice.protocol}` : ''}`}
      onClose={onClose}
    >
      <NoticeDialogBody mode="calendar">
        {notice ? (
          <NoticeContent notice={notice} calendar />
        ) : failed ? (
          <p className="tw:text-[0.923rem]/[1.55] tw:text-[#a1948c]">
            Não foi possível carregar este aviso agora. Abra o Quadro de Avisos para ver o comunicado.
          </p>
        ) : (
          <LoadingState>Carregando aviso…</LoadingState>
        )}
      </NoticeDialogBody>
      <NoticeDialogFooter mode="calendar">
        <NoticeButton compact onClick={onClose}>
          Fechar
        </NoticeButton>
        <NoticeBoardLink href={href}>
          Abrir no Quadro de Avisos <ArrowRight size={15} />
        </NoticeBoardLink>
      </NoticeDialogFooter>
    </NoticeDialog>
  );
}
