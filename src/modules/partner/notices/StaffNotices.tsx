import { useEffect, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../../api/supabase';
import type { PartnerWorkspace } from '../../../api/partner/workspace';
import { StaffNoticesPage } from '../../shared/notices/NoticesBoard';
import { noticeCategories, noticeReviewColumns, noticeReviewStatus, type NoticeReview } from '../../shared/notices/notice-review';
import '../../shared/notices/notice-review.css';

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
    if (!supabase) return;
    const { data, error: requestError } = await supabase.from('partner_notice_reviews')
      .select(noticeReviewColumns).eq('author_id', me.id).order('submitted_at', { ascending: false });
    if (requestError) setError('Não foi possível carregar os comunicados em revisão.');
    else setReviews((data ?? []) as NoticeReview[]);
  }
  useEffect(() => { void load(); }, [me.id]);

  function open(review?: NoticeReview) {
    setDone('');
    setError('');
    setDraft(newDraft(review));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !draft || busy || !draft.companies.length) return;
    setBusy(true);
    setError('');
    try {
      const { error: requestError } = await supabase.rpc('submit_partner_notice_review', {
        p_request_id: draft.requestId, p_review_id: draft.id, p_revision: draft.revision,
        p_category: draft.category, p_title: draft.title, p_body: draft.body,
        p_companies: draft.companies, p_date: draft.date || null,
      });
      if (requestError) throw new Error(requestError.message);
      setDraft(null);
      setDone('Comunicado enviado para revisão da Patrícia.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível enviar o comunicado para revisão.');
    } finally { setBusy(false); }
  }

  return <div className="ap-app v2-admin-page v2-admin-notices"><div className="ap-content">
    {done && <p className="inline-notice success" role="status">{done}</p>}
    {error && !draft && <p className="inline-notice" role="alert">{error}</p>}
    {reviews.length > 0 && <section className="notice-review-panel">
      <h2>Meus comunicados</h2>
      <ul>{reviews.map((review) => <li key={review.id}>
        <strong>{review.title}</strong>
        <span>{noticeReviewStatus[review.status]}</span>
        {review.review_note && <p>{review.review_note}</p>}
        {review.status === 'returned' && <button type="button" className="wf-secondary" onClick={() => open(review)}>Ajustar comunicado</button>}
      </li>)}</ul>
    </section>}
    <StaffNoticesPage onCompose={() => open()} />
    {draft && <div className="wf-overlay"><form className="wf-modal v2-staff-form" role="dialog" aria-modal="true"
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
        {error && <p className="inline-notice" role="alert">{error}</p>}
      </div>
      <footer>
        <button type="button" className="wf-secondary" onClick={() => setDraft(null)} disabled={busy}>Cancelar</button>
        <button type="submit" className="wf-primary" disabled={busy || !draft.companies.length}>{busy ? 'Enviando…' : 'Enviar para revisão'}</button>
      </footer>
    </form></div>}
  </div></div>;
}
