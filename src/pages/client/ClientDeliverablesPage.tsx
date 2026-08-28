import { useMemo, useState } from 'react';
import { CheckCircle2, FileText, MessageSquareText, Star, X } from 'lucide-react';
import { Progress, Shell } from '../../components/WorkspaceShell';
import { demoDeliverables } from '../../data/demo';
import type { Deliverable, DeliverableStatus } from '../../domain/types';

const statusLabel: Record<DeliverableStatus, string> = {
  not_started: 'Não iniciado',
  in_progress: 'Em andamento',
  internal_review: 'Revisão CALI',
  client_review: 'Aguardando sua validação',
  adjustment_requested: 'Ajuste solicitado',
  approved: 'Aprovado',
  cancelled: 'Cancelado',
};

export function ClientDeliverablesPage() {
  const [items, setItems] = useState<Deliverable[]>(demoDeliverables);
  const [selectedId, setSelectedId] = useState(items.find((item) => item.status === 'client_review')?.id ?? items[0].id);
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [adjustmentText, setAdjustmentText] = useState('');
  const [npsOpen, setNpsOpen] = useState(false);
  const [score, setScore] = useState(0);
  const [npsComment, setNpsComment] = useState('');
  const [message, setMessage] = useState('');

  const selected = useMemo(() => items.find((item) => item.id === selectedId) ?? items[0], [items, selectedId]);
  const npsCommentRequired = score > 0 && score <= 3;

  function updateStatus(id: string, status: DeliverableStatus) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, status } : item)));
  }

  function submitAdjustment() {
    if (!adjustmentText.trim()) return;
    updateStatus(selected.id, 'adjustment_requested');
    setMessage('Seu pedido de ajuste foi registrado e a CALI já consegue vê-lo no contexto deste entregável.');
    setAdjustmentOpen(false);
    setAdjustmentText('');
  }

  function approveDeliverable() {
    setNpsOpen(true);
    setMessage('');
  }

  function submitNps() {
    if (score === 0 || (npsCommentRequired && !npsComment.trim())) return;
    updateStatus(selected.id, 'approved');
    setNpsOpen(false);
    setMessage('Entregável aprovado. Sua avaliação também foi registrada.');
    setScore(0);
    setNpsComment('');
  }

  return (
    <Shell role="client">
      <section className="page">
        <div className="eyebrow">PROJETO · CICLO 01</div>
        <div className="page-heading">
          <div>
            <h1>Entregáveis</h1>
            <p>Acompanhe o que está em andamento e valide as entregas quando a CALI sinalizar que estão prontas.</p>
          </div>
        </div>

        {message && <div className="inline-notice success"><CheckCircle2 size={19} />{message}</div>}

        <div className="workspace-split">
          <section className="panel compact-list">
            <div className="panel-title">
              <div><span className="section-kicker">CICLO ATUAL</span><h2>Estruturação People</h2></div>
              <span className="count">{items.length}</span>
            </div>
            {items.map((item) => (
              <button key={item.id} className={`deliverable-select ${selected.id === item.id ? 'selected' : ''}`} onClick={() => setSelectedId(item.id)}>
                <div>
                  <span className="deliverable-code">{item.code}</span>
                  <strong>{item.title}</strong>
                  <small className={item.status === 'client_review' ? 'needs-action' : ''}>{statusLabel[item.status]}</small>
                </div>
                <span>{item.dueLabel}</span>
              </button>
            ))}
          </section>

          <section className="panel deliverable-detail">
            <div className="detail-topline">
              <span className="deliverable-code">{selected.code}</span>
              <span className={`status-pill ${selected.status === 'client_review' ? 'action' : ''}`}>{statusLabel[selected.status]}</span>
            </div>
            <h2>{selected.title}</h2>
            <p className="detail-description">{selected.description}</p>

            <div className="detail-meta-grid">
              <div><span>Frente</span><strong>{selected.workstream}</strong></div>
              <div><span>Prazo</span><strong>{selected.dueLabel}</strong></div>
              <div><span>Horas registradas</span><strong>{selected.hours.toFixed(1)}h</strong></div>
              <div><span>Andamento</span><strong>{selected.progress}%</strong></div>
            </div>
            <Progress value={selected.progress} />

            {selected.isDocument && (
              <div className="document-preview-row">
                <FileText size={21} />
                <div><strong>Documento principal</strong><span>Versão preparada para leitura e validação</span></div>
                <button className="ghost">Abrir</button>
              </div>
            )}

            <div className="context-block">
              <MessageSquareText size={20} />
              <div><strong>Contexto da CALI</strong><p>Esta entrega organiza o que precisa ser acompanhado pela liderança sem transformar o RH em uma sequência de indicadores sem leitura executiva.</p></div>
            </div>

            {selected.status === 'client_review' && (
              <div className="review-actions">
                <button className="secondary" onClick={() => setAdjustmentOpen(true)}>Solicitar ajuste</button>
                <button className="primary" onClick={approveDeliverable}>Aprovar entrega</button>
              </div>
            )}

            {selected.status === 'adjustment_requested' && (
              <div className="inline-notice">A CALI recebeu seu pedido de ajuste. Quando a nova versão estiver pronta, este entregável volta para sua validação.</div>
            )}

            {selected.status === 'approved' && (
              <div className="inline-notice success"><CheckCircle2 size={19} />Entrega aprovada e incorporada ao histórico do projeto.</div>
            )}
          </section>
        </div>
      </section>

      {adjustmentOpen && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="adjustment-title">
            <button className="modal-close" onClick={() => setAdjustmentOpen(false)} aria-label="Fechar"><X size={20} /></button>
            <span className="section-kicker">SOLICITAR AJUSTE</span>
            <h2 id="adjustment-title">O que precisa ser revisto?</h2>
            <p>Descreva objetivamente o ponto que precisa mudar. A observação fica registrada neste entregável.</p>
            <textarea value={adjustmentText} onChange={(event) => setAdjustmentText(event.target.value)} placeholder="Ex.: precisamos separar o indicador por unidade antes da validação final." rows={5} />
            <div className="modal-actions">
              <button className="secondary" onClick={() => setAdjustmentOpen(false)}>Cancelar</button>
              <button className="primary" disabled={!adjustmentText.trim()} onClick={submitAdjustment}>Enviar ajuste</button>
            </div>
          </section>
        </div>
      )}

      {npsOpen && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="nps-title">
            <span className="section-kicker">SUA AVALIAÇÃO</span>
            <h2 id="nps-title">Como foi esta entrega?</h2>
            <p>A aprovação e a avaliação fazem parte do mesmo fechamento. Isso ajuda a CALI a acompanhar a qualidade de cada entrega, não apenas do projeto como um todo.</p>
            <div className="rating-row" aria-label="Avaliação de 1 a 5">
              {[1, 2, 3, 4, 5].map((value) => (
                <button key={value} className={score >= value ? 'selected' : ''} onClick={() => setScore(value)} aria-label={`${value} de 5`}>
                  <Star size={28} fill={score >= value ? 'currentColor' : 'none'} />
                </button>
              ))}
            </div>
            <label className="stacked-label">
              Comentário {npsCommentRequired ? 'obrigatório' : 'opcional'}
              <textarea value={npsComment} onChange={(event) => setNpsComment(event.target.value)} rows={4} placeholder={npsCommentRequired ? 'Conte o que não funcionou bem nesta entrega.' : 'Se quiser, deixe um comentário sobre a entrega.'} />
            </label>
            <button className="primary full" disabled={score === 0 || (npsCommentRequired && !npsComment.trim())} onClick={submitNps}>Confirmar aprovação e avaliação</button>
          </section>
        </div>
      )}
    </Shell>
  );
}
