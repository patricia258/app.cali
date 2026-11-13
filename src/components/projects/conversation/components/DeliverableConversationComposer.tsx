import { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { removeDeliverableAttachment } from '../../../../api/projects/conversation';
import { conversationAttachmentToken } from '../../../../lib/conversationMessageBody';
import { Button } from '../../../ds/Button';
import { InlineNotice } from '../../../ds/InlineNotice';
import { ConversationLinkDialog } from '../../../workspace/ConversationLinkDialog';
import { MentionTextarea } from '../../../workspace/MentionTextarea';
import { usePostDeliverableComment } from '../hooks/usePostDeliverableComment';
import { deliverableChatAttachmentError, useUploadDeliverableChatAttachment } from '../hooks/useUploadDeliverableChatAttachment';

import { DeliverableConversationChannel } from './DeliverableConversationChannel';
import { DeliverableConversationTools } from './DeliverableConversationTools';

type Attachment = { id: string; file: File };
type Draft = { body: string; attachments: Attachment[] };
type Props = {
  role: 'admin' | 'client';
  visible: boolean;
  actorId?: string;
  companyId: string;
  deliverableId: string;
  onSent: () => void;
  onChannelChange: (visible: boolean) => void;
};

export function DeliverableConversationComposer({ role, visible, actorId, companyId, deliverableId, onSent, onChannelChange }: Props) {
  const [drafts, setDrafts] = useState<Record<'client' | 'internal', Draft>>({ client: { body: '', attachments: [] }, internal: { body: '', attachments: [] } });
  const [error, setError] = useState('');
  const [linkOpen, setLinkOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const sending = useRef(false);
  const mounted = useRef(false);
  const posting = useRef(false);
  const uploaded = useRef(new Map<string, string>());
  const upload = useUploadDeliverableChatAttachment(companyId, deliverableId, actorId);
  const post = usePostDeliverableComment(role, companyId, deliverableId, actorId);
  const channel = visible ? 'client' : 'internal';
  const { body: draft, attachments } = drafts[channel];

  function updateDraft(update: (current: Draft) => Draft) {
    setDrafts((current) => ({ ...current, [channel]: update(current[channel]) }));
  }

  function changeChannel(next: boolean) {
    setError('');
    onChannelChange(next);
  }

  useEffect(() => {
    mounted.current = true;
    const paths = uploaded.current;
    return () => {
      mounted.current = false;
      if (posting.current) return;
      for (const path of paths.values()) void removeDeliverableAttachment(path);
      paths.clear();
    };
  }, []);

  function chooseFiles(files: FileList | null) {
    if (!files?.length) return;
    const selected = Array.from(files);
    const failure = selected.map(deliverableChatAttachmentError).find(Boolean);
    const accepted = selected.filter((file) => !deliverableChatAttachmentError(file));
    const additions = accepted.slice(0, 5 - attachments.length).map((file) => ({ id: crypto.randomUUID(), file }));
    updateDraft((current) => ({ ...current, attachments: [...current.attachments, ...additions].slice(0, 5) }));
    setError(failure || (accepted.length > additions.length ? 'Você pode enviar até 5 anexos por mensagem.' : ''));
  }

  function removeAttachment(id: string) {
    const path = uploaded.current.get(id);
    if (path) void removeDeliverableAttachment(path);
    uploaded.current.delete(id);
    updateDraft((current) => ({ ...current, attachments: current.attachments.filter((attachment) => attachment.id !== id) }));
  }

  async function send() {
    if (!actorId || sending.current || (!draft.trim() && !attachments.length)) return;
    sending.current = true;
    setBusy(true);
    setError('');
    try {
      const tokens: string[] = [];
      for (const { id, file } of attachments) {
        const path = uploaded.current.get(id) ?? await upload.mutateAsync(file);
        if (!mounted.current) { void removeDeliverableAttachment(path); return; }
        uploaded.current.set(id, path);
        tokens.push(conversationAttachmentToken(path, file));
      }
      posting.current = true;
      await post.mutateAsync({ body: [draft.trim(), ...tokens].filter(Boolean).join('\n'), visible });
      for (const { id } of attachments) uploaded.current.delete(id);
      if (!mounted.current) return;
      updateDraft(() => ({ body: '', attachments: [] }));
      onSent();
    } catch (failure) {
      if (mounted.current) setError(failure instanceof Error ? failure.message : 'Não foi possível enviar a mensagem.');
    } finally {
      sending.current = false;
      posting.current = false;
      if (mounted.current) {
        upload.reset();
        post.reset();
        setBusy(false);
        requestAnimationFrame(() => input.current?.focus());
      } else {
        for (const path of uploaded.current.values()) void removeDeliverableAttachment(path);
        uploaded.current.clear();
      }
    }
  }

  const placeholder = role === 'client' ? 'Escreva sua mensagem sobre esta entrega...'
    : visible ? 'Escreva uma mensagem para o cliente…' : 'Registre uma nota interna…';
  return <div className={`tw:relative tw:z-[2] tw:grid tw:shrink-0 tw:grid-cols-[minmax(0,1fr)] tw:items-center tw:justify-items-center tw:gap-[.92rem] tw:border-0 tw:border-t tw:border-solid tw:border-[#e9ddd6] tw:bg-white tw:px-[2.08rem] tw:py-[1.31rem] tw:workspace-night:border-cali-line tw:workspace-night:bg-cali-surface tw:sm:justify-items-stretch ${role === 'admin' ? 'tw:sm:grid-cols-[auto_auto_minmax(0,1fr)_auto]' : 'tw:sm:grid-cols-[auto_minmax(0,1fr)_auto]'}`}>
    {role === 'admin' && <DeliverableConversationChannel visible={visible} disabled={busy} onChange={changeChannel} />}
    {attachments.length > 0 && <div className="tw:order-first tw:col-span-full tw:flex tw:max-w-full tw:flex-wrap tw:gap-1.5">
      {attachments.map(({ id, file }) => <span key={id} className="tw:inline-flex tw:items-center tw:gap-2 tw:rounded-full tw:border tw:border-solid tw:border-cali-line tw:bg-(--theme-surface-soft) tw:px-2 tw:py-1 tw:text-xs">
        <span>📎 {file.name}</span><button type="button" aria-label={`Remover ${file.name}`} disabled={busy} onClick={() => removeAttachment(id)} className="tw:cursor-pointer tw:border-0 tw:bg-transparent tw:text-cali-muted">×</button>
      </span>)}
    </div>}
    <DeliverableConversationTools key={channel} disabled={busy} onFiles={chooseFiles}
      onLink={() => setLinkOpen(true)} onEmoji={(emoji) => {
        updateDraft((current) => ({ ...current, body: current.body + emoji }));
        input.current?.focus();
      }} />
    <MentionTextarea ref={input} aria-label="Mensagem" value={draft} placeholder={placeholder} disabled={busy}
      onValueChange={(body) => updateDraft((current) => ({ ...current, body }))} rows={2} onKeyDown={(event) => {
        if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && !event.defaultPrevented) { event.preventDefault(); void send(); }
      }} className="tw:h-[4.77rem] tw:w-full tw:resize-none tw:rounded-lg tw:border tw:border-solid tw:border-[#dfd3ca] tw:bg-white tw:px-[.92rem] tw:py-[.92rem] tw:[font-family:inherit] tw:text-[.923rem] tw:text-cali-text tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-cali-accent tw:workspace-night:border-cali-input-line tw:workspace-night:bg-cali-input" />
    <Button type="button" variant="primary" className="tw:mt-[.77rem] tw:min-h-[2.77rem] tw:disabled:cursor-not-allowed tw:disabled:opacity-40" pending={busy} disabled={!actorId || (!draft.trim() && !attachments.length)} onClick={() => void send()}>
      {busy ? 'Enviando…' : 'Enviar'} <ArrowRight size={14} aria-hidden="true" />
    </Button>
    {error && <div className="tw:order-last tw:col-span-full"><InlineNotice role="alert" tone="danger">{error}</InlineNotice></div>}
    {linkOpen && <ConversationLinkDialog onClose={() => setLinkOpen(false)} onAdd={(url) => {
      updateDraft((current) => ({ ...current, body: `${current.body}${current.body ? ' ' : ''}${url}` }));
      setLinkOpen(false);
      queueMicrotask(() => input.current?.focus());
    }} />}
  </div>;
}
