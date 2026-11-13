import { ProjectComplexityBadge } from '../../../../components/projects/ProjectComplexityBadge';
import type { ProfileMedia } from '../../../../api/workspace/identity';
import { conversationAttachmentToken } from '../../../../lib/conversationMessageBody';
import { MentionTextarea } from '../../../../components/workspace/MentionTextarea';
import { ConversationAttachmentButton } from '../../../../components/projects/conversation/components/ConversationAttachmentButton';
import { ClientSubtaskApproval } from './ClientSubtaskApproval';
import { Button } from '../../../../components/ds/Button';
import { DialogFrame } from '../../../../components/ds/DialogFrame';
import { StatusBadge } from '../../../../components/ds/StatusBadge';
import { openPrivateWorkspaceFile } from '../../../../api/files/workspace';
/* Subtarefa vista pelo cliente: situação, prazo, complexidade, documentos liberados, conversa com a CALI e aprovação da parte.
   O cliente só vê o que a CALI marcou como visível; não altera situação — apenas conversa, anexa e aprova quando está "Aguardando você". */
import { ClientSubtaskMessage } from './ClientSubtaskMessage';
import { SensitiveDataNote } from '../../../../components/privacy/SensitiveDataNote';
import { useEffect, useRef, useState } from 'react';
import { Paperclip, Send, X } from 'lucide-react';
import { isSupabaseConfigured } from '../../../../api/access/session';
import { readProjectActor, uploadDeliverableAttachment } from '../../../../api/projects/conversation';
import {
  approveClientTask, postClientTaskMessage, readClientTaskContext,
  readClientTaskParticipants, requestClientTaskAdjustment,
} from '../../../../api/projects/tasks';

type Message = { id: string; author_user_id: string | null; author_role: string; body: string; created_at: string };
const ALLOWED = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'];

export function ClientSubtaskModal({ task, deliverableId, deliverableTitle, statusLabel, formatDate, onClose, onChanged }: { task: { id: string; title: string; status: string; dueAt?: string | null; protocol?: string | null; complexity?: string | null }; deliverableId: string; deliverableTitle: string; statusLabel: string; formatDate: (value?: string | null) => string; onClose: () => void; onChanged: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]); const [docs, setDocs] = useState<{ id: string; title: string; storage_path: string | null; original_filename: string | null }[]>([]);
  const [me, setMe] = useState(''); const [companyId, setCompanyId] = useState(''); const [identities, setIdentities] = useState<Record<string, ProfileMedia>>({});
  const [text, setText] = useState(''); const [file, setFile] = useState<File | null>(null); const [busy, setBusy] = useState(false); const [notice, setNotice] = useState(''); const [approvalPhase, setApprovalPhase] = useState<'idle' | 'confirming' | 'adjusting'>('idle'); const [adjustUsed, setAdjustUsed] = useState(0); const [adjustText, setAdjustText] = useState('');
  const fileInput = useRef<HTMLInputElement | null>(null);
  const closed = ['approved', 'done', 'completed', 'cancelled'].includes(task.status);

  async function load() { if (!isSupabaseConfigured) return;
    const { thread, files, adjustments } = await readClientTaskContext(task.id);
    if (!thread.error) setMessages((thread.data ?? []) as Message[]);
    if (!files.error) setDocs(files.data ?? []);
    if (!adjustments.error) setAdjustUsed(Number(adjustments.data?.adjustment_count ?? 0));
  }
  useEffect(() => { if (!isSupabaseConfigured) return; let alive = true;
    void (async () => {
      const { data: auth } = await readProjectActor();
      if (!alive) return;
      const uid = auth.user?.id ?? '';
      setMe(uid);
      const participants = await readClientTaskParticipants(uid);
      if (!alive) return;
      setCompanyId(participants.companyId);
      setIdentities(participants.people);
      await load();
    })();
    const timer = window.setInterval(() => void load(), 20000);
    return () => { alive = false; window.clearInterval(timer); };
  }, [task.id]);
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(''), 4500); return () => window.clearTimeout(timer); }, [notice]);

  async function open(path: string) {
    try {
      await openPrivateWorkspaceFile(path);
    } catch {
      setNotice('Não foi possível abrir este arquivo agora.');
    }
  }
  async function send() { if (!isSupabaseConfigured || busy || (!text.trim() && !file)) return; setBusy(true); setNotice('');
    try { let token = '';
      if (file) {
        if (!ALLOWED.includes(file.type)) { setNotice('Use PDF, imagem, Word, Excel ou PowerPoint.'); return; }
        if (file.size > 10 * 1024 * 1024) { setNotice('O anexo pode ter até 10 MB.'); return; }
        if (!companyId || !me) { setNotice('Não foi possível anexar agora. Tente de novo.'); return; }
        const clean = file.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').slice(0, 90) || 'arquivo';
        const path = `deliverable-chat/${companyId}/${deliverableId}/${me}/${Date.now()}-${clean}`;
        const upload = await uploadDeliverableAttachment(path, file, file.type);
        if (upload.error) { setNotice('Não foi possível anexar o arquivo. A mensagem não foi enviada.'); return; }
        token = conversationAttachmentToken(path, file);
      }
      const result = await postClientTaskMessage(task.id, [text.trim(), token].filter(Boolean).join('\n'));
      if (result.error) { setNotice(result.error.message || 'Não foi possível enviar a mensagem.'); return; }
      setText(''); setFile(null); await load();
    } finally { setBusy(false); }
  }
  async function approve() { if (!isSupabaseConfigured || busy) return; setBusy(true); const result = await approveClientTask(task.id); setBusy(false); setApprovalPhase('idle');
    if (result.error) { setNotice(result.error.message || 'Não foi possível registrar a aprovação.'); return; } onChanged(); onClose(); }
  async function requestAdjustment() { if (!isSupabaseConfigured || busy || adjustText.trim().length < 10) return; setBusy(true); const result = await requestClientTaskAdjustment(task.id, adjustText.trim()); setBusy(false);
    if (result.error) { setNotice(result.error.message || 'Não foi possível registrar o pedido de ajuste.'); return; } onChanged(); onClose(); }
  const author = (message: Message) => message.author_user_id === me ? 'Você' : (message.author_user_id && identities[message.author_user_id]?.full_name) || (message.author_role === 'client' ? 'Sua equipe' : 'CALI');

  return (
    <div className="tw:fixed tw:inset-0 tw:z-1300 tw:grid tw:place-items-center tw:bg-[#2b181e75] tw:p-[1.54rem]" onMouseDown={onClose}>
      <DialogFrame className="tw:flex tw:max-h-[min(88vh,58.46rem)] tw:w-[min(69.23rem,100%)] tw:flex-col tw:overflow-hidden tw:rounded-[1.08rem] tw:bg-white tw:font-cali-body tw:text-cali-ink tw:shadow-[0_28px_70px_rgba(43,24,30,.3)]" aria-label={`Subtarefa ${task.title}`} onMouseDown={(event) => event.stopPropagation()}>
        <header className="tw:flex tw:items-start tw:justify-between tw:gap-[1.38rem] tw:bg-[linear-gradient(120deg,#fdf6ee,#f8ece6)] tw:px-[2.15rem] tw:pt-[1.85rem] tw:pb-[1.69rem] tw:max-[45rem]:flex-col">
          <div>
            <h2 className="tw:mt-0 tw:mb-[.46rem] tw:text-[1.62rem] tw:font-extrabold">{task.title}</h2>
            <p className="tw:m-0 tw:flex tw:flex-wrap tw:items-center tw:gap-[1.08rem] tw:text-[.96rem] tw:text-[#5f5650]">
              <span>Parte de <strong>{deliverableTitle}</strong></span>
              {task.protocol && <small className="tw:text-[.81rem] tw:font-bold tw:tracking-[.12em] tw:text-[#a8773f]">{task.protocol}</small>}
              {task.complexity && <ProjectComplexityBadge code={task.complexity} explain />}
            </p>
          </div>
          <div className="tw:flex tw:shrink-0 tw:items-center tw:gap-[.77rem]">
            <StatusBadge variant="delivery" tone={task.status === 'client_review' ? 'review' : task.status === 'todo' ? 'scheduled' : undefined} className="tw:inline-flex! tw:h-[2.62rem] tw:w-auto! tw:items-center tw:justify-center tw:rounded-[.69rem] tw:px-[1.08rem]! tw:text-[.92rem]! tw:font-bold tw:whitespace-nowrap">{statusLabel}</StatusBadge>
            <Button type="button" variant="inlineClose" className="tw:grid! tw:size-[3.08rem]! tw:place-items-center tw:rounded-[.69rem] tw:border tw:border-solid tw:border-[#eadfd5] tw:bg-white tw:text-cali-ink" onClick={onClose}><X size={18} /></Button>
          </div>
        </header>
        <div className="tw:overflow-y-auto tw:px-[2.15rem] tw:pt-[1.69rem] tw:pb-[2rem] tw:[scrollbar-width:none]">
          <dl className="tw:m-0 tw:grid tw:grid-cols-2 tw:overflow-hidden tw:rounded-[.77rem] tw:border tw:border-solid tw:border-[#eadfd5]">
            <div className="tw:flex tw:flex-col tw:gap-[.46rem] tw:px-[1.23rem] tw:py-[1.08rem] tw:leading-[1.2]">
              <dt className="tw:text-[.85rem] tw:text-[#8a7c74]">Prazo</dt>
              <dd className="tw:m-0 tw:text-[1.04rem] tw:font-bold tw:text-cali-brand">{task.dueAt ? formatDate(task.dueAt) : 'A definir'}</dd>
            </div>
            <div className="tw:flex tw:flex-col tw:gap-[.46rem] tw:border-0 tw:border-l tw:border-solid tw:border-[#eadfd5] tw:px-[1.23rem] tw:py-[1.08rem] tw:leading-[1.2]">
              <dt className="tw:text-[.85rem] tw:text-[#8a7c74]">Documentos entregues</dt>
              <dd className="tw:m-0 tw:text-[1.04rem] tw:font-bold tw:text-cali-brand">{docs.length || 'Em produção'}</dd>
            </div>
          </dl>
          {docs.length > 0 && (
            <div className="tw:mt-[1.08rem] tw:flex tw:flex-wrap tw:gap-[.62rem]">
              {docs.map(({ id, storage_path: path, original_filename: filename, title }) => path && (
                <ConversationAttachmentButton key={id} name={filename || title} detail="Documento entregue" fill onOpen={() => void open(path)} />
              ))}
            </div>
          )}
          {task.status === 'client_review' && (
            <ClientSubtaskApproval
              phase={approvalPhase}
              adjustments={adjustUsed}
              adjustmentText={adjustText}
              busy={busy}
              onAdjustmentTextChange={setAdjustText}
              onPhaseChange={setApprovalPhase}
              onApprove={() => void approve()}
              onRequestAdjustment={() => void requestAdjustment()}
            />
          )}
          <section className="tw:mt-[1.54rem] tw:flex tw:flex-col tw:gap-[.92rem]">
            <div className="tw:flex tw:min-h-[2.46rem] tw:items-center tw:justify-between tw:gap-[.77rem]">
              <h4>Conversa com a CALI</h4>
              <small>{messages.length} {messages.length === 1 ? 'mensagem' : 'mensagens'}</small>
            </div>
            <div role="log" aria-label="Mensagens da subtarefa" className="tw:flex tw:max-h-[24.62rem] tw:flex-col tw:gap-[.77rem] tw:overflow-y-auto tw:px-[.15rem] tw:py-[.46rem] tw:[scrollbar-width:none]">
              {messages.length ? messages.map((message) => (
                <ClientSubtaskMessage
                  key={message.id}
                  body={message.body}
                  createdAt={message.created_at}
                  name={author(message)}
                  mine={message.author_user_id === me}
                  identity={message.author_user_id ? identities[message.author_user_id] : undefined}
                  onOpen={(path) => void open(path)}
                />
              )) : <p className="tw:m-0 tw:text-[.92rem] tw:text-[#8a7c74]">Ainda não há mensagens nesta parte.</p>}
            </div>
            {closed ? (
              <p className="tw:m-0 tw:text-[.92rem] tw:text-[#8a7c74]">Esta parte foi concluída. A conversa fica disponível para consulta.</p>
            ) : (
              <div className="tw:flex tw:flex-col tw:gap-[.62rem]">
                <MentionTextarea aria-label="Mensagem para a CALI" rows={2} value={text} onValueChange={setText} placeholder="Escreva para a CALI…" onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    void send();
                  }
                }} />
                <div className="tw:flex tw:flex-wrap tw:items-center tw:justify-end tw:gap-[.62rem]">
                  <input ref={fileInput} type="file" hidden accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.xlsx,.pptx" onChange={(event) => {
                    setFile(event.target.files?.[0] || null);
                    event.target.value = '';
                  }} />
                  <Button
                    type="button"
                    variant="unstyled"
                    title="PDF, imagem, Word, Excel ou PowerPoint, até 10 MB"
                    className="tw:inline-flex tw:h-[3.08rem] tw:max-w-[18.46rem] tw:cursor-pointer tw:items-center tw:gap-[.54rem] tw:rounded-[.69rem] tw:border tw:border-solid tw:border-[#dfd3ca] tw:bg-white tw:px-[1.08rem] tw:text-[.92rem] tw:font-bold tw:text-cali-brand"
                    onClick={() => fileInput.current?.click()}
                  ><Paperclip size={14} /><span className="tw:truncate">{file ? file.name : 'Anexar'}</span></Button>
                  <Button
                    type="button"
                    variant="unstyled"
                    disabled={busy || (!text.trim() && !file)}
                    className="tw:inline-flex tw:h-[3.08rem] tw:cursor-pointer tw:items-center tw:gap-[.46rem] tw:rounded-[.69rem] tw:border-0 tw:bg-cali-brand tw:px-[1.23rem] tw:text-[.92rem] tw:font-bold tw:text-white tw:disabled:cursor-default tw:disabled:opacity-45"
                    onClick={() => void send()}
                  ><Send size={14} />{busy ? 'Enviando…' : 'Enviar'}</Button>
                </div>
                <SensitiveDataNote />
              </div>
            )}
          </section>
          {notice && <p className="tw:mt-[1.08rem] tw:rounded-[.69rem] tw:border tw:border-l-[.31rem] tw:border-solid tw:border-[#efc9a0] tw:border-l-[#d98a2b] tw:bg-[#fff7ea] tw:px-[1rem] tw:py-[.77rem] tw:text-[.92rem] tw:font-semibold tw:text-[#6b4310]" role="alert">{notice}</p>}
        </div>
      </DialogFrame>
    </div>
  );
}
