import { Clock3, Info, MessageSquareText } from 'lucide-react';
import { Progress, Shell } from '../../components/WorkspaceShell';
import { demoCompany, demoTimeEntries } from '../../data/demo';

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h${String(mins).padStart(2, '0')}`;
}

export function ClientHoursPage() {
  return (
    <Shell role="client">
      <section className="page">
        <div className="eyebrow">TRANSPARÊNCIA DO SERVIÇO</div>
        <div className="page-heading">
          <div>
            <h1>Horas do ciclo</h1>
            <p>Veja como as horas contratadas estão sendo utilizadas nos projetos, entregas e interações relacionadas ao trabalho da CALI.</p>
          </div>
        </div>

        <section className="usage-hero">
          <div>
            <span>{demoCompany.cycle}</span>
            <strong>24h10 <small>de {demoCompany.contractedHours}h contratadas</small></strong>
            <Progress value={81} />
          </div>
          <div className="usage-balance"><span>Saldo do ciclo</span><strong>5h50</strong></div>
        </section>

        <div className="threshold-grid">
          {demoCompany.alertThresholds.map((threshold) => (
            <div key={threshold} className={`threshold ${threshold === 70 ? 'done' : threshold === 85 ? 'next' : ''}`}>
              <strong>{threshold}%</strong>
              <span>{threshold === 70 ? 'Aviso enviado' : threshold === 85 ? 'Próximo aviso' : 'Limite do ciclo'}</span>
            </div>
          ))}
        </div>

        <section className="panel hours-table-panel">
          <div className="panel-title">
            <div><span className="section-kicker">REGISTROS RECENTES</span><h2>Onde o tempo foi utilizado</h2></div>
          </div>
          <div className="hours-table">
            <div className="hours-head"><span>Data</span><span>Atividade</span><span>Tipo</span><span>Duração</span></div>
            {demoTimeEntries.map((entry) => (
              <div className="hours-line" key={entry.id}>
                <span>{entry.date}</span>
                <div><strong>{entry.deliverable}</strong><small>{entry.description}</small></div>
                <span className="entry-type">{entry.type === 'manual' ? 'Manual' : entry.type === 'interaction' ? entry.channel ?? 'Interação' : 'Timer'}</span>
                <strong>{formatMinutes(entry.minutes)}</strong>
              </div>
            ))}
          </div>
        </section>

        <div className="info-grid">
          <div className="context-block"><Info size={20} /><div><strong>Horas manuais</strong><p>Quando uma hora é lançada manualmente, você vê o registro e a duração. A justificativa operacional interna não é exibida.</p></div></div>
          <div className="context-block"><MessageSquareText size={20} /><div><strong>Interações externas</strong><p>Reuniões, ligações e outras interações podem aparecer no extrato quando fizerem parte do serviço e forem contabilizadas no ciclo.</p></div></div>
        </div>
      </section>
    </Shell>
  );
}
