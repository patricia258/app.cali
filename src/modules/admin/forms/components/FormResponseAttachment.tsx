import { useState } from 'react';
import { Paperclip } from 'lucide-react';
import { openFormAttachment,
} from '../../../../api/forms/admin';
import { fileLabel } from '../../../forms/formModel';

/** Arquivo enviado numa resposta: link do Drive (importados) ou link temporário do armazenamento do app. */
export function FormResponseAttachment({ value }: { value: string }) {
  const [busy, setBusy] = useState(false);
  if (/^https?:\/\//.test(value)) return <a className="v2-forms-file tw:inline-flex tw:items-center tw:gap-[0.385rem] tw:max-w-[16.923rem] tw:[border:1px_solid_#e3d6cc]
    tw:rounded-full tw:bg-white tw:text-cali-brand tw:[font:600_0.846rem_Inter,sans-serif] tw:[padding:0.308rem_0.769rem]
    tw:no-underline tw:cursor-pointer tw:overflow-hidden tw:text-ellipsis tw:whitespace-nowrap tw:[&:hover]:border-cali-brand" href={value} target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()}><Paperclip size={13} /> Abrir arquivo</a>;
  return <button type="button" className="v2-forms-file tw:inline-flex tw:items-center tw:gap-[0.385rem] tw:max-w-[16.923rem] tw:[border:1px_solid_#e3d6cc]
    tw:rounded-full tw:bg-white tw:text-cali-brand tw:[font:600_0.846rem_Inter,sans-serif] tw:[padding:0.308rem_0.769rem]
    tw:no-underline tw:cursor-pointer tw:overflow-hidden tw:text-ellipsis tw:whitespace-nowrap tw:[&:hover]:border-cali-brand" disabled={busy} onClick={async (event) => {
    event.stopPropagation(); setBusy(true);
    const opened = window.open('', '_blank');
    const { data } = await openFormAttachment(value);
    setBusy(false);
    if (data?.signedUrl && opened) opened.location.href = data.signedUrl; else opened?.close();
  }}><Paperclip size={13} /> {busy ? 'Abrindo…' : fileLabel(value)}</button>;
}
