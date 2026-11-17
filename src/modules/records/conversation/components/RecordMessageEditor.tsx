import { MentionTextarea } from '../../../../components/workspace/MentionTextarea';
import { useLayoutEffect, useRef, useState } from 'react';
import { Button } from '../../../../components/ds/Button';
import { showMessage } from '../../../../components/feedback/workspaceDialogs';
import { useEditRecordMessage } from '../hooks/useEditRecordMessage';
import type { ConversationMessageAttachment } from '../../../../lib/conversationMessageBody';

export function RecordMessageEditor({ messageId, text, attachments, onCancel, onSaved }: {
  messageId: string;
  text: string;
  attachments: ConversationMessageAttachment[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState(text);
  const input = useRef<HTMLTextAreaElement>(null);
  const { mutateAsync, isPending } = useEditRecordMessage(messageId);

  useLayoutEffect(() => {
    input.current?.focus();
    input.current?.setSelectionRange(text.length, text.length);
  }, [text.length]);

  async function save() {
    const body = [draft.trim(), ...attachments.map((attachment) => attachment.token)].filter(Boolean).join('\n');
    if (!body || isPending) return;
    try {
      await mutateAsync(body);
      onSaved();
    } catch (error) {
      void showMessage(error instanceof Error ? error.message : 'Não foi possível editar a mensagem.');
    }
  }

  return (
    <div className="records-inline-edit tw:mt-2.5 tw:mb-2 tw:flex tw:w-full tw:flex-col tw:gap-3">
      <MentionTextarea
        ref={input}
        aria-label="Editar texto da mensagem"
        rows={Math.max(3, Math.min(7, text.split('\n').length + 1))}
        value={draft}
        onValueChange={setDraft}
        className="tw:block tw:min-h-[7.38rem] tw:w-full tw:resize-y tw:rounded-lg tw:border tw:border-solid tw:border-cali-input-line tw:bg-cali-neutral-surface tw:px-3.5 tw:py-3 tw:text-cali-body tw:leading-[1.55] tw:text-cali-text tw:focus:border-cali-brand"
      />
      <div className="tw:flex tw:justify-end tw:gap-2">
        <Button variant="secondary" type="button" disabled={isPending} onClick={onCancel}>Cancelar</Button>
        <Button variant="primary" type="button" pending={isPending} disabled={!draft.trim() && !attachments.length} onClick={() => void save()}>Salvar</Button>
      </div>
    </div>
  );
}
