/* Orientação da Política de Privacidade (15/10/2026): documentos clínicos não entram no Workspace.
   Aparece junto dos campos livres e anexos que o cliente usa. */
import { ShieldAlert } from 'lucide-react';

export function SensitiveDataNote() {
  return <p className="v2-sensitive-note"><ShieldAlert size={13} aria-hidden="true" />Não inclua atestados, laudos, diagnósticos, CID ou exames. Para temas de saúde, fale com a CALI.</p>;
}
