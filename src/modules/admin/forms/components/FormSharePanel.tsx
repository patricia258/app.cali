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
    {form.status !== 'open' && <div className="v2-forms-alert tw:flex tw:items-center tw:gap-[1.231rem] tw:mb-[1.231rem] tw:[padding:1.077rem_1.231rem]
      tw:[border:1px_solid_#f2dfb8] tw:[border-left:0.308rem_solid_#c08a2b] tw:rounded-[0.769rem] tw:bg-[#fff8ea]
      tw:[&>div]:flex-1 tw:[&_strong]:text-[1rem] tw:[&_strong]:text-[#7a5418] tw:[&_p]:[margin:0.231rem_0_0]
      tw:[&_p]:text-[0.923rem] tw:[&_p]:text-[#8a6a33]" role="alert"><div><strong>{form.status === 'draft' ? 'Este formulário ainda é rascunho' : 'Este formulário está encerrado'}</strong><p>Quem abrir o link {form.status === 'draft' ? 'vai ver “formulário não encontrado”' : 'vai ver que ele não recebe mais respostas'}. Abra para respostas antes de enviar.</p></div><Button type="button" variant="workflowPrimary" onClick={onOpen}>Abrir para respostas</Button></div>}
    <section className="v2-forms-card v2-forms-share-card tw:bg-white tw:[border:1px_solid_var(--fm-line)] tw:rounded-[0.923rem]
      tw:[padding:1.538rem_1.692rem] tw:[&>header]:mb-[1.231rem] tw:[&>header_small]:text-[0.769rem]
      tw:[&>header_small]:font-bold tw:[&>header_small]:tracking-[.12em] tw:[&>header_small]:text-cali-gold
      tw:[&>header_h2]:text-[1.231rem] tw:[&>header_h2]:font-semibold tw:[&>header_h2]:text-[color:var(--fm-ink)]
      tw:[&>header_h2]:[margin:0.308rem_0_0] tw:flex tw:gap-[2.154rem] tw:items-center tw:[@media(max-width:760px)]:flex-col
      tw:[@media(max-width:760px)]:items-stretch">
      <div className="v2-forms-qr tw:[flex:0_0_16.923rem] tw:h-[16.923rem] tw:grid tw:place-items-center tw:[border:1px_solid_var(--fm-line)]
        tw:rounded-[1.077rem] tw:bg-white tw:p-[0.769rem] tw:[&_img]:w-full tw:[&_img]:h-full tw:[&_img]:object-contain
        tw:[@media(max-width:760px)]:[flex-basis:auto] tw:[@media(max-width:760px)]:h-auto tw:[@media(max-width:760px)]:[aspect-ratio:1]
        tw:[@media(max-width:760px)]:max-w-[20rem] tw:[@media(max-width:760px)]:[margin:0_auto]">{qr ? <img src={qr} alt={`QR Code do formulário ${form.title}`} /> : <span className="data-loading">Gerando…</span>}</div>
      <div className="v2-forms-share-body tw:flex-1 tw:min-w-0 tw:flex tw:flex-col tw:gap-[0.769rem] tw:[&_small]:text-[0.769rem]
        tw:[&_small]:font-bold tw:[&_small]:tracking-[.12em] tw:[&_small]:text-cali-gold tw:[&_p]:m-0
        tw:[&_p]:text-[0.923rem] tw:[&_p]:leading-[1.55] tw:[&_p]:text-[color:var(--fm-muted)]">
        <small>LINK DO FORMULÁRIO</small>
        <div className="v2-forms-link tw:flex tw:gap-[0.615rem] tw:[&_input]:flex-1 tw:[&_input]:min-w-0 tw:[&_input]:[border:1px_solid_#e3d6cc]
          tw:[&_input]:rounded-[0.615rem] tw:[&_input]:[padding:0.692rem_0.846rem] tw:[&_input]:[font:500_1rem_Inter,sans-serif]
          tw:[&_input]:text-[color:var(--fm-wine)] tw:[&_input]:bg-[#fbf7f3] tw:[@media(max-width:760px)]:flex-col"><input readOnly value={url} onFocus={(event) => event.target.select()} /><Button type="button" variant="workflowPrimary" onClick={() => { void navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2200); }); }}><Copy size={15} /> {copied ? 'Copiado' : 'Copiar link'}</Button></div>
        <p>Envie o link por e-mail ou WhatsApp. Para eventos, apresentações e materiais impressos, use o QR Code ou o cartão pronto para divulgar.</p>
        <div className="v2-forms-share-actions tw:flex tw:flex-wrap tw:gap-[0.615rem] tw:[&_a]:no-underline">
          <Button type="button" variant="formSecondary" onClick={() => void downloadQrPng(url, `${fileBase}-qrcode.png`)}><QrCode size={15} /> Baixar QR Code</Button>
          <Button type="button" variant="formSecondary" disabled={busy} onClick={() => { setBusy(true); void downloadShareCard({ title: form.title, category: form.category, intro: stripRichText(form.description) }, url, `${fileBase}-cartao.png`).finally(() => setBusy(false)); }}><Download size={15} /> {busy ? 'Gerando…' : 'Baixar cartão para divulgar'}</Button>
          <a className="wf-secondary tw:inline-flex tw:items-center tw:gap-[0.538rem] tw:justify-center tw:[border:1px_solid_#e3d6cc]
            tw:bg-white tw:text-cali-brand tw:rounded-[0.538rem] tw:[padding:0.692rem_1rem] tw:[font:600_0.846rem_Inter,sans-serif]
            tw:no-underline tw:cursor-pointer tw:[transition:border-color_.15s,background_.15s] tw:[&:hover:not(:disabled)]:border-cali-brand
            tw:[&:hover:not(:disabled)]:bg-[#fbf7f3] tw:[&:disabled]:opacity-[.45] tw:[&:disabled]:cursor-default" href={`https://wa.me/?text=${encodeURIComponent(`${form.title}: ${url}`)}`} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} /> Enviar no WhatsApp</a>
        </div>
      </div>
    </section>
  </div>;
}
