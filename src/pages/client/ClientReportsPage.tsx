import { useState } from 'react';
import { CheckCircle2, Cloud, FileText } from 'lucide-react';
import { Shell } from '../../components/WorkspaceShell';

export function ClientReportsPage() {
  const [acknowledged, setAcknowledged] = useState(false);

  return (
    <Shell role="client">
      <section className="page">
        <div className="eyebrow">LEITURA EXECUTIVA</div>
        <div className="page-heading">
          <div>
            <h1>Relatórios</h1>
            <p>O fechamento do período reúne o que foi executado e a leitura da CALI sobre decisões, riscos e próximos movimentos.</p>
          </div>
        </div>

        <div className="report-layout">
          <aside className="panel report-list-card">
            <span className="section-kicker">DISPONÍVEIS</span>
            <button className="report-list-item selected">
              <FileText size={20} />
              <div><strong>Relatório Executivo</strong><span>Agosto 2026 · publicado</span></div>
            </button>
            <button className="report-list-item">
              <FileText size={20} />
              <div><strong>Relatório Executivo</strong><span>Julho 2026 · histórico</span></div>
            </button>
          </aside>

          <article className="panel report-document">
            <div className="report-cover-line"><div><span>CALI RH · RELATÓRIO EXECUTIVO</span><strong>Grupo Aurora</strong></div><span>Agosto · 2026</span></div>
            <h2>O que este ciclo colocou em movimento</h2>
            <p>O período avançou na organização da governança de People e na definição de indicadores que possam ser usados pela liderança para tomar decisão, e não apenas para acompanhar rotina.</p>

            <section><span className="section-kicker">MOVIMENTOS DO PERÍODO</span><ul><li>Estrutura inicial de indicadores de People concluída e enviada para validação.</li><li>Ritual de gestão com lideranças em construção, com definição de pauta e cadência.</li><li>Matriz de responsabilidades do RH iniciada a partir dos pontos de decisão identificados no ciclo.</li></ul></section>
            <section><span className="section-kicker">DECISÕES E VALIDAÇÕES</span><p>A priorização dos indicadores foi mantida antes da ampliação do escopo. O próximo passo depende da validação do recorte por unidade.</p></section>
            <section><span className="section-kicker">PONTO DE ATENÇÃO</span><p>O consumo de horas chegou a 81% do ciclo. A CALI seguirá priorizando o que tem maior impacto na estruturação atual antes de abrir novas frentes.</p></section>
            <section><span className="section-kicker">PRÓXIMO CICLO</span><p>Concluir a matriz de responsabilidades, validar o ritual de gestão e transformar os indicadores aprovados em uma rotina de leitura executiva.</p></section>

            <div className="report-actions">
              <button className="secondary"><Cloud size={18} />Salvar no Google Drive</button>
              <button className="secondary"><FileText size={18} />Abrir versão em PDF</button>
              <button className="primary" disabled={acknowledged} onClick={() => setAcknowledged(true)}>{acknowledged ? <><CheckCircle2 size={18} />Ciência registrada</> : 'Li e estou ciente'}</button>
            </div>
            <p className="report-footnote">A conexão com Google Drive será liberada por conta. O cliente escolhe o Drive da própria empresa; a CALI mantém o arquivamento do Workspace em paralelo.</p>
          </article>
        </div>
      </section>
    </Shell>
  );
}
