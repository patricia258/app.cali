import { DialogForm } from '../../../components/ds/DialogForm';
import { Button } from '../../../components/ds/Button';
import { InlineNotice } from '../../../components/ds/InlineNotice';
import { useEffect, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { readPartnerNoticeReviews, submitNoticeReview, type NoticeReview } from '../../../api/notices/reviews';
import type { PartnerWorkspace } from '../../../api/partner/workspace';
import { StaffNoticesPage } from '../../notices/NoticesBoard';
import { noticeCategories, noticeReviewStatus } from '../../notices/notice-review';
import '../../notices/notice-review.css';

function newDraft(review?: NoticeReview) {
  return {
    id: review?.id ?? null,
    revision: review?.revision ?? null,
    requestId: crypto.randomUUID(),
    category: review?.category ?? 'comunicado',
    title: review?.title ?? '',
    body: review?.body ?? '',
    date: review?.notice_date ?? '',
    companies: review?.company_ids ?? [],
  };
}

export function StaffNotices({ me }: { me: PartnerWorkspace }) {
  const [draft, setDraft] = useState<ReturnType<typeof newDraft> | null>(null);
  const [reviews, setReviews] = useState<NoticeReview[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  async function load() {
    try {
      setReviews(await readPartnerNoticeReviews(me.id));
    } catch {
      setError('Não foi possível carregar os comunicados em revisão.');
    }
  }
  useEffect(() => { void load(); }, [me.id]);

  function open(review?: NoticeReview) {
    setDone('');
    setError('');
    setDraft(newDraft(review));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft || busy || !draft.companies.length) return;
    setBusy(true);
    setError('');
    try {
      await submitNoticeReview(draft);
      setDraft(null);
      setDone('Comunicado enviado para revisão da Patrícia.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível enviar o comunicado para revisão.');
    } finally { setBusy(false); }
  }

  return <div className="ap-app v2-admin-page v2-admin-notices"><div className="ap-content">
    {done && <InlineNotice as="p" tone="success" role="status">{done}</InlineNotice>}
    {error && !draft && <InlineNotice as="p" role="alert">{error}</InlineNotice>}
    {reviews.length > 0 && <section className="notice-review-panel">
      <h2>Meus comunicados</h2>
      <ul>{reviews.map((review) => <li key={review.id}>
        <strong>{review.title}</strong>
        <span>{noticeReviewStatus[review.status]}</span>
        {review.review_note && <p>{review.review_note}</p>}
        {review.status === 'returned' && <Button type="button" variant="workflowSecondary" onClick={() => open(review)}>Ajustar comunicado</Button>}
      </li>)}</ul>
    </section>}
    <StaffNoticesPage onCompose={() => open()} />
    {draft && <div className="wf-overlay"><DialogForm className="wf-modal v2-staff-form"
      aria-label={draft.id ? 'Ajustar comunicado' : 'Novo comunicado'} onSubmit={save}>
      <header><h2>{draft.id ? 'Ajustar comunicado' : 'Novo comunicado'}</h2>
        <button type="button" onClick={() => setDraft(null)} aria-label="Fechar" disabled={busy}><X size={16} /></button></header>
      <div className="v2-staff-body">
        <div className="v2-staff-fields">
          <label>Tipo<select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>
            {noticeCategories.map(([id, label]) => <option value={id} key={id}>{label}</option>)}
          </select></label>
          <label>Data do aviso<input type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} /></label>
        </div>
        <div className="v2-staff-fields one">
          <label>Título<input value={draft.title} required maxLength={180} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
          <label>Mensagem<textarea rows={4} value={draft.body} required maxLength={5000} onChange={(event) => setDraft({ ...draft, body: event.target.value })} /></label>
        </div>
        <fieldset><legend>Empresas</legend><div className="v2-staff-checks">{me.companies.map((item) => <label key={item.id}>
          <input type="checkbox" checked={draft.companies.includes(item.id)} onChange={() => setDraft({ ...draft,
            companies: draft.companies.includes(item.id) ? draft.companies.filter((id) => id !== item.id) : [...draft.companies, item.id],
          })} /><span>{item.display_name}</span>
        </label>)}</div></fieldset>
        {error && <InlineNotice as="p" role="alert">{error}</InlineNotice>}
      </div>
      <footer>
        <Button type="button" variant="workflowSecondary" onClick={() => setDraft(null)} disabled={busy}>Cancelar</Button>
        <Button type="submit" variant="workflowPrimary" pending={busy} disabled={!draft.companies.length}>{busy ? 'Enviando…' : 'Enviar para revisão'}</Button>
      </footer>
    </DialogForm></div>}
  </div></div>;
}
