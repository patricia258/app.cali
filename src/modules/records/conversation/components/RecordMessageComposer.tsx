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
  const { mutateAsync: sendMessage, isPending } = usePostRecordMessage(recordId, partner);
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
  const toolClass = 'tw:inline-flex tw:cursor-pointer tw:items-center tw:justify-center tw:gap-[.46rem] tw:rounded-[.54rem] tw:border tw:border-solid tw:border-[#e7ddd5] tw:bg-white tw:p-[.62rem] tw:text-[.92rem] tw:leading-none tw:text-cali-brand';
  const sendClass = 'tw:col-start-2 tw:justify-self-end tw:disabled:cursor-not-allowed tw:disabled:opacity-40';
  return (
    <div className="tw:grid tw:shrink-0 tw:grid-cols-[minmax(0,1fr)_auto] tw:items-center tw:gap-x-[.77rem] tw:gap-y-[.62rem] tw:border-0 tw:border-t tw:border-solid tw:border-[#eadfd6] tw:bg-white tw:px-[1.85rem] tw:pt-[.92rem] tw:pb-[1.08rem]" data-v2-operation="conversation-compose">
      <div className="tw:col-span-full tw:text-[.85rem] tw:font-bold">
        <label htmlFor={id}>{partner && internal ? 'Nota interna para a Patricia' : role === 'admin' ? 'Responder ao cliente' : 'Responder nesta ocorrência'}</label>
      </div>
      {!partner && attachments.length > 0 && <div className="tw:col-span-full tw:flex tw:flex-wrap tw:gap-1.5">
        {attachments.map((attachment) => <span key={attachment.id} className="tw:inline-flex tw:items-center tw:gap-2 tw:rounded-full tw:border tw:border-solid tw:border-cali-line tw:bg-cali-surface tw:px-2 tw:py-1 tw:text-xs">
          <span>📎 {attachment.file.name}</span><button type="button" disabled={busy} className="tw:cursor-pointer tw:border-0 tw:bg-transparent tw:text-cali-muted" aria-label={`Remover ${attachment.file.name}`} onClick={() => removeAttachment(attachment)}>×</button>
        </span>)}
      </div>}
      <MentionTextarea
        ref={input}
        className="tw:col-span-full tw:h-[4rem] tw:min-h-[4rem] tw:w-full tw:resize-y tw:rounded-[.69rem] tw:border tw:border-solid tw:border-[#dfd3ca] tw:bg-white tw:px-[.92rem] tw:py-[.77rem] tw:[font-family:inherit] tw:text-[.92rem] tw:text-cali-text"
        id={id}
        rows={3}
        value={draft}
        onValueChange={setDraft}
        placeholder={partner && internal ? 'Só a Patricia vê esta nota…' : role === 'admin' ? 'Responder ao cliente…' : 'Escreva sua mensagem para a CALI…'}
        onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(); } }}
      />
      <input ref={fileInput} type="file" hidden multiple={!partner} accept={accept} onChange={(event) => { chooseFiles(event.target.files); event.target.value = ''; }} />
      {partner ? <div className="v2-staff-compose-actions tw:col-span-full tw:flex tw:items-center tw:justify-end tw:gap-[.77rem]">
        <span className="v2-staff-compose-mode" role="tablist" aria-label="Para quem">
          <button type="button" role="tab" aria-selected={!internal} className={!internal ? 'on' : ''} onClick={() => setInternal(false)}>Cliente</button>
          <button type="button" role="tab" aria-selected={internal} className={internal ? 'on' : ''} onClick={() => setInternal(true)}>Interno</button>
        </span>
        <Button variant="secondary" className="v2-staff-attach" type="button" disabled={busy} title={attachments[0] ? 'Clique para trocar o arquivo' : 'PDF, imagem, Word, Excel ou PowerPoint, até 10 MB'} onClick={() => fileInput.current?.click()}><Paperclip size={14} /><span>{attachments[0]?.file.name ?? 'Anexar'}</span></Button>
        <Button variant="primary" type="button" pending={busy} disabled={!draft.trim() && !attachments.length} onClick={() => void send()}><Send size={14} />{busy ? 'Enviando…' : 'Enviar'}</Button>
      </div> : <>
        <div className="tw:relative tw:col-start-1 tw:flex tw:items-center tw:gap-[.62rem]">
          <button type="button" className={toolClass} aria-label="Anexar arquivo" title="Anexar arquivo" disabled={busy} onClick={() => fileInput.current?.click()}>📎 <span aria-hidden="true" className="tw:text-[.85rem] tw:font-semibold">Anexar</span></button>
          <button type="button" className={toolClass} aria-label="Inserir link" title="Inserir link" onClick={() => setLinkOpen(true)}>🔗 <span aria-hidden="true" className="tw:text-[.85rem] tw:font-semibold">Link</span></button>
          <button type="button" className={toolClass} aria-label="Abrir emojis" title="Emojis" aria-expanded={emojiOpen} onClick={() => setEmojiOpen((open) => !open)}>😊</button>
          {emojiOpen && <div className="tw:absolute tw:bottom-[calc(100%+.62rem)] tw:left-0 tw:z-5 tw:flex tw:max-w-[18.46rem] tw:flex-wrap tw:gap-[.31rem] tw:rounded-[.69rem] tw:border tw:border-solid tw:border-[#ebe0d8] tw:bg-white tw:p-[.62rem] tw:shadow-[0_.92rem_2.31rem_#34202121]" aria-label="Emojis">{emojis.map((emoji) => <button key={emoji} type="button" className="tw:rounded-[.38rem] tw:border-0 tw:bg-transparent tw:p-[.31rem] tw:text-[1.15rem]" onClick={() => { setDraft((current) => current + emoji); setEmojiOpen(false); input.current?.focus(); }}>{emoji}</button>)}</div>}
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
