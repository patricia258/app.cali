import { CalendarDays, CheckCircle2, Clock3 } from 'lucide-react';
import { Shell } from '../../components/WorkspaceShell';

export function ClientTimelinePage() {
  const steps = [
    { date: '19 ago', title: 'Início do ciclo', text: 'Cronograma aprovado e trabalho iniciado.', state: 'done' },
    { date: '28 ago', title: 'Indicadores de People', text: 'Entrega concluída e aguardando sua validação.', state: 'current' },
    { date: '03 set', title: 'Validação de indicadores', text: 'Reunião compartilhada · 14:00.', state: 'next' },
    { date: '08 set', title: 'Ritual de gestão', text: 'Previsão de entrega da primeira versão.', state: 'next' },
    { date: '18 set', title: 'Fechamento do ciclo', text: 'Consolidação e preparação do próximo ciclo.', state: 'next' },
  ];

  return (
    <Shell role="client">
      <section className="page">
        <div className="eyebrow">CRONOGRAMA COMPARTILHADO</div>
        <div className="page-heading"><div><h1>O que vem agora</h1><p>Marcos do projeto, entregas previstas e compromissos que dependem da CALI ou da sua empresa.</p></div></div>
        <section className="panel timeline-panel">
          {steps.map((step) => (
            <div className={`timeline-row ${step.state}`} key={`${step.date}-${step.title}`}>
              <div className="timeline-marker">{step.state === 'done' ? <CheckCircle2 size={20} /> : step.state === 'current' ? <Clock3 size={20} /> : <CalendarDays size={20} />}</div>
              <div className="timeline-date">{step.date}</div>
              <div><strong>{step.title}</strong><p>{step.text}</p></div>
            </div>
          ))}
        </section>
      </section>
    </Shell>
  );
}
