import { Megaphone } from 'lucide-react';
import { Shell } from '../../components/WorkspaceShell';

/* Quadro de Avisos na composição aprovada. O aplicativo oficial ainda não possui origem de
   dados para comunicados; a página mostra esse estado, sem publicar exemplos. */
export function ClientNoticesPage() {
  return <Shell role="client">
    <div className="notice-page">
      <div className="notice-title"><div><small>ÁREA DA EMPRESA / COMUNICAÇÃO</small><h1>Quadro de Avisos<span>.</span></h1><p>Comunicados da parceria, datas importantes e informações de atendimento.</p></div></div>
      <div className="notice-toolbar"><div className="notice-filters"><button className="active" type="button">Todos</button></div><span>0 publicações</span></div>
      <div className="empty notice-empty"><Megaphone size={22} /><strong>Nenhum comunicado publicado.</strong><p>Quando a CALI publicar um aviso para a sua empresa, ele aparecerá aqui.</p></div>
    </div>
  </Shell>;
}
