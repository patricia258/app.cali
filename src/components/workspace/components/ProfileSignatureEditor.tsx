import { Input } from '../../ds/Input';
import { Upload } from 'lucide-react';
import type { ChangeEvent } from 'react';
import '../../reports/report-signature-fonts.css';
import { ProfileSignatureImage } from './ProfileSignatureImage';

type Props = {
  name: string;
  uploadedSource?: string;
  onNameChange: (name: string) => void;
  onUseName: () => void;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
};

export function ProfileSignatureEditor({ name, uploadedSource, onNameChange, onUseName, onUpload }: Props) {
  return (
    <section className="tw:m-0 tw:flex tw:w-full tw:flex-col tw:items-start tw:gap-4.5 tw:rounded-[1.231rem] tw:border tw:border-solid tw:border-cali-gold/25 tw:bg-cali-paper tw:p-6.5 tw:workspace-night:border-cali-sand-soft/13 tw:workspace-night:bg-cali-burgundy-strong">
      <header className="tw:mb-4.5">
        <h3 className="tw:mb-0.5! tw:text-2xl/[inherit]! tw:text-cali-burgundy-accent! tw:workspace-night:text-cali-paper!">Assinatura</h3>
        <p className="tw:m-0 tw:text-cali-body/[inherit]! tw:text-cali-neutral-accent! tw:workspace-night:text-cali-neutral-line!">Use seu nome ou envie uma imagem própria.</p>
      </header>
      {uploadedSource ? (
        <div className="tw:flex tw:min-h-[6.615rem] tw:w-full tw:items-center tw:gap-5 tw:rounded-[0.923rem] tw:border tw:border-solid tw:border-cali-brand/16 tw:bg-cali-paper tw:px-5 tw:py-2.5 tw:workspace-night:bg-cali-burgundy-strong">
          <ProfileSignatureImage source={uploadedSource} />
          <button type="button" className="tw:cursor-pointer tw:border-0 tw:bg-transparent tw:text-cali-brand tw:underline tw:workspace-night:text-cali-gold-line" onClick={onUseName}>Usar meu nome digitado</button>
        </div>
      ) : (
        <label className="tw:grid tw:w-full tw:gap-2.5 tw:text-cali-body/[inherit] tw:font-bold tw:text-cali-brand tw:workspace-night:text-cali-paper">
          <span>Nome para assinatura</span>
          <Input variant="embedded"
            className="tw:h-25 tw:w-full tw:rounded-[0.923rem]! tw:border-cali-brand/22! tw:bg-cali-paper! tw:px-5.5! tw:py-2.5! tw:text-[clamp(2.308rem,4vw,3.538rem)]/[1.1]! tw:font-normal! tw:text-cali-brand! tw:[font-family:'Mrs_Saint_Delafield','Apple_Chancery',cursive]! tw:tracking-[0.01em] tw:placeholder:text-cali-sand-text tw:workspace-night:border-cali-sand-accent! tw:workspace-night:bg-cali-sand-soft! tw:[@media(max-width:43.75rem)]:h-23 tw:[@media(max-width:43.75rem)]:text-cali-display-lg/[1.1]!"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="Digite seu nome"
            autoComplete="name"
          />
        </label>
      )}
      <label className="tw:mt-4.5 tw:mb-3 tw:inline-flex tw:cursor-pointer tw:items-center tw:gap-2 tw:rounded-lg tw:border tw:border-solid tw:border-cali-line-strong tw:bg-cali-neutral-surface tw:px-3.5 tw:py-2.5 tw:text-cali-body/[inherit] tw:text-cali-red-strong tw:focus-within:outline-2 tw:focus-within:outline-offset-2 tw:focus-within:outline-cali-gold">
        <Upload size={14} />Prefiro enviar uma assinatura em imagem
        <input className="tw:sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={onUpload} />
      </label>
      <small className="tw:block tw:text-cali-body/[1.45] tw:text-cali-neutral-text tw:workspace-night:text-cali-neutral-line">
        Esta é sua identidade visual. A ciência de documentos e relatórios é confirmada separadamente.
      </small>
    </section>
  );
}
