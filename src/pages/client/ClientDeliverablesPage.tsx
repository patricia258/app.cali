import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, FileText, Loader2, MessageSquareText, Star, X } from 'lucide-react';
import { Progress, Shell } from '../../components/WorkspaceShell';
import { demoDeliverables } from '../../data/demo';
import type { Deliverable, DeliverableStatus } from '../../domain/types';
import { supabase } from '../../lib/supabase';

type PublishedDocument = {
  id: string;
  title: string;
  storagePath?: string | null;
  driveUrl?: string | null;
};

type ClientDeliverable = Deliverable & {
  companyId: string;
  projectId?: string | null;
  projectName?: string;
  document?: PublishedDocument | null;
};

const statusLabel: Record<DeliverableStatus, string> = {
  not_started: 'Não iniciado',
  in_progress: 'Em andamento',
  standby: 'Em espera',
  internal_review: 'Revisão CALI',
  client_review: 'Aguardando sua validação',
  adjustment_requested: 'Ajuste solicitado',
  rebriefing: 'Em rebriefing',
  approved: 'Aprovado',
  cancelled: 'Cancelado',
};

const statusProgress: Record<DeliverableStatus, number> = {
  not_started: 0,
  in_progress: 48,
  standby: 30,
  internal_review: 78,
  client_review: 92,
  adjustment_requested: 68,
  rebriefing: 58,
  approved: 100,
  cancelled: 0,
};

function formatDate(value?: string | null) {
  if (!value) return 'Sem prazo definido';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sem prazo definido';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date).replace('.', '');
}

export function ClientDeliverablesPage() {
  const preview = sessionStorage.getItem('cali-preview-role') === 'client';
  const previewItems: ClientDeliverable[] = demoDeliverables.map((item) => ({ ...item, companyId: 'preview-aurora', projectName: 'Estruturação People' }));

  const [items, setItems] = useState<ClientDeliverable[]>(preview ? previewItems : []);
  const [selectedId, setSelectedId] = useState(previewItems.find((item) => item.status === 'client_review')?.id ?? previewItems[0]?.id ?? '');
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [adjustmentText, setAdjustmentText] = useState('');
  const [npsOpen, setNpsOpen] = useState(false);
  const [score, setScore] = useState(0);
  const [npsComment, setNpsComment] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(!preview);
  const [saving, setSaving] = useState(false);

  const selected = useMemo(() => items.find((item) => item.id === selectedId) ?? items[0], [items, selectedId]);
  const npsCommentRequired = score > 0 && score <= 3;

  useEffect(() => {
    if (preview || !supabase) return;
    void loadDeliverables();
  }, []);

  useEffect(() => {
    const modalOpen = adjustmentOpen || npsOpen;
    document.body.classList.toggle('workspace-modal-open', modalOpen);
    return () => document.body.classList.remove('workspace-modal-open');
  }, [adjustmentOpen, npsOpen]);

  async function loadDeliverables() {
    if (!supabase) return;
    setLoading(true);
    setError('');

    const [deliverableResult, projectResult, hourResult, fileResult] = await Promise.all([
      supabase.from('deliverables').select('id,company_id,project_id,protocol,code,title,description,status,workstream,due_at,is_document,client_visible,sort_order').eq('client_visible', true).neq('status', 'cancelled').order('sort_order'),
      supabase.from('projects').select('id,name,protocol'),
      supabase.from('hour_entries').select('deliverable_id,minutes'),
      supabase.from('files').select('id,deliverable_id,title,storage_path,drive_url,status,client_visible').eq('client_visible', true).eq('status', 'published').not('deliverable_id', 'is', null).order('updated_at', { ascending: false }),
    ]);

    if (deliverableResult.error) {
      setError(deliverableResult.error.message);
      setLoading(false);
      return;
    }

    const projectMap = new Map((projectResult.data || []).map((row) => [row.id, row.name]));
    const hoursMap = new Map<string, number>();
    if (!hourResult.error) {
      (hourResult.data || []).forEach((row) => hoursMap.set(row.deliverable_id, (hoursMap.get(row.deliverable_id) || 0) + Number(row.minutes || 0) / 60));
    }
    const documentMap = new Map<string, PublishedDocument>();
    if (!fileResult.error) {
      (fileResult.data || []).forEach((row) => {
        if (!row.deliverable_id || documentMap.has(row.deliverable_id)) return;
        documentMap.set(row.deliverable_id, { id: row.id, title: row.title, storagePath: row.storage_path, driveUrl: row.drive_url });
      });
    }

    const next: ClientDeliverable[] = (deliverableResult.data || []).map((row) => {
      const status = row.status as DeliverableStatus;
      return {
        id: row.id,
        companyId: row.company_id,
        projectId: row.project_id,
        projectName: row.project_id ? projectMap.get(row.project_id) : undefined,
        code: row.protocol || row.code || 'ENTREGÁVEL',
        title: row.title,
        description: row.description || 'Entrega em acompanhamento pela CALI.',
        workstream: row.workstream || 'Projeto',
        dueLabel: formatDate(row.due_at),
        hours: Number((hoursMap.get(row.id) || 0).toFixed(1)),
        progress: statusProgress[status] ?? 0,
        status,
        isDocument: Boolean(row.is_document),
        document: documentMap.get(row.id) || null,
      };
    });

    setItems(next);
    setSelectedId((current) => next.some((item) => item.id === current)
      ? current
      : next.find((item) => item.status === 'client_review')?.id || next[0]?.id || '');
    setLoading(false);
  }

  function approveDeliverable() {
    if (!selected || selected.status !== 'client_review') return;
    setNpsOpen(true);
    setMessage('');
    setError('');
  }

  async function submitAdjustment() {
    if (!selected || !adjustmentText.trim()) return;
    setSaving(true);
    setError('');

    if (preview || !supabase) {
      setItems((current) => current.map((item) => item.id === selected.id ? { ...item, status: 'adjustment_requested', progress: statusProgress.adjustment_requested } : item));
      setMessage('Seu pedido de ajuste foi registrado e a CALI já consegue vê-lo no contexto deste entregável.');
      setAdjustmentOpen(false);
      setAdjustmentText('');
      setSaving(false);
      return;
    }

    const { error: adjustmentError } = await supabase.rpc('request_deliverable_adjustment', {
      p_deliverable_id: selected.id,
      p_reason: adjustmentText.trim(),
      p_impact_business_days: 0,
    });

    if (adjustmentError) {
      setError(adjustmentError.message);
      setSaving(false);
      return;
    }

    setMessage('Seu pedido de ajuste foi registrado e a CALI já consegue vê-lo no contexto deste entregável.');
    setAdjustmentOpen(false);
    setAdjustmentText('');
    await loadDeliverables();
    setSaving(false);
  }

  async function submitNps() {
    if (!selected || score === 0 || (npsCommentRequired && !npsComment.trim())) return;
    setSaving(true);
    setError('');

    if (preview || !supabase) {
      setItems((current) => current.map((item) => item.id === selected.id ? { ...item, status: 'approved', progress: 100 } : item));
      setNpsOpen(false);
      setMessage('Entregável aprovado. Sua avaliação também foi registrada.');
      setScore(0);
      setNpsComment('');
      setSaving(false);
      return;
    }

    const { error: approvalError } = await supabase.rpc('client_approve_deliverable_with_feedback', {
      p_deliverable_id: selected.id,
      p_score: score,
      p_comment: npsComment.trim() || null,
    });

    if (approvalError) {
      setError(approvalError.message);
      setSaving(false);
      return;
    }

    setNpsOpen(false);
    setMessage(selected.isDocument
      ? 'Entregável aprovado. Sua avaliação foi registrada e o documento passou para a etapa de finalização da CALI.'
      : 'Entregável aprovado. Sua avaliação também foi registrada.');
    setScore(0);
    setNpsComment('');
    await loadDeliverables();
    setSaving(false);
  }

  async function openPublishedDocument(document: PublishedDocument) {
    if (preview || !supabase) return;
    if (document.storagePath) {
      const { data, error: signedError } = await supabase.storage.from('cali-workspace-private').createSignedUrl(document.storagePath, 300);
      if (signedError || !data?.signedUrl) {
        setError(signedError?.message || 'Não foi possível abrir o documento.');
        return;
      }
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    if (document.driveUrl) window.open(document.driveUrl, '_blank', 'noopener,noreferrer');
  }

  return (
    <Shell role="client">
      <section className="page client-deliverables-live">
        <div className="eyebrow">PROJETO · {selected?.projectName || 'CICLO ATUAL'}</div>
        <div className="page-heading">
          <div>
            <h1>Entregáveis</h1>
            <p>Acompanhe o que está em andamento e valide as entregas quando a CALI sinalizar que estão prontas.</p>
          </div>
        </div>

        {message && <div className="inline-notice success"><CheckCircle2 size={19} />{message}</div>}
        {error && <div className="inline-notice">{error}</div>}
        {loading && <div className="data-loading"><Loader2 className="spin" size={20} />Carregando entregáveis…</div>}

        {!loading && !selected && <section className="panel data-empty"><strong>Nenhum entregável disponível.</strong><span>Quando a CALI disponibilizar uma entrega para acompanhamento, ela aparecerá aqui.</span></section>}

        {!loading && selected && (
          <div className="workspace-split">
            <section className="panel compact-list">
              <div className="panel-title">
                <div><span className="section-kicker">PROJETO ATUAL</span><h2>{selected.projectName || 'Entregas CALI'}</h2></div>
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
                  <div>
                    <strong>{selected.document ? 'Documento final disponível' : selected.status === 'approved' ? 'Documento em finalização' : 'Documento vinculado à entrega'}</strong>
                    <span>{selected.document ? 'A versão publicada pela CALI já está disponível na sua Biblioteca.' : selected.status === 'approved' ? 'A entrega foi aprovada e agora a CALI prepara o arquivo final para publicação.' : 'O registro já está separado para este projeto. O arquivo final não é publicado automaticamente.'}</span>
                  </div>
                  {selected.document ? <button className="ghost" onClick={() => void openPublishedDocument(selected.document!)}>Abrir</button> : <span className="status-soft">Em preparação</span>}
                </div>
              )}

              <div className="context-block">
                <MessageSquareText size={20} />
                <div><strong>Contexto da CALI</strong><p>A validação desta entrega encerra o ciclo de revisão. Quando houver documento final, ele seguirá separado na Biblioteca da sua empresa.</p></div>
              </div>

              {selected.status === 'client_review' && (
                <div className="review-actions">
                  <button className="secondary" onClick={() => { setAdjustmentOpen(true); setError(''); }}>Solicitar ajuste</button>
                  <button className="primary" onClick={approveDeliverable}>Aprovar entrega</button>
                </div>
              )}

              {selected.status === 'adjustment_requested' && <div className="inline-notice">A CALI recebeu seu pedido de ajuste. Quando a nova versão estiver pronta, este entregável volta para sua validação.</div>}
              {selected.status === 'rebriefing' && <div className="inline-notice">Este entregável entrou em rebriefing. A CALI está reorganizando o escopo antes de uma nova validação.</div>}
              {selected.status === 'approved' && <div className="inline-notice success"><CheckCircle2 size={19} />Entrega aprovada e incorporada ao histórico do projeto.</div>}
            </section>
          </div>
        )}
      </section>

      {adjustmentOpen && selected && (
        <div className="modal-backdrop workspace-modal-backdrop" role="presentation">
          <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="adjustment-title">
            <button className="modal-close" onClick={() => setAdjustmentOpen(false)} aria-label="Fechar"><X size={20} /></button>
            <span className="section-kicker">SOLICITAR AJUSTE</span>
            <h2 id="adjustment-title">O que precisa ser revisto?</h2>
            <p>Descreva objetivamente o ponto que precisa mudar. A observação fica registrada neste entregável.</p>
            <textarea value={adjustmentText} onChange={(event) => setAdjustmentText(event.target.value)} placeholder="Ex.: precisamos separar o indicador por unidade antes da validação final." rows={5} />
            <div className="modal-actions">
              <button className="secondary" onClick={() => setAdjustmentOpen(false)}>Cancelar</button>
              <button className="primary" disabled={saving || !adjustmentText.trim()} onClick={() => void submitAdjustment()}>{saving ? 'Registrando…' : 'Enviar ajuste'}</button>
            </div>
          </section>
        </div>
      )}

      {npsOpen && selected && (
        <div className="modal-backdrop workspace-modal-backdrop" role="presentation">
          <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="nps-title">
            <span className="section-kicker">SUA AVALIAÇÃO</span>
            <h2 id="nps-title">Como foi esta entrega?</h2>
            <p>A aprovação e a avaliação fazem parte do mesmo fechamento. Notas de 1 a 3 precisam de contexto para a CALI entender o que deve ser revisto.</p>
            <div className="rating-row" aria-label="Avaliação de 1 a 5">
              {[1, 2, 3, 4, 5].map((value) => (
                <button key={value} type="button" className={score >= value ? 'selected' : ''} onClick={() => setScore(value)} aria-label={`${value} de 5`}>
                  <Star size={28} fill={score >= value ? 'currentColor' : 'none'} />
                </button>
              ))}
            </div>
            <label className="stacked-label">
              Comentário {npsCommentRequired ? 'obrigatório' : 'opcional'}
              <textarea value={npsComment} onChange={(event) => setNpsComment(event.target.value)} rows={4} placeholder={npsCommentRequired ? 'Conte o que não funcionou bem nesta entrega.' : 'Se quiser, deixe um comentário sobre a entrega.'} />
            </label>
            <button className="primary full" disabled={saving || score === 0 || (npsCommentRequired && !npsComment.trim())} onClick={() => void submitNps()}>{saving ? 'Confirmando…' : 'Confirmar aprovação e avaliação'}</button>
          </section>
        </div>
      )}
    </Shell>
  );
}
