import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '../../../api/supabase';
import { materialModule, materialReviewColumns, materialStatus, materialText, type MaterialKind, type MaterialReview } from './material-review';
import './material-review.css';

type Company = { id: string; display_name: string };
type Staff = { user_id: string | null; full_name: string; modules: string[]; active: boolean };

function Review({ kind, entityId, companyId }: { kind: MaterialKind; entityId: string; companyId?: string }) {
  const [target, setTarget] = useState(companyId ?? '');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [author, setAuthor] = useState('');
  const [record, setRecord] = useState<MaterialReview | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    if (!supabase) return;
    const { data, error: requestError } = await supabase.from('partner_material_reviews')
      .select(materialReviewColumns).eq('kind', kind).eq('entity_id', entityId).maybeSingle();
    if (requestError) throw new Error(requestError.message);
    const current = data as MaterialReview | null;
    setRecord(current);
    if (current) {
      setTarget(current.company_id);
      setAuthor(current.author_id);
    }
  }
  useEffect(() => {
    void load().catch((reason) => setError(reason.message));
    if (!supabase || companyId) return;
    void supabase.from('companies').select('id,display_name').in('status',['active','paused']).order('display_name')
      .then(({ data }) => setCompanies(data ?? []));
  }, [entityId, kind, companyId]);

  useEffect(() => {
    if (!supabase || !target) return;
    let active = true;
    setStaff([]);
    void supabase.from('staff_company_assignments').select('staff_members!inner(user_id,full_name,modules,active)')
      .eq('company_id',target).then(({ data, error: requestError }) => {
        if (!active) return;
        if (requestError) { setError('Não foi possível carregar os Partners.'); return; }
        const assigned = (data ?? []) as unknown as Array<{ staff_members: Staff }>;
        setStaff(assigned.map((item) => item.staff_members)
          .filter((item) => item.active && item.user_id && item.modules.includes(materialModule[kind])));
      });
    return () => { active = false; };
  }, [target, kind]);

  async function assign(event: FormEvent) {
    event.preventDefault();
    if (!supabase || busy || !author || !target) return;
    setBusy(true); setError('');
    try {
      const { error: requestError } = await supabase.rpc('assign_partner_material_review', {
        p_kind: kind, p_entity_id: entityId, p_company_id: target, p_author_id: author,
      });
      if (requestError) throw new Error(requestError.message);
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível atribuir o material.'); }
    finally { setBusy(false); }
  }

  async function decide(accept: boolean) {
    if (!supabase || !record || busy) return;
    setBusy(true); setError('');
    try {
      const { error: requestError } = await supabase.rpc('decide_partner_material_review', {
        p_id: record.id, p_revision: record.revision, p_accept: accept, p_note: accept ? null : note.trim(),
      });
      if (requestError) throw new Error(requestError.message);
      if (accept) window.location.reload();
      else { setNote(''); await load(); }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível revisar o material.'); }
    finally { setBusy(false); }
  }

  return <div className="material-review-content">
    {record && <p><strong>{materialStatus[record.status]}</strong></p>}
    {record?.status === 'pending' ? <>
      <h3>{materialText[kind]} para revisão</h3>
      <p className="material-review-text">{record.draft_text}</p>
      <label>Motivo da devolução<textarea value={note} maxLength={2000} onChange={(event) => setNote(event.target.value)} /></label>
      <div className="material-review-actions">
        <button type="button" className="wf-secondary" disabled={busy || note.trim().length < 3} onClick={() => void decide(false)}>Devolver para ajuste</button>
        <button type="button" className="wf-primary" disabled={busy} onClick={() => void decide(true)}>Aprovar e aplicar ao rascunho</button>
      </div>
    </> : <form onSubmit={assign}>
      {!companyId && <label>Empresa<select value={target} required onChange={(event) => { setTarget(event.target.value); setAuthor(''); }}>
        <option value="">Escolha a empresa</option>
        {companies.map((company) => <option value={company.id} key={company.id}>{company.display_name}</option>)}
      </select></label>}
      <label>Partner<select value={author} required onChange={(event) => setAuthor(event.target.value)}>
        <option value="">Escolha o responsável</option>
        {staff.map((person) => <option value={person.user_id ?? ''} key={person.user_id}>{person.full_name}</option>)}
      </select></label>
      <button className="wf-secondary" type="submit" disabled={busy || !target || !author}>Atribuir material</button>
    </form>}
    {error && <p role="alert">{error}</p>}
  </div>;
}

export function AdminMaterialReview(props: { kind: MaterialKind; entityId: string; companyId?: string }) {
  const [open, setOpen] = useState(false);
  return <details className="material-review" onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary>Preparação e revisão com Partner</summary>
    {open && <Review key={props.entityId} {...props} />}
  </details>;
}
