import { Button } from '../../components/ds/Button';
import { useEffect, useState, type FormEvent } from 'react';
import { assignMaterialReview, decideMaterialReview, readMaterialCompanies, readMaterialPartners, readMaterialReview, type MaterialKind, type MaterialReview } from '../../api/materials/reviews';
import { materialReviewCard, materialStatus, materialText } from './material-review';

type Company = { id: string; display_name: string };
type Staff = { user_id: string | null; full_name: string; modules: string[]; active: boolean };

type ReviewProps = {
  kind: MaterialKind;
  entityId: string;
  companyId?: string;
  onApproved: () => void | Promise<void>;
};

function Review({ kind, entityId, companyId, onApproved }: ReviewProps) {
  const [target, setTarget] = useState(companyId ?? '');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [author, setAuthor] = useState('');
  const [record, setRecord] = useState<MaterialReview | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const current = await readMaterialReview(kind, entityId);
    setRecord(current);
    if (current) {
      setTarget(current.company_id);
      setAuthor(current.author_id);
    }
  }
  useEffect(() => {
    void load().catch((reason) => setError(reason.message));
    if (!companyId) void readMaterialCompanies().then(setCompanies);
  }, [entityId, kind, companyId]);

  useEffect(() => {
    if (!target) return;
    let active = true;
    setStaff([]);
    void readMaterialPartners(target, kind).then(
      (assigned) => { if (active) setStaff(assigned); },
      () => { if (active) setError('Não foi possível carregar os Partners.'); },
    );
    return () => { active = false; };
  }, [target, kind]);

  async function assign(event: FormEvent) {
    event.preventDefault();
    if (busy || !author || !target) return;
    setBusy(true); setError('');
    try {
      await assignMaterialReview(kind, entityId, target, author);
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível atribuir o material.'); }
    finally { setBusy(false); }
  }

  async function decide(accept: boolean) {
    if (!record || busy) return;
    setBusy(true); setError('');
    try {
      await decideMaterialReview(record, accept, note);
      setNote('');
      if (accept) await Promise.all([load(), onApproved()]);
      else await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível revisar o material.'); }
    finally { setBusy(false); }
  }

  return <div className="tw:mt-[12px] tw:grid tw:gap-[8px]">
    {record && <p><strong>{materialStatus[record.status]}</strong></p>}
    {record?.status === 'pending' ? <>
      <h3>{materialText[kind]} para revisão</h3>
      <p className="tw:whitespace-pre-wrap">{record.draft_text}</p>
      <label className="tw:grid tw:gap-[8px]">Motivo da devolução<textarea className="tw:w-full" value={note} maxLength={2000} onChange={(event) => setNote(event.target.value)} /></label>
      <div className="tw:flex tw:flex-wrap tw:gap-[8px]">
        <Button className="tw:[justify-self:start]" type="button" variant="workflowSecondary" disabled={busy || note.trim().length < 3} onClick={() => void decide(false)}>Devolver para ajuste</Button>
        <Button className="tw:[justify-self:start]" type="button" variant="workflowPrimary" disabled={busy} onClick={() => void decide(true)}>Aprovar e aplicar ao rascunho</Button>
      </div>
    </> : <form className="tw:grid tw:gap-[8px]" onSubmit={assign}>
      {!companyId && <label className="tw:grid tw:gap-[8px]">Empresa<select className="tw:w-full" value={target} required onChange={(event) => { setTarget(event.target.value); setAuthor(''); }}>
        <option value="">Escolha a empresa</option>
        {companies.map((company) => <option value={company.id} key={company.id}>{company.display_name}</option>)}
      </select></label>}
      <label className="tw:grid tw:gap-[8px]">Partner<select className="tw:w-full" value={author} required onChange={(event) => setAuthor(event.target.value)}>
        <option value="">Escolha o responsável</option>
        {staff.map((person) => <option value={person.user_id ?? ''} key={person.user_id}>{person.full_name}</option>)}
      </select></label>
      <Button className="tw:[justify-self:start]" variant="workflowSecondary" type="submit" disabled={busy || !target || !author}>Atribuir material</Button>
    </form>}
    {error && <p role="alert">{error}</p>}
  </div>;
}

export function AdminMaterialReview(props: ReviewProps) {
  const [open, setOpen] = useState(false);
  return <details className={materialReviewCard} onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary className="tw:cursor-pointer tw:font-bold">Preparação e revisão com Partner</summary>
    {open && <Review key={props.entityId} {...props} />}
  </details>;
}
