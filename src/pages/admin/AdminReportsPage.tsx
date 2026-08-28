import { useState } from 'react';
import { CheckCircle2, FileText, Sparkles } from 'lucide-react';
import { Shell } from '../../components/WorkspaceShell';

export function AdminReportsPage() {
  const [generated, setGenerated] = useState(false);
  const [summary, setSummary] = useState('O período avançou na organização da governança de People e na definição de indicadores que possam apoiar a liderança nas decisões do ciclo.');
  const [risk, setRisk] = useState('O consumo de horas chegou a 81% do ciclo. Antes de abrir novas frentes, é importante concluir as prioridades já em execução.');
  const [next, setNext] = useState('Concluir a matriz de responsabilidades, validar o ritual de gestão e transformar os indicadores aprovados em uma rotina de leitura executiva.');

  return (
    <Shell role="admin">
      <section className="page">
        <div className="eyebrow">FECHAMENTO DO CICLO</div>
        <div className="page-heading">
          <div><h1>Relatórios</h1><p>O Workspace reúne os fatos do período. Você revisa, interpreta e define o que realmente precisa chegar ao decisor.</p></div>
          <button className="primary" onClick={() => setGenerated(true)}><Sparkles size={18} />Gerar rascunho do período</button>
        </div>

        <div className="report-builder-layout">
          <aside className="panel source-signals">
            <span className="section-kicker">DADOS DO PERÍODO</span>
            <h2>O que será usado</h2>
            <div><strong>4 entregáveis</strong><span>1 em validação · 2 em andamento · 1 não iniciado</span></div>
            <div><strong>24h10 registradas</strong><span>81% do ciclo de 30h</span></div>
            <div><strong>2 reuniões</strong><span>reunião mensal + validação de indicadores</span></div>
            <div><strong>3 avaliações</strong><span>NPS médio 4,9</span></div>
            <div><strong>1 decisão pendente</strong><span>recorte dos indicadores por unidade</span></div>
          </aside>

          <section className="panel report-editor">
            {!generated ? (
              <div className="empty-state report-empty"><FileText size={34} /><h2>Rascunho ainda não gerado</h2><p>Ao gerar, o sistema organiza os dados do ciclo sem publicar nada para o cliente. A leitura final continua sendo sua.</p></div>
            ) : (
              <>
                <div className="inline-notice success"><CheckCircle2 size={19} />Rascunho montado a partir dos registros do Workspace. Revise antes de publicar.</div>
                <label className="stacked-label">Leitura executiva<textarea rows={5} value={summary} onChange={(event) => setSummary(event.target.value)} /></label>
                <label className="stacked-label">Ponto de atenção<textarea rows={4} value={risk} onChange={(event) => setRisk(event.target.value)} /></label>
                <label className="stacked-label">Próximo ciclo<textarea rows={4} value={next} onChange={(event) => setNext(event.target.value)} /></label>
                <div className="auto-block"><span className="section-kicker">MOVIMENTOS DO PERÍODO</span><ul><li>Indicadores de People concluídos e enviados para validação.</li><li>Ritual de gestão com lideranças em construção.</li><li>Matriz de responsabilidades iniciada.</li></ul></div>
                <div className="modal-actions report-editor-actions"><button className="secondary">Salvar rascunho</button><button className="primary">Revisar publicação</button></div>
              </>
            )}
          </section>
        </div>
      </section>
    </Shell>
  );
}
