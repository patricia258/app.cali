import { MentionTextarea } from '../../../../components/workspace/MentionTextarea';
import { useEffect, useId, useRef, useState, type RefObject } from 'react';
import { Paperclip, Send } from 'lucide-react';
import { Button } from '../../../../components/ds/Button';
import { InlineNotice } from '../../../../components/ds/InlineNotice';
import { SensitiveDataNote } from '../../../../components/privacy/SensitiveDataNote';
import { removeRecordAttachment } from '../../../../api/records/conversation';
import { usePostRecordMessage, type RecordMessageReceipt } from '../hooks/usePostRecordMessage';
import { useUploadRecordMessageAttachment } from '../hooks/useUploadRecordMessageAttachment';
import { conversationAttachmentToken } from '../../../../lib/conversationMessageBody';
import { ConversationLinkDialog } from '../../../../components/workspace/ConversationLinkDialog';

const emojis = ['🙂', '😊', '👍', '🙏', '✨', '✅', '💡', '📌', '📎', '❤️', '👏', '🤝'];
const accept = '.pdf,.png,.jpg,.jpeg,.webp,.docx,.xlsx,.pptx';
type StagedAttachment = { id: string; file: File; path?: string };

export function RecordMessageComposer({ role, partner, companyId, recordId, actorId, input, onSent }: {
  role: 'admin' | 'client';
  partner: boolean;
  companyId: string;
  recordId: string;
  actorId?: string;
  input: RefObject<HTMLTextAreaElement>;
  onSent: (result: RecordMessageReceipt, internal: boolean) => Promise<void>;
}) {
  const id = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState('');
  const [internal, setInternal] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [attachments, setAttachments] = useState<StagedAttachment[]>([]);
  const [error, setError] = useState('');
  const sending = useRef(false);
  const mounted = useRef(true);
  const uploadedDraft = useRef(new Set<string>());
  const posting = useRef(false);
  const { mutateAsync: sendMessage, isPending } = usePostRecordMessage(actorId, recordId, partner);
  const { mutateAsync: upload, isPending: uploading } = useUploadRecordMessageAttachment(companyId, recordId, actorId);

  useEffect(() => {
    mounted.current = true;
    const paths = uploadedDraft.current;
    return () => {
      mounted.current = false;
      if (!posting.current) {
        for (const path of paths) void removeRecordAttachment(path);
        paths.clear();
      }
    };
  }, []);

  function discardUpload(path: string) {
    uploadedDraft.current.delete(path);
    void removeRecordAttachment(path);
  }

  function chooseFiles(files: FileList | null) {
    if (!files?.length) return;
    setError('');
    const next = Array.from(files).map((file) => ({ id: crypto.randomUUID(), file }));
    if (partner) {
      if (attachments[0]?.path) discardUpload(attachments[0].path);
      setAttachments(next.slice(0, 1));
      return;
    }
    if (attachments.length + next.length > 5) setError('Você pode enviar até 5 anexos por mensagem.');
    setAttachments((current) => [...current, ...next].slice(0, 5));
  }

  function removeAttachment(attachment: StagedAttachment) {
    setAttachments((current) => current.filter((item) => item !== attachment));
    if (attachment.path) discardUpload(attachment.path);
  }

  async function send() {
    if (sending.current || (!draft.trim() && !attachments.length)) return;
    sending.current = true;
    setError('');
    const tokens: string[] = [];
    try {
      for (const attachment of attachments) {
        const path = attachment.path ?? await upload(attachment.file);
        if (!mounted.current) {
          if (!attachment.path) void removeRecordAttachment(path);
          return;
        }
        if (!attachment.path) {
          uploadedDraft.current.add(path);
          setAttachments((current) => current.map((item) => item === attachment ? { ...item, path } : item));
        }
        tokens.push(conversationAttachmentToken(path, attachment.file));
      }
      posting.current = true;
      const result = await sendMessage({ body: [draft.trim(), ...tokens].filter(Boolean).join('\n'), internal });
      uploadedDraft.current.clear();
      if (!mounted.current) return;
      setDraft(''); setAttachments([]);
      await onSent(result, internal);
    } catch (reason) {
      if (mounted.current) setError(reason instanceof Error ? reason.message : 'Não foi possível enviar a mensagem.');
    } finally { sending.current = false; posting.current = false; }
  }

  const busy = isPending || uploading;
  const toolClass = 'tw:inline-flex tw:cursor-pointer tw:items-center tw:justify-center tw:gap-2 tw:rounded-lg tw:border tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface tw:p-2.5 tw:text-cali-body tw:leading-none tw:text-cali-brand';
  const sendClass = 'tw:col-start-2 tw:justify-self-end tw:disabled:cursor-not-allowed tw:disabled:opacity-40';
  return (
    <div className="tw:grid tw:shrink-0 tw:grid-cols-[minmax(0,1fr)_auto] tw:items-center tw:gap-x-3 tw:gap-y-2.5 tw:border-0 tw:border-t tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface tw:px-7.5 tw:pt-3.5 tw:pb-4.5" data-v2-operation="conversation-compose">
      <div className="tw:col-span-full tw:text-sm tw:font-bold">
        <label htmlFor={id}>{partner && internal ? 'Nota interna para a CALI' : role === 'admin' ? 'Responder ao cliente' : 'Responder nesta ocorrência'}</label>
      </div>
      {!partner && attachments.length > 0 && <div className="tw:col-span-full tw:flex tw:flex-wrap tw:gap-1.5">
        {attachments.map((attachment) => <span key={attachment.id} className="tw:inline-flex tw:items-center tw:gap-2 tw:rounded-full tw:border tw:border-solid tw:border-cali-line tw:bg-cali-surface tw:px-2 tw:py-1 tw:text-xs">
          <span>📎 {attachment.file.name}</span><button type="button" disabled={busy} className="tw:cursor-pointer tw:border-0 tw:bg-transparent tw:text-cali-muted" aria-label={`Remover ${attachment.file.name}`} onClick={() => removeAttachment(attachment)}>×</button>
        </span>)}
      </div>}
      <MentionTextarea
        ref={input}
        className="tw:col-span-full tw:h-16 tw:min-h-16 tw:w-full tw:resize-y tw:rounded-cali-panel tw:border tw:border-solid tw:border-cali-input-line tw:bg-cali-neutral-surface tw:px-3.5 tw:py-3 tw:[font-family:inherit] tw:text-cali-body tw:text-cali-text"
        id={id}
        rows={3}
        value={draft}
        onValueChange={setDraft}
        placeholder={partner && internal ? 'Só a Administração CALI vê esta nota…' : role === 'admin' ? 'Responder ao cliente…' : 'Escreva sua mensagem para a CALI…'}
        onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(); } }}
      />
      <input ref={fileInput} type="file" hidden multiple={!partner} accept={accept} onChange={(event) => { chooseFiles(event.target.files); event.target.value = ''; }} />
      {partner ? <div className="tw:col-span-full tw:flex tw:flex-wrap tw:items-center tw:justify-end tw:gap-3 tw:[&>*]:my-0!">
        <span className="tw:inline-flex tw:h-11 tw:w-auto tw:items-stretch tw:self-center tw:overflow-hidden tw:rounded-lg tw:border tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface" role="tablist" aria-label="Para quem">
          <button type="button" role="tab" aria-selected={!internal} className="tw:inline-flex tw:h-auto tw:w-auto tw:cursor-pointer tw:items-center tw:rounded-none tw:border-0 tw:bg-cali-neutral-surface tw:px-3.5 tw:py-2 tw:text-sm tw:font-semibold tw:text-cali-muted tw:aria-selected:bg-cali-brand tw:aria-selected:text-cali-neutral-surface" onClick={() => setInternal(false)}>Cliente</button>
          <button type="button" role="tab" aria-selected={internal} className="tw:inline-flex tw:h-auto tw:w-auto tw:cursor-pointer tw:items-center tw:rounded-none tw:border-0 tw:bg-cali-neutral-surface tw:px-3.5 tw:py-2 tw:text-sm tw:font-semibold tw:text-cali-muted tw:aria-selected:bg-cali-brand tw:aria-selected:text-cali-neutral-surface" onClick={() => setInternal(true)}>Interno</button>
        </span>
        <Button variant="secondary" className="tw:ml-auto tw:inline-flex tw:h-11 tw:min-h-[2.77rem] tw:max-w-[16.92rem] tw:items-center tw:gap-2 tw:px-4! tw:[&_span]:truncate" type="button" disabled={busy} title={attachments[0] ? 'Clique para trocar o arquivo' : 'PDF, imagem, Word, Excel ou PowerPoint, até 10 MB'} onClick={() => fileInput.current?.click()}><Paperclip size={14} /><span>{attachments[0]?.file.name ?? 'Anexar'}</span></Button>
        <Button variant="primary" type="button" pending={busy} disabled={!draft.trim() && !attachments.length} onClick={() => void send()}><Send size={14} />{busy ? 'Enviando…' : 'Enviar'}</Button>
      </div> : <>
        <div className="tw:relative tw:col-start-1 tw:flex tw:items-center tw:gap-2.5">
          <button type="button" className={toolClass} aria-label="Anexar arquivo" title="Anexar arquivo" disabled={busy} onClick={() => fileInput.current?.click()}>📎 <span aria-hidden="true" className="tw:text-sm tw:font-semibold">Anexar</span></button>
          <button type="button" className={toolClass} aria-label="Inserir link" title="Inserir link" onClick={() => setLinkOpen(true)}>🔗 <span aria-hidden="true" className="tw:text-sm tw:font-semibold">Link</span></button>
          <button type="button" className={toolClass} aria-label="Abrir emojis" title="Emojis" aria-expanded={emojiOpen} onClick={() => setEmojiOpen((open) => !open)}>😊</button>
          {emojiOpen && <div className="tw:absolute tw:bottom-[calc(100%+.62rem)] tw:left-0 tw:z-5 tw:flex tw:max-w-[18.46rem] tw:flex-wrap tw:gap-1 tw:rounded-cali-panel tw:border tw:border-solid tw:border-cali-sand-line tw:bg-cali-neutral-surface tw:p-2.5 tw:shadow-[0_.92rem_2.31rem_rgb(var(--cali-rgb-red-inverse)/0.1294)]" aria-label="Emojis">{emojis.map((emoji) => <button key={emoji} type="button" className="tw:rounded-md tw:border-0 tw:bg-transparent tw:p-1 tw:text-lg" onClick={() => { setDraft((current) => current + emoji); setEmojiOpen(false); input.current?.focus(); }}>{emoji}</button>)}</div>}
        </div>
        <Button className={sendClass} variant="primary" type="button" pending={busy} disabled={!draft.trim() && !attachments.length} onClick={() => void send()}><Send size={14} />{busy ? 'Enviando…' : 'Enviar'}</Button>
      </>}
      {error && <div className="tw:col-span-full"><InlineNotice tone="danger" role="alert">{error}</InlineNotice></div>}
      {role === 'client' && <SensitiveDataNote />}
      {linkOpen && <ConversationLinkDialog onClose={() => setLinkOpen(false)} onAdd={(url) => {
        setDraft((current) => `${current}${current ? ' ' : ''}${url}`);
        setLinkOpen(false);
        queueMicrotask(() => input.current?.focus());
      }} />}
    </div>
  );
}
