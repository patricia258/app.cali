import { DialogForm } from '../../../components/ds/DialogForm';
import { Button } from '../../../components/ds/Button';
import { InlineNotice } from '../../../components/ds/InlineNotice';
import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '../../../api/supabase';
import { materialReviewColumns, materialStatus, materialText, type MaterialReview } from '../../material-review/material-review';
import '../../material-review/material-review.css';

export function StaffMaterials() {
  const [items, setItems] = useState<MaterialReview[]>([]);
  const [selected, setSelected] = useState<MaterialReview | null>(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!supabase) return;
    const { data, error: requestError } = await supabase.from('partner_material_reviews')
      .select(materialReviewColumns).order('updated_at', { ascending: false });
    if (requestError) throw new Error(requestError.message);
    setItems((data ?? []) as MaterialReview[]);
  }
  useEffect(() => {
    const refresh = () => void load().catch((reason) => setError(reason.message));
    refresh();
    window.addEventListener('cali:staff-refresh', refresh);
    return () => window.removeEventListener('cali:staff-refresh', refresh);
  }, []);

  function edit(item: MaterialReview) {
    setSelected(item);
    setDraft(item.draft_text ?? item.context);
    setError('');
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !selected || busy) return;
    setBusy(true);
    setError('');
    try {
      const { error: requestError } = await supabase.rpc('submit_partner_material_review', {
        p_id: selected.id, p_revision: selected.revision, p_text: draft.trim(),
      });
      if (requestError) throw new Error(requestError.message);
      setSelected(null);
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível enviar o material.'); }
    finally { setBusy(false); }
  }

  return <section className="wf">
    <div className="wf-head"><div><h1>Materiais</h1><p>Rascunhos atribuídos para revisão da Patrícia.</p></div></div>
    {error && !selected && <InlineNotice as="p" role="alert">{error}</InlineNotice>}
    {items.length ? <ul className="material-review-items">{items.map((item) => <li key={item.id}>
      <strong>{item.title}</strong><span>{materialStatus[item.status]}</span>
      {item.decision_note && <p>{item.decision_note}</p>}
      {['assigned','returned'].includes(item.status) && <Button variant="workflowSecondary" type="button" onClick={() => edit(item)}>Preparar material</Button>}
    </li>)}</ul> : <p>Nenhum material atribuído.</p>}
    {selected && <div className="wf-overlay"><DialogForm className="wf-modal v2-staff-form" aria-label={selected.title} onSubmit={submit}>
      <header><h2>{selected.title}</h2></header>
      <div className="v2-staff-body">
        {selected.decision_note && <p>{selected.decision_note}</p>}
        <label>{materialText[selected.kind]}<textarea required minLength={5} maxLength={12000} rows={10} value={draft} onChange={(event) => setDraft(event.target.value)} /></label>
        {error && <p role="alert">{error}</p>}
      </div>
      <footer>
        <Button variant="workflowSecondary" type="button" disabled={busy} onClick={() => setSelected(null)}>Cancelar</Button>
        <Button variant="workflowPrimary" type="submit" disabled={busy || draft.trim().length < 5}>Enviar para revisão</Button>
      </footer>
    </DialogForm></div>}
  </section>;
}
