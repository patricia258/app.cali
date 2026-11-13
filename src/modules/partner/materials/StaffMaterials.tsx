import { StaffDialogBody, StaffDialogFields, StaffDialogFooter, StaffDialogForm, StaffDialogHeader } from '../../../components/workspace/StaffDialog';
import { Button } from '../../../components/ds/Button';
import { InlineNotice } from '../../../components/ds/InlineNotice';
import { useEffect, useState, type FormEvent } from 'react';
import { readAssignedMaterials, submitMaterialReview, type MaterialReview } from '../../../api/materials/reviews';
import { materialReviewCard, materialStatus, materialText } from '../../material-review/material-review';

export function StaffMaterials() {
  const [items, setItems] = useState<MaterialReview[]>([]);
  const [selected, setSelected] = useState<MaterialReview | null>(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    setItems(await readAssignedMaterials());
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
    if (!selected || busy) return;
    setBusy(true);
    setError('');
    try {
      await submitMaterialReview(selected, draft);
      setSelected(null);
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível enviar o material.'); }
    finally { setBusy(false); }
  }

  return <section className="wf">
    <div className="wf-head"><div><h1>Materiais</h1><p>Rascunhos atribuídos para revisão da Patrícia.</p></div></div>
    {error && !selected && <InlineNotice as="p" role="alert">{error}</InlineNotice>}
    {items.length ? <ul className="tw:list-none tw:p-0">{items.map((item) => <li className={`${materialReviewCard} tw:grid tw:gap-[8px]`} key={item.id}>
      <strong>{item.title}</strong><span>{materialStatus[item.status]}</span>
      {item.decision_note && <p>{item.decision_note}</p>}
      {['assigned','returned'].includes(item.status) && <Button className="tw:[justify-self:start]" variant="workflowSecondary" type="button" onClick={() => edit(item)}>Preparar material</Button>}
    </li>)}</ul> : <p>Nenhum material atribuído.</p>}
    {selected && <div className="wf-overlay"><StaffDialogForm aria-label={selected.title} onSubmit={submit}>
      <StaffDialogHeader><h2>{selected.title}</h2></StaffDialogHeader>
      <StaffDialogBody>
        {selected.decision_note && <p>{selected.decision_note}</p>}
        <StaffDialogFields columns={1}><label>{materialText[selected.kind]}<textarea required minLength={5} maxLength={12000} rows={10} value={draft} onChange={(event) => setDraft(event.target.value)} /></label></StaffDialogFields>
        {error && <p role="alert">{error}</p>}
      </StaffDialogBody>
      <StaffDialogFooter>
        <Button variant="workflowSecondary" type="button" disabled={busy} onClick={() => setSelected(null)}>Cancelar</Button>
        <Button variant="workflowPrimary" type="submit" disabled={busy || draft.trim().length < 5}>Enviar para revisão</Button>
      </StaffDialogFooter>
    </StaffDialogForm></div>}
  </section>;
}
