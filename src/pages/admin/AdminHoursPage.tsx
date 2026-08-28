import { useEffect, useMemo, useState } from 'react';
import { Pause, Play, Square, TimerReset } from 'lucide-react';
import { Progress, Shell } from '../../components/WorkspaceShell';
import { demoDeliverables, demoTimeEntries } from '../../data/demo';

function formatTimer(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return [hours, minutes, secs].map((value) => String(value).padStart(2, '0')).join(':');
}

export function AdminHoursPage() {
  const [taskId, setTaskId] = useState(demoDeliverables[1].id);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [lastMessage, setLastMessage] = useState('');

  const task = useMemo(() => demoDeliverables.find((item) => item.id === taskId) ?? demoDeliverables[0], [taskId]);

  useEffect(() => {
    if (!running || paused) return;
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [running, paused]);

  function start() {
    setRunning(true); setPaused(false); setLastMessage('');
  }

  function stop() {
    setRunning(false); setPaused(false);
    setLastMessage(`${formatTimer(elapsed)} registrados em “${task.title}”.`);
    setElapsed(0);
  }

  return (
    <Shell role="admin">
      <section className="page">
        <div className="eyebrow">TEMPO DE EXECUÇÃO</div>
        <div className="page-heading"><div><h1>Horas</h1><p>Registre o tempo no contexto do trabalho e acompanhe o consumo de cada ciclo antes que o limite vire uma surpresa para você ou para o cliente.</p></div></div>

        <section className={`timer-card ${running ? 'running' : ''}`}>
          <div className="timer-icon"><TimerReset size={26} /></div>
          <div className="timer-task">
            <span>TAREFA ATUAL</span>
            <select value={taskId} onChange={(event) => setTaskId(event.target.value)} disabled={running && !paused}>
              {demoDeliverables.map((item) => <option value={item.id} key={item.id}>Grupo Aurora · {item.title}</option>)}
            </select>
          </div>
          <strong className="timer-clock">{formatTimer(elapsed)}</strong>
          <div className="timer-actions">
            {!running && <button className="primary" onClick={start}><Play size={18} />Iniciar</button>}
            {running && <button className="secondary" onClick={() => setPaused((value) => !value)}>{paused ? <Play size={18} /> : <Pause size={18} />}{paused ? 'Retomar' : 'Pausar'}</button>}
            {running && <button className="stop-button" onClick={stop}><Square size={17} />Encerrar</button>}
          </div>
        </section>
        {lastMessage && <div className="inline-notice success">{lastMessage}</div>}

        <div className="kpi-grid hours-kpis">
          <article className="kpi"><span>Grupo Aurora</span><strong>81%</strong><small>24h10 de 30h</small><Progress value={81} /></article>
          <article className="kpi"><span>Novatech</span><strong>82%</strong><small>32h50 de 40h</small><Progress value={82} /></article>
          <article className="kpi"><span>Studio Norte</span><strong>57%</strong><small>11h25 de 20h</small><Progress value={57} /></article>
          <article className="kpi"><span>Alertas no ciclo</span><strong>2</strong><small>clientes acima de 70%</small></article>
        </div>

        <section className="panel hours-table-panel">
          <div className="panel-title"><div><span className="section-kicker">EXTRATO</span><h2>Registros recentes</h2></div><button className="secondary">Lançar hora manual</button></div>
          <div className="hours-table">
            <div className="hours-head admin-hours-head"><span>Data</span><span>Cliente / atividade</span><span>Tipo</span><span>Duração</span></div>
            {demoTimeEntries.map((entry) => (
              <div className="hours-line" key={entry.id}>
                <span>{entry.date}</span>
                <div><strong>Grupo Aurora · {entry.deliverable}</strong><small>{entry.description}</small></div>
                <span className="entry-type">{entry.type === 'manual' ? 'Manual' : entry.type === 'interaction' ? entry.channel ?? 'Interação' : 'Timer'}</span>
                <strong>{Math.floor(entry.minutes / 60)}h{String(entry.minutes % 60).padStart(2, '0')}</strong>
              </div>
            ))}
          </div>
        </section>
      </section>
    </Shell>
  );
}
