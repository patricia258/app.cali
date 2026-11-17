import { Button } from '../../../../components/ds/Button';
import { useEffect, useState } from 'react';
import { Copy, Download, ExternalLink, QrCode } from 'lucide-react';

import { downloadQrPng, downloadShareCard, qrDataUrl } from '../formExports';
import { type FormRecord, stripRichText } from '../../../forms/formModel';

export function FormSharePanel({ form, url, onOpen }: { form: FormRecord; url: string; onOpen: () => void }) {
  const [qr, setQr] = useState('');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { void qrDataUrl(url, 520).then(setQr); }, [url]);
  const fileBase = `cali-forms-${form.slug}`;
  return <div className="v2-forms-share">
    {form.status !== 'open' && <div className="v2-forms-alert tw:flex tw:items-center tw:gap-5 tw:mb-5 tw:[padding:1.077rem_1.231rem]
      tw:[border:1px_solid_var(--cali-color-gold-line)] tw:[border-left:0.308rem_solid_var(--cali-color-gold-accent)] tw:rounded-xl tw:bg-cali-gold-surface
      tw:[&>div]:flex-1 tw:[&_strong]:text-base tw:[&_strong]:text-cali-gold-text tw:[&_p]:[margin:0.231rem_0_0]
      tw:[&_p]:text-cali-body tw:[&_p]:text-cali-gold-text" role="alert"><div><strong>{form.status === 'draft' ? 'Este formulário ainda é rascunho' : 'Este formulário está encerrado'}</strong><p>Quem abrir o link {form.status === 'draft' ? 'vai ver “formulário não encontrado”' : 'vai ver que ele não recebe mais respostas'}. Abra para respostas antes de enviar.</p></div><Button type="button" variant="workflowPrimary" onClick={onOpen}>Abrir para respostas</Button></div>}
    <section className="v2-forms-card v2-forms-share-card tw:bg-cali-neutral-surface tw:[border:1px_solid_var(--fm-line)] tw:rounded-[0.923rem]
      tw:[padding:1.538rem_1.692rem] tw:[&>header]:mb-5 tw:[&>header_small]:text-xs
      tw:[&>header_small]:font-bold tw:[&>header_small]:tracking-[.12em] tw:[&>header_small]:text-cali-gold
      tw:[&>header_h2]:text-xl tw:[&>header_h2]:font-semibold tw:[&>header_h2]:text-[color:var(--fm-ink)]
      tw:[&>header_h2]:[margin:0.308rem_0_0] tw:flex tw:gap-8.5 tw:items-center tw:[@media(max-width:760px)]:flex-col
      tw:[@media(max-width:760px)]:items-stretch">
      <div className="v2-forms-qr tw:[flex:0_0_16.923rem] tw:h-[16.923rem] tw:grid tw:place-items-center tw:[border:1px_solid_var(--fm-line)]
        tw:rounded-[1.077rem] tw:bg-cali-neutral-surface tw:p-3 tw:[&_img]:w-full tw:[&_img]:h-full tw:[&_img]:object-contain
        tw:[@media(max-width:760px)]:[flex-basis:auto] tw:[@media(max-width:760px)]:h-auto tw:[@media(max-width:760px)]:[aspect-ratio:1]
        tw:[@media(max-width:760px)]:max-w-80 tw:[@media(max-width:760px)]:[margin:0_auto]">{qr ? <img src={qr} alt={`QR Code do formulário ${form.title}`} /> : <span className="data-loading">Gerando…</span>}</div>
      <div className="v2-forms-share-body tw:flex-1 tw:min-w-0 tw:flex tw:flex-col tw:gap-3 tw:[&_small]:text-xs
        tw:[&_small]:font-bold tw:[&_small]:tracking-[.12em] tw:[&_small]:text-cali-gold tw:[&_p]:m-0
        tw:[&_p]:text-cali-body tw:[&_p]:leading-[1.55] tw:[&_p]:text-[color:var(--fm-muted)]">
        <small>LINK DO FORMULÁRIO</small>
        <div className="v2-forms-link tw:flex tw:gap-2.5 tw:[&_input]:flex-1 tw:[&_input]:min-w-0 tw:[&_input]:[border:1px_solid_var(--cali-color-sand-line)]
          tw:[&_input]:rounded-cali-compact-control tw:[&_input]:[padding:0.692rem_0.846rem] tw:[&_input]:[font:500_1rem_Inter,sans-serif]
          tw:[&_input]:text-[color:var(--fm-wine)] tw:[&_input]:bg-cali-surface-soft tw:[@media(max-width:760px)]:flex-col"><input readOnly value={url} onFocus={(event) => event.target.select()} /><Button type="button" variant="workflowPrimary" onClick={() => { void navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2200); }); }}><Copy size={15} /> {copied ? 'Copiado' : 'Copiar link'}</Button></div>
        <p>Envie o link por e-mail ou WhatsApp. Para eventos, apresentações e materiais impressos, use o QR Code ou o cartão pronto para divulgar.</p>
        <div className="v2-forms-share-actions tw:flex tw:flex-wrap tw:gap-2.5 tw:[&_a]:no-underline">
          <Button type="button" variant="formSecondary" onClick={() => void downloadQrPng(url, `${fileBase}-qrcode.png`)}><QrCode size={15} /> Baixar QR Code</Button>
          <Button type="button" variant="formSecondary" disabled={busy} onClick={() => { setBusy(true); void downloadShareCard({ title: form.title, category: form.category, intro: stripRichText(form.description) }, url, `${fileBase}-cartao.png`).finally(() => setBusy(false)); }}><Download size={15} /> {busy ? 'Gerando…' : 'Baixar cartão para divulgar'}</Button>
          <a className="wf-secondary tw:inline-flex tw:items-center tw:gap-2 tw:justify-center tw:[border:1px_solid_var(--cali-color-sand-line)]
            tw:bg-cali-neutral-surface tw:text-cali-brand tw:rounded-lg tw:[padding:0.692rem_1rem] tw:[font:600_0.846rem_Inter,sans-serif]
            tw:no-underline tw:cursor-pointer tw:[transition:border-color_.15s,background_.15s] tw:[&:hover:not(:disabled)]:border-cali-brand
            tw:[&:hover:not(:disabled)]:bg-cali-surface-soft tw:[&:disabled]:opacity-[.45] tw:[&:disabled]:cursor-default" href={`https://wa.me/?text=${encodeURIComponent(`${form.title}: ${url}`)}`} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} /> Enviar no WhatsApp</a>
        </div>
      </div>
    </section>
  </div>;
}
