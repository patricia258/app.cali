import { ProjectMessage } from './ProjectMessage';
import { ProjectComplexityBadge } from '../../../components/projects/ProjectComplexityBadge';
import { projectStatusColor } from './projectStatusColor';
import { MentionTextarea } from '../../../components/workspace/MentionTextarea';
/* Painel de uma subtarefa (upgrade do entregável, fase 2): notas internas, conversa da equipe e anexos próprios.
   Serve à administradora e à Equipe CALI (Partner). O cliente ainda não lê nada daqui — isso entra na fase 4. */
import { Button } from '../../../components/ds/Button';
import { DialogFrame } from '../../../components/ds/DialogFrame';
import { withMentions } from '../../../lib/mentionText';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, Paperclip, Send, X } from 'lucide-react';
import type { ProfileMedia } from '../../../api/workspace/identity';
import { ConversationAttachmentButton } from '../../../components/projects/conversation/components/ConversationAttachmentButton';
import { isSupabaseConfigured } from '../../../api/access/session';
import {
  postTaskMessage,
  readProjectActor,
  readTaskConversationPeople,
  readTaskMessages,
  uploadDeliverableAttachment,
} from '../../../api/projects/conversation';
import {
  archiveProjectFile,
  insertProjectFile,
  proposeFinalProjectFile,
  readFinalProjectFiles,
  releaseFinalProjectFile,
} from '../../../api/projects/files';
import { openPrivateWorkspaceFile } from '../../../api/files/workspace';
import { NoteLog } from './NoteLog';
import { ProjectWorkTimer } from './ProjectWorkTimer';
import type { AdminProjectTimer } from '../hooks/useAdminProjectTimer';

type Message = {
  id: string;
  author_user_id: string | null;
  author_role: string;
  body: string;
  created_at: string;
  client_visible?: boolean;
};
type FileToken = { name: string; path: string; size: number; mime?: string };
type FinalFile = { id: string; storage_path: string | null; status: string };
const TOKEN = /\[\[arquivo\|([^|]+)\|([^|]+)\|([^|]+)\|(\d+)\]\]/g;
const ALLOWED = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];
const when = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    .format(new Date(iso))
    .replace('.', '');
function parse(body: string) {
  const files: FileToken[] = [];
  const clean = body
    .replace(TOKEN, (_all, name, path, type, size) => {
      try {
        files.push({
          name: decodeURIComponent(name),
          path: decodeURIComponent(path),
          size: Number(size || 0),
          mime: decodeURIComponent(type),
        });
      } catch {
        files.push({ name, path, size: Number(size || 0), mime: type });
      }
      return '';
    })
    .trim();
  return { clean, files };
}

export const SUBTASK_STATUS: Record<string, { label: string; tone: string }> = {
  todo: { label: 'Não iniciado', tone: 'purple' },
  doing: { label: 'Em andamento', tone: 'blue' },
  standby: { label: 'Stand by', tone: 'gray' },
  internal_review: { label: 'Revisão interna', tone: 'blue' },
  client_review: { label: 'Com o cliente', tone: 'amber' },
  approved: { label: 'Aprovado', tone: 'green' },
  done: { label: 'Concluída', tone: 'green' },
  cancelled: { label: 'Cancelada', tone: 'red' },
};
export const subtaskStatusOptions = (staff: boolean, current: string) =>
  staff
    ? ['client_review', 'approved', 'done', 'cancelled'].includes(current)
      ? [current]
      : ['todo', 'doing', 'standby', 'internal_review']
    : ['todo', 'doing', 'standby', 'internal_review', 'client_review', 'approved', 'done'];
export const subtaskStatusLabel = (status: string, staff: boolean) =>
  staff && status === 'internal_review' ? 'Revisão da Patricia' : SUBTASK_STATUS[status]?.label || status;

type SubtaskInfo = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  dueAt?: string | null;
  protocol?: string | null;
  clientVisible?: boolean;
  complexity?: string | null;
  isDocument?: boolean;
};
/** Modal próprio da subtarefa, no mesmo formato do entregável: situação e cronômetro em cima; abas Visão geral, Conversas e Arquivos. */
export function SubtaskModal({
  task,
  deliverableId,
  deliverableTitle,
  companyId,
  projectId,
  staff,
  timer,
  adminTimer,
  formatDate,
  onStatus,
  onClose,
  onNotice,
}: {
  task: SubtaskInfo;
  deliverableId: string;
  deliverableTitle: string;
  companyId: string;
  projectId?: string | null;
  staff: boolean;
  timer: ReactNode;
  adminTimer: AdminProjectTimer;
  formatDate: (value?: string | null) => string;
  onStatus: (next: string) => void;
  onClose: () => void;
  onNotice: (message: string) => void;
}) {
  const [tab, setTab] = useState<'overview' | 'chat' | 'files'>('overview');
  const [messages, setMessages] = useState<Message[]>([]);
  const [identities, setIdentities] = useState<Record<string, ProfileMedia>>({});
  const [me, setMe] = useState('');
  const [channel, setChannel] = useState<'internal' | 'client'>('internal');
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const fileInput = useRef<HTMLInputElement | null>(null);

  const [finals, setFinals] = useState<FinalFile[]>([]);
  const [finalBusy, setFinalBusy] = useState('');
  async function loadFinals() {
    if (!isSupabaseConfigured) return;
    const result = await readFinalProjectFiles({ taskId: task.id });
    if (!result.error) setFinals((result.data || []) as FinalFile[]);
  }
  useEffect(() => {
    void loadFinals();
  }, [task.id]);
  /* Entrega final: o Partner propõe; só a administradora libera, suspende ou recusa. */
  async function finalAction(file: FileToken, action: 'propose' | 'release' | 'suspend' | 'refuse') {
    if (!isSupabaseConfigured || finalBusy) return;
    setFinalBusy(file.path);
    const existing = finals.find((item) => item.storage_path === file.path);
    let failure: { message: string } | null = null;
    if (action === 'propose') failure = (await proposeFinalProjectFile(deliverableId, task.id, file)).error;
    else if (action === 'release')
      failure = existing
        ? (await releaseFinalProjectFile(existing.id)).error
        : (
            await insertProjectFile({
              company_id: companyId,
              project_id: projectId || null,
              deliverable_id: deliverableId,
              task_id: task.id,
              title: task.title,
              category: 'deliverable',
              storage_path: file.path,
              original_filename: file.name,
              file_type: file.mime || 'application/octet-stream',
              file_size_bytes: file.size,
              client_visible: true,
              status: 'published',
              published_at: new Date().toISOString(),
              workflow_origin: 'deliverable',
              uploaded_by: me || null,
            })
          ).error;
    else if (existing) failure = (await archiveProjectFile(existing.id)).error;
    setFinalBusy('');
    if (failure) {
      onNotice(failure.message || 'Não foi possível concluir esta ação.');
      return;
    }
    onNotice(
      action === 'propose'
        ? 'Enviado para a Patricia liberar ao cliente.'
        : action === 'release'
          ? 'Liberado para o cliente em Documentos.'
          : action === 'suspend'
            ? 'Suspenso: o cliente deixou de ver este documento.'
            : 'Proposta recusada.',
    );
    await loadFinals();
  }
  async function loadMessages() {
    if (!isSupabaseConfigured) return;
    const result = await readTaskMessages(task.id);
    if (!result.error) setMessages((result.data || []) as Message[]);
  }
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let alive = true;
    void (async () => {
      const { data: auth } = await readProjectActor();
      if (!alive) return;
      setMe(auth.user?.id || '');
      const people = await readTaskConversationPeople(staff);
      if (!alive) return;
      setIdentities(Object.fromEntries(people.flatMap((person) => (person.id ? [[person.id, person]] : []))));
      await loadMessages();
    })();
    const timer = window.setInterval(() => void loadMessages(), 20000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [task.id, staff]);

  async function send() {
    if (!isSupabaseConfigured || sending || (!text.trim() && !file)) return;
    setSending(true);
    try {
      let token = '';
      if (file) {
        if (!ALLOWED.includes(file.type)) {
          onNotice('Use PDF, imagem, Word, Excel ou PowerPoint.');
          return;
        }
        if (file.size > 10 * 1024 * 1024) {
          onNotice('O anexo pode ter até 10 MB.');
          return;
        }
        const safe =
          file.name
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .replace(/[^a-zA-Z0-9._-]+/g, '-')
            .replace(/-+/g, '-')
            .slice(0, 90) || 'arquivo';
        const path = `deliverable-chat/${companyId}/${deliverableId}/${me}/${Date.now()}-${safe}`;
        const upload = await uploadDeliverableAttachment(path, file, file.type);
        if (upload.error) {
          onNotice('Não foi possível anexar o arquivo. A mensagem não foi enviada.');
          return;
        }
        token = `[[arquivo|${encodeURIComponent(file.name)}|${encodeURIComponent(path)}|${encodeURIComponent(file.type)}|${file.size}]]`;
      }
      const body = [text.trim(), token].filter(Boolean).join('\n');
      const result = await postTaskMessage({
        taskId: task.id,
        deliverableId,
        companyId,
        actorId: me || null,
        body,
        visible: channel === 'client',
        partner: staff,
      });
      if (result.error) {
        onNotice(result.error.message || 'Não foi possível enviar a mensagem.');
        return;
      }
      setText('');
      setFile(null);
      await loadMessages();
    } finally {
      setSending(false);
    }
  }
  async function openFile(path: string) {
    try {
      await openPrivateWorkspaceFile(path);
    } catch {
      onNotice('Não foi possível abrir este anexo agora.');
    }
  }
  const author = (message: Message) =>
    (message.author_user_id && identities[message.author_user_id]?.full_name) ||
    (message.author_role === 'admin'
      ? 'Patrícia Lima'
      : message.author_role === 'client'
        ? 'Cliente'
        : 'Equipe CALI');
  const files = messages.flatMap((message) => parse(message.body).files);
  const shown = messages.filter((message) => Boolean(message.client_visible) === (channel === 'client'));

  const options = subtaskStatusOptions(staff, task.status);
  return (
    <div
      className="tw:fixed tw:inset-0 tw:z-1300 tw:grid tw:place-items-center tw:bg-[#2b181e75] tw:p-[1.538rem]"
      onMouseDown={onClose}
    >
      <DialogFrame
        className="tw:flex tw:max-h-[min(88vh,58.462rem)] tw:w-full tw:max-w-[69.231rem] tw:flex-col tw:overflow-hidden tw:rounded-[1.077rem] tw:bg-white tw:font-cali-body tw:text-cali-ink tw:shadow-[0_2.154rem_5.385rem_#2b181e4d] tw:focus:outline-none"
        aria-label={`Subtarefa ${task.title}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="tw:flex tw:flex-none tw:items-start tw:justify-between tw:gap-[1.385rem] tw:bg-[linear-gradient(120deg,#fdf6ee,#f8ece6)] tw:px-[2.154rem] tw:pt-[1.846rem] tw:pb-[1.692rem] tw:max-[45rem]:flex-col tw:max-[34rem]:px-[1.231rem] tw:[&_h2]:mt-0 tw:[&_h2]:mb-[0.462rem] tw:[&_h2]:text-[1.615rem] tw:[&_h2]:font-extrabold">
          <div>
            <button
              type="button"
              className="tw:mb-[1.077rem] tw:inline-flex tw:h-[2.615rem] tw:cursor-pointer tw:items-center tw:gap-[0.462rem] tw:rounded-[0.692rem] tw:border tw:border-solid tw:border-[#dfd3ca] tw:bg-white tw:px-[1rem] tw:text-[0.923rem] tw:font-bold tw:text-cali-brand tw:hover:bg-[#fbf7f4]"
              onClick={onClose}
            >
              <ArrowLeft size={14} /> Voltar para o entregável
            </button>
            <h2>{task.title}</h2>
            <p className="tw:m-0 tw:flex tw:flex-wrap tw:items-center tw:gap-[1.077rem] tw:text-[0.962rem] tw:text-[#5f5650] tw:[&_small]:text-[0.808rem] tw:[&_small]:font-bold tw:[&_small]:tracking-[0.12em] tw:[&_small]:text-[#a8773f]">
              <span>
                Subtarefa de <strong>{deliverableTitle}</strong>
              </span>
              {task.protocol && <small>{task.protocol}</small>}
              {task.complexity && <ProjectComplexityBadge code={task.complexity} />}
            </p>
          </div>
          <div className="tw:flex tw:min-w-0 tw:flex-none tw:flex-wrap tw:items-center tw:gap-[0.769rem]">
            <label
              className={`tw:order-1 tw:inline-flex tw:h-[3.077rem] tw:items-center tw:gap-[.615rem] tw:rounded-[.692rem] tw:pr-[.308rem] tw:pl-[.923rem] tw:text-white ${projectStatusColor[SUBTASK_STATUS[task.status]?.tone || 'purple'] ?? projectStatusColor.purple}`}
              title="Situação da subtarefa — clique para alterar"
            >
              <i aria-hidden="true" className="tw:size-[.538rem] tw:rounded-full tw:bg-white" />
              <select
                className="tw:h-full tw:min-w-0 tw:cursor-pointer tw:border-0! tw:bg-transparent! tw:pr-[.462rem] tw:text-[.962rem] tw:font-extrabold tw:text-white! tw:disabled:cursor-default tw:disabled:opacity-100 tw:[&_option]:bg-white tw:[&_option]:text-cali-ink"
                aria-label="Situação da subtarefa"
                value={task.status}
                disabled={options.length === 1}
                onChange={(event) => onStatus(event.target.value)}
              >
                {options.map((value) => (
                  <option key={value} value={value}>
                    {subtaskStatusLabel(value, staff)}
                  </option>
                ))}
              </select>
            </label>
            {staff ? (
              timer
            ) : (
              <ProjectWorkTimer
                state={adminTimer}
                deliverableId={deliverableId}
                task={{ ...task, clientVisible: Boolean(task.clientVisible) }}
              />
            )}
            <Button
              type="button"
              variant="unstyled"
              className="tw:order-3 tw:grid tw:size-[3.077rem] tw:cursor-pointer tw:place-items-center tw:rounded-[0.692rem] tw:border tw:border-solid tw:border-[#eadfd5] tw:bg-white tw:text-cali-ink"
              aria-label="Fechar"
              onClick={onClose}
            >
              <X size={18} />
            </Button>
          </div>
        </header>
        <nav className="tw:flex tw:flex-none tw:gap-[1.692rem] tw:overflow-x-auto tw:border-0 tw:border-b tw:border-solid tw:border-[#eee4dc] tw:px-[2.154rem] tw:max-[34rem]:px-[1.231rem] tw:[&_button]:cursor-pointer tw:[&_button]:border-0 tw:[&_button]:border-b-2 tw:[&_button]:border-solid tw:[&_button]:border-transparent tw:[&_button]:bg-transparent tw:[&_button]:px-0 tw:[&_button]:pt-[1.077rem] tw:[&_button]:pb-[0.923rem] tw:[&_button]:text-[0.962rem] tw:[&_button]:whitespace-nowrap tw:[&_button]:text-[#7d726b] tw:[&_button[aria-pressed=true]]:border-cali-brand tw:[&_button[aria-pressed=true]]:font-bold tw:[&_button[aria-pressed=true]]:text-cali-brand">
          {(
            [
              ['overview', 'Visão geral'],
              ['chat', `Conversas (${messages.length})`],
              ['files', `Arquivos (${files.length})`],
            ] as const
          ).map(([key, label]) => (
            <button key={key} type="button" aria-pressed={tab === key} onClick={() => setTab(key)}>
              {label}
            </button>
          ))}
        </nav>
        <div className="tw:min-h-0 tw:overflow-y-auto tw:px-[2.154rem] tw:pt-[1.692rem] tw:pb-8 tw:[scrollbar-width:none] tw:max-[34rem]:px-[1.231rem]">
          {tab === 'overview' && (
            <>
              <div className="tw:grid tw:grid-cols-4 tw:overflow-hidden tw:rounded-[0.769rem] tw:border tw:border-solid tw:border-[#eadfd5] tw:max-[45rem]:grid-cols-2 tw:[&_span]:flex tw:[&_span]:flex-col tw:[&_span]:gap-[0.462rem] tw:[&_span]:border-0 tw:[&_span]:border-l tw:[&_span]:border-solid tw:[&_span]:border-[#eadfd5] tw:[&_span]:px-[1.231rem] tw:[&_span]:py-[1.077rem] tw:[&_span]:text-[0.846rem] tw:[&_span]:text-[#8a7c74] tw:[&_span:first-child]:border-0 tw:[&_b]:text-[1.038rem] tw:[&_b]:text-cali-brand">
                <span>
                  Prazo<b>{task.dueAt ? formatDate(task.dueAt) : 'Sem prazo'}</b>
                </span>
                <span>
                  Complexidade<b>{task.complexity || '—'}</b>
                </span>
                <span>
                  Cliente<b>{task.clientVisible ? 'Vê esta subtarefa' : 'Não vê (interna)'}</b>
                </span>
                <span>
                  Tipo<b>{task.isDocument ? 'Entrega documental' : 'Atividade'}</b>
                </span>
              </div>
              <div className="tw:mt-[1.538rem] tw:[&_h3]:mt-0 tw:[&_h3]:mb-[0.462rem] tw:[&_h3]:text-[1.077rem] tw:[&_p]:m-0 tw:[&_p]:text-[1rem]/[1.55] tw:[&_p]:whitespace-pre-wrap tw:[&_p]:text-[#5f5650]">
                <h3>Sobre esta subtarefa</h3>
                <p>{task.description || 'Sem descrição.'}</p>
              </div>
              <NoteLog
                deliverableId={deliverableId}
                taskId={task.id}
                companyId={companyId}
                staff={staff}
                title="Notas internas"
                hint="Anotações, fontes e referências desta subtarefa. O cliente não vê."
                onNotice={onNotice}
              />
            </>
          )}
          {tab === 'chat' && (
            <section className="tw:flex tw:flex-col tw:gap-[0.923rem]">
              <div className="tw:flex tw:min-h-[2.462rem] tw:items-center tw:justify-between tw:gap-[0.769rem]">
                <span
                  className="tw:inline-flex tw:rounded-[0.692rem] tw:border tw:border-solid tw:border-[#e6d9ce] tw:bg-white tw:p-[0.231rem] tw:[&_button]:h-[2.308rem] tw:[&_button]:cursor-pointer tw:[&_button]:rounded-[0.538rem] tw:[&_button]:border-0 tw:[&_button]:bg-transparent tw:[&_button]:px-[1rem] tw:[&_button]:text-[0.885rem] tw:[&_button]:font-bold tw:[&_button]:text-cali-brand tw:[&_button[aria-selected=true]]:bg-cali-brand tw:[&_button[aria-selected=true]]:text-white tw:[&_button:disabled]:cursor-default tw:[&_button:disabled]:opacity-40"
                  role="tablist"
                  aria-label="Com quem é a conversa"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={channel === 'internal'}
                    onClick={() => setChannel('internal')}
                  >
                    Equipe (interna)
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={channel === 'client'}
                    disabled={!task.clientVisible}
                    title={task.clientVisible ? undefined : 'Esta subtarefa não está visível para o cliente'}
                    onClick={() => setChannel('client')}
                  >
                    Cliente
                  </button>
                </span>
                <small>{channel === 'client' ? 'O cliente vê estas mensagens' : 'Só a CALI vê'}</small>
              </div>
              <div
                className="tw:flex tw:max-h-[24.615rem] tw:flex-col tw:gap-[0.615rem] tw:overflow-y-auto tw:px-[0.154rem] tw:py-[0.308rem] tw:[scrollbar-width:none]"
                aria-live="polite"
              >
                {shown.length ? (
                  shown.map((message) => {
                    const parsed = parse(message.body);
                    const mine = message.author_user_id === me;
                    const name = author(message);
                    return (
                      <ProjectMessage
                        key={message.id}
                        identity={message.author_user_id ? identities[message.author_user_id] : undefined}
                        name={name}
                        date={when(message.created_at)}
                        mine={mine}
                        task
                      >
                          {parsed.clean && <p>{withMentions(parsed.clean)}</p>}
                          {parsed.files.length > 0 && (
                            <div className="tw:mt-[.62rem] tw:flex tw:flex-col tw:items-start tw:gap-[.46rem]">
                              {parsed.files.map((item) => (
                                <ConversationAttachmentButton
                                  key={item.path}
                                  className="tw:mt-[.62rem]"
                                  name={item.name}
                                  size={item.size}
                                  onOpen={() => void openFile(item.path)}
                                />
                              ))}
                            </div>
                          )}
                      </ProjectMessage>
                    );
                  })
                ) : (
                  <p className="tw:m-0 tw:text-[0.923rem] tw:text-[#8a7c74]">
                    Ainda não há mensagens nesta subtarefa.
                  </p>
                )}
              </div>
              <div className="tw:flex tw:flex-col tw:gap-[0.615rem]">
                <MentionTextarea
                  rows={2}
                  value={text}
                  onValueChange={setText}
                  placeholder={channel === 'client' ? 'Escreva para o cliente…' : 'Escreva para a equipe…'}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      void send();
                    }
                  }}
                />
                <div className="tw:flex tw:items-center tw:justify-end tw:gap-[0.615rem]">
                  <input
                    ref={fileInput}
                    type="file"
                    hidden
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.xlsx,.pptx"
                    onChange={(event) => {
                      setFile(event.target.files?.[0] || null);
                      event.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    className="tw:inline-flex tw:h-[3.077rem] tw:max-w-[min(18.462rem,60%)] tw:cursor-pointer tw:items-center tw:gap-[0.538rem] tw:rounded-[0.692rem] tw:border tw:border-solid tw:border-[#dfd3ca] tw:bg-white tw:px-[1.077rem] tw:text-[0.923rem] tw:font-bold tw:text-cali-brand tw:[&_span]:truncate"
                    title="PDF, imagem, Word, Excel ou PowerPoint, até 10 MB"
                    onClick={() => fileInput.current?.click()}
                  >
                    <Paperclip size={14} />
                    <span>{file ? file.name : 'Anexar'}</span>
                  </button>
                  <Button
                    type="button"
                    variant="unstyled"
                    className="tw:inline-flex tw:h-[3.077rem] tw:cursor-pointer tw:items-center tw:gap-[0.462rem] tw:rounded-[0.692rem] tw:border-0 tw:bg-cali-brand tw:px-[1.231rem] tw:text-[0.923rem] tw:font-bold tw:text-white tw:disabled:cursor-default tw:disabled:opacity-45"
                    disabled={sending || (!text.trim() && !file)}
                    onClick={() => void send()}
                  >
                    <Send size={14} />
                    {sending ? 'Enviando…' : 'Enviar'}
                  </Button>
                </div>
              </div>
            </section>
          )}
          {tab === 'files' && (
            <section className="tw:[&_h3]:mt-0 tw:[&_h3]:mb-[0.462rem] tw:[&_h3]:text-[1.077rem]">
              <h3>Arquivos desta subtarefa</h3>
              <p className="tw:mt-0 tw:mb-[0.923rem] tw:text-[0.923rem] tw:text-[#7d726b]">
                {staff
                  ? 'Escolha o arquivo que é a entrega final. A Patricia libera para o cliente.'
                  : 'Escolha o arquivo que é a entrega final. Ao liberar, ele aparece para o cliente na pasta do entregável, em Documentos.'}
              </p>
              {files.length ? (
                <ul className="tw:m-0 tw:flex tw:list-none tw:flex-col tw:gap-[0.615rem] tw:p-0">
                  {files.map((item) => {
                    const final = finals.find((row) => row.storage_path === item.path);
                    const state = final?.status || 'none';
                    const busy = finalBusy === item.path;
                    return (
                      <li
                        key={item.path}
                        className="tw:grid tw:grid-cols-[minmax(0,1fr)_auto_auto] tw:items-center tw:gap-[1.077rem] tw:rounded-[0.769rem] tw:border tw:border-solid tw:border-[#eadfd5] tw:bg-white tw:px-[0.923rem] tw:py-[0.769rem] tw:max-[45rem]:grid-cols-1"
                      >
                        <ConversationAttachmentButton
                          className="tw:m-0 tw:justify-self-start"
                          name={item.name}
                          size={item.size}
                          onOpen={() => void openFile(item.path)}
                        />
                        <span
                          className={`tw:text-[0.846rem] tw:font-bold tw:whitespace-nowrap ${state === 'published' ? 'tw:text-[#356448]' : state === 'draft' ? 'tw:text-[#8a5a12]' : state === 'archived' ? 'tw:text-[#a03535]' : 'tw:text-[#8a7c74]'}`}
                        >
                          {state === 'published'
                            ? 'Liberado ao cliente'
                            : state === 'draft'
                              ? 'Aguardando liberação da Patricia'
                              : state === 'archived'
                                ? 'Suspenso'
                                : 'Arquivo de trabalho'}
                        </span>
                        <span className="tw:flex tw:flex-wrap tw:gap-[0.615rem] tw:[&_button]:h-[2.462rem]! tw:[&_button]:cursor-pointer tw:[&_button]:rounded-[0.615rem]! tw:[&_button]:border! tw:[&_button]:border-solid tw:[&_button]:border-[#dfd3ca] tw:[&_button]:bg-white tw:[&_button]:px-[0.923rem]! tw:[&_button]:py-0! tw:[&_button]:text-[0.885rem]! tw:[&_button]:font-bold! tw:[&_button]:whitespace-nowrap tw:[&_button]:text-cali-brand tw:[&_button.primary]:border-cali-brand! tw:[&_button.primary]:bg-cali-brand! tw:[&_button.primary]:text-white! tw:[&_button:disabled]:cursor-default tw:[&_button:disabled]:opacity-50">
                          {staff ? (
                            (state === 'none' || state === 'archived') && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void finalAction(item, 'propose')}
                              >
                                Propor como entrega final
                              </button>
                            )
                          ) : (
                            <>
                              {state !== 'published' && (
                                <Button
                                  type="button"
                                  variant="primary"
                                  disabled={busy}
                                  onClick={() => void finalAction(item, 'release')}
                                >
                                  Liberar para o cliente
                                </Button>
                              )}
                              {state === 'draft' && (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void finalAction(item, 'refuse')}
                                >
                                  Recusar
                                </button>
                              )}
                              {state === 'published' && (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void finalAction(item, 'suspend')}
                                >
                                  Suspender
                                </button>
                              )}
                            </>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="tw:m-0 tw:text-[0.923rem] tw:text-[#8a7c74]">
                  Nenhum arquivo ainda. Anexe pela aba Conversas.
                </p>
              )}
            </section>
          )}
        </div>
      </DialogFrame>
    </div>
  );
}
