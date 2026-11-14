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
    <section className="tw:m-0 tw:flex tw:w-full tw:flex-col tw:items-start tw:gap-[1.077rem] tw:rounded-[1.231rem] tw:border tw:border-solid tw:border-[#b58c5240] tw:bg-[#fffdfa] tw:p-[1.615rem] tw:workspace-night:border-[#f7f3ee21] tw:workspace-night:bg-[#271c21]">
      <header className="tw:mb-[1.154rem]">
        <h3 className="tw:mb-[0.154rem]! tw:text-[1.538rem]/[inherit]! tw:text-[#51202f]! tw:workspace-night:text-[#fff8f1]!">Assinatura</h3>
        <p className="tw:m-0 tw:text-[0.923rem]/[inherit]! tw:text-[#665b58]! tw:workspace-night:text-[#d8cbc6]!">Use seu nome ou envie uma imagem própria.</p>
      </header>
      {uploadedSource ? (
        <div className="tw:flex tw:min-h-[6.615rem] tw:w-full tw:items-center tw:gap-[1.231rem] tw:rounded-[0.923rem] tw:border tw:border-solid tw:border-[#5a1e2d29] tw:bg-[#fffdfa] tw:px-[1.231rem] tw:py-[0.615rem] tw:workspace-night:bg-[#302326]">
          <ProfileSignatureImage source={uploadedSource} />
          <button type="button" className="tw:cursor-pointer tw:border-0 tw:bg-transparent tw:text-cali-brand tw:underline tw:workspace-night:text-[#ead1ae]" onClick={onUseName}>Usar meu nome digitado</button>
        </div>
      ) : (
        <label className="tw:grid tw:w-full tw:gap-[0.615rem] tw:text-[0.923rem]/[inherit] tw:font-bold tw:text-cali-brand tw:workspace-night:text-[#fff8f1]">
          <span>Nome para assinatura</span>
          <input
            className="tw:h-[6.308rem] tw:w-full tw:rounded-[0.923rem]! tw:border-[#5a1e2d38]! tw:bg-[#fffdfa]! tw:px-[1.385rem]! tw:py-[0.615rem]! tw:text-[clamp(2.308rem,4vw,3.538rem)]/[1.1]! tw:font-normal! tw:text-cali-brand! tw:[font-family:'Mrs_Saint_Delafield','Apple_Chancery',cursive]! tw:tracking-[0.01em] tw:placeholder:text-[#a48b89] tw:workspace-night:border-[#cdbfae]! tw:workspace-night:bg-[#f9f5f0]! tw:[@media(max-width:43.75rem)]:h-[5.692rem] tw:[@media(max-width:43.75rem)]:text-[2.769rem]/[1.1]!"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="Digite seu nome"
            autoComplete="name"
          />
        </label>
      )}
      <label className="tw:mt-[1.077rem] tw:mb-[0.769rem] tw:inline-flex tw:cursor-pointer tw:items-center tw:gap-[0.462rem] tw:rounded-[0.538rem] tw:border tw:border-solid tw:border-[#ded0c7] tw:bg-white tw:px-[0.846rem] tw:py-[0.615rem] tw:text-[0.923rem]/[inherit] tw:text-[#6b3448] tw:focus-within:outline-2 tw:focus-within:outline-offset-2 tw:focus-within:outline-cali-gold">
        <Upload size={14} />Prefiro enviar uma assinatura em imagem
        <input className="tw:sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={onUpload} />
      </label>
      <small className="tw:block tw:text-[0.923rem]/[1.45] tw:text-[#61575a] tw:workspace-night:text-[#ddd0c8]">
        Esta é sua identidade visual. A ciência de documentos e relatórios é confirmada separadamente.
      </small>
    </section>
  );
}
