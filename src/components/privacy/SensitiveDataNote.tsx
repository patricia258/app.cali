/* Orientação da Política de Privacidade (15/10/2026): documentos clínicos não entram no Workspace.
   Aparece junto dos campos livres e anexos que o cliente usa. */
import { ShieldAlert } from 'lucide-react';

export function SensitiveDataNote() {
  return (
    <p className="v2-sensitive-note tw:mx-0 tw:mt-[0.462rem] tw:mb-0 tw:flex tw:items-center tw:gap-[0.462rem] tw:font-cali-body tw:text-[0.846rem]/[1.4] tw:font-normal tw:text-[#8a7a80]">
      <ShieldAlert className="tw:shrink-0 tw:text-[#b0893f]" size={13} aria-hidden="true" />
      Não inclua atestados, laudos, diagnósticos, CID ou exames. Para temas de saúde, fale com a CALI.
    </p>
  );
}
