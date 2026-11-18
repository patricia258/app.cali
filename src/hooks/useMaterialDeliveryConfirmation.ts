import { useRef } from 'react';
import { confirmAction } from '../components/feedback/workspaceDialogs';

type DeliveryDetail = string | number | boolean | null | undefined | readonly (string | number)[];

export function useMaterialDeliveryConfirmation() {
  const pending = useRef<{ key: string; id: string } | null>(null);
  const confirming = useRef(false);

  async function confirmDelivery(recipients: string[], details: DeliveryDetail[]) {
    if (confirming.current) return null;
    confirming.current = true;
    const key = JSON.stringify([recipients, ...details]);
    try {
      if (!await confirmAction(`Deseja enviar para ${recipients.join(', ')}?`)) return null;
      if (!await confirmAction('Tem certeza? Esta confirmação envia o material por e-mail.')) return null;
      if (pending.current?.key !== key) pending.current = { key, id: crypto.randomUUID() };
      return pending.current.id;
    } finally {
      confirming.current = false;
    }
  }

  function completeDelivery() {
    pending.current = null;
  }

  return { confirmDelivery, completeDelivery };
}
