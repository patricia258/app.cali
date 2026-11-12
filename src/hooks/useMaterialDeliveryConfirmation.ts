import { useRef } from 'react';

export function useMaterialDeliveryConfirmation() {
  const pending = useRef<{ key: string; id: string } | null>(null);

  function confirmDelivery(recipients: string[], details: unknown[]) {
    const key = JSON.stringify([recipients, ...details]);
    if (!window.confirm(`Deseja enviar para ${recipients.join(', ')}?`)) return null;
    if (!window.confirm('Tem certeza? Esta confirmação envia o material por e-mail.')) return null;
    if (pending.current?.key !== key) pending.current = { key, id: crypto.randomUUID() };
    return pending.current.id;
  }

  function completeDelivery() {
    pending.current = null;
  }

  return { confirmDelivery, completeDelivery };
}
