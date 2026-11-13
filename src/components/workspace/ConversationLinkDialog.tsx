import { useState } from 'react';
import { Button } from '../ds/Button';
import { DialogForm } from '../ds/DialogForm';

export function ConversationLinkDialog({ onClose, onAdd }: { onClose: () => void; onAdd: (url: string) => void }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  function submit() {
    const input = value.trim();
    if (!input) return;
    try {
      const url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
      if (!['https:', 'http:'].includes(url.protocol) || !url.hostname || /\s/.test(input) || url.username || url.password) throw new Error();
      onAdd(url.href);
    } catch {
      setError('Informe um endereço HTTP ou HTTPS válido.');
    }
  }

  return (
    <div className="tw:fixed tw:inset-0 tw:z-[2147483000] tw:grid tw:place-items-center tw:bg-[#2b181e]/45 tw:p-4" onMouseDown={(event) => {
      if (event.target === event.currentTarget) { event.stopPropagation(); onClose(); }
    }}>
      <DialogForm aria-label="Inserir um link na mensagem" className="tw:relative tw:w-[min(29rem,100%)] tw:rounded-2xl tw:bg-cali-surface tw:p-5 tw:text-cali-text tw:shadow-xl" onSubmit={(event) => { event.preventDefault(); submit(); }}>
        <Button type="button" variant="close" onClick={onClose}>×</Button>
        <span className="tw:block tw:text-xs tw:font-bold tw:tracking-widest tw:text-cali-gold">CONVERSA</span>
        <h2 className="tw:mt-1 tw:mb-3 tw:pr-8 tw:text-lg!">Inserir um link na mensagem</h2>
        <p className="tw:mt-0 tw:text-sm tw:text-cali-muted">Cole o endereço de uma página, pasta do Drive ou formulário.</p>
        <label className="tw:grid tw:gap-2 tw:text-xs tw:font-bold">Endereço do link
          <input type="text" inputMode="url" autoComplete="off" autoFocus placeholder="https://…" value={value} onChange={(event) => { setValue(event.target.value); setError(''); }} className="tw:min-h-cali-control tw:rounded-lg tw:border tw:border-solid tw:border-cali-line tw:bg-cali-surface tw:px-3 tw:font-normal" />
        </label>
        {error && <p role="alert" className="tw:mt-2 tw:text-xs tw:text-cali-danger">{error}</p>}
        <footer className="tw:mt-5 tw:flex tw:justify-end tw:gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="primary" disabled={!value.trim()}>Inserir link</Button>
        </footer>
      </DialogForm>
    </div>
  );
}
