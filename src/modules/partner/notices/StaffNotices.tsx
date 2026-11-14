import { WorkflowDialogOverlay } from '../../../components/ds/WorkflowDialog';
import { WorkspaceAdminPage } from '../../../components/workspace/components/WorkspaceAdminPage';
import { WorkspaceAdminContent } from '../../../components/workspace/components/WorkspaceAdminContent';
import { StaffDialogBody, StaffDialogFields, StaffDialogFooter, StaffDialogForm, StaffDialogHeader } from '../../../components/workspace/StaffDialog';
import { Button } from '../../../components/ds/Button';
import { InlineNotice } from '../../../components/ds/InlineNotice';
import { useEffect, useState, type FormEvent } from 'react';
import { readPartnerNoticeReviews, submitNoticeReview, type NoticeReview } from '../../../api/notices/reviews';
import type { PartnerWorkspace } from '../../../api/partner/workspace';
import { StaffNoticesPage } from '../../notices/NoticesBoard';
import { noticeCategories, noticeReviewStatus, noticeReviewStyles } from '../../notices/notice-review';

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

  return <WorkspaceAdminPage><WorkspaceAdminContent>
    {done && <InlineNotice as="p" tone="success" role="status">{done}</InlineNotice>}
    {error && !draft && <InlineNotice as="p" role="alert">{error}</InlineNotice>}
    {reviews.length > 0 && <section className={noticeReviewStyles.panel}>
      <h2 className={noticeReviewStyles.heading}>Meus comunicados</h2>
      <ul className={noticeReviewStyles.list}>{reviews.map((review) => <li className={noticeReviewStyles.item} key={review.id}>
        <strong>{review.title}</strong>
        <span>{noticeReviewStatus[review.status]}</span>
        {review.review_note && <p>{review.review_note}</p>}
        {review.status === 'returned' && <Button type="button" variant="workflowSecondary" onClick={() => open(review)}>Ajustar comunicado</Button>}
      </li>)}</ul>
    </section>}
    <StaffNoticesPage onCompose={() => open()} />
    {draft && <WorkflowDialogOverlay><StaffDialogForm
      aria-label={draft.id ? 'Ajustar comunicado' : 'Novo comunicado'} onSubmit={save}>
      <StaffDialogHeader onClose={() => setDraft(null)} disabled={busy}><h2>{draft.id ? 'Ajustar comunicado' : 'Novo comunicado'}</h2></StaffDialogHeader>
      <StaffDialogBody>
        <StaffDialogFields>
          <label>Tipo<select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>
            {noticeCategories.map(([id, label]) => <option value={id} key={id}>{label}</option>)}
          </select></label>
          <label>Data do aviso<input type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} /></label>
        </StaffDialogFields>
        <StaffDialogFields columns={1}>
          <label>Título<input value={draft.title} required maxLength={180} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
          <label>Mensagem<textarea rows={4} value={draft.body} required maxLength={5000} onChange={(event) => setDraft({ ...draft, body: event.target.value })} /></label>
        </StaffDialogFields>
        <fieldset><legend>Empresas</legend><div className="tw:grid tw:grid-cols-2 tw:gap-[.62rem] tw:[@media(max-width:860px)]:grid-cols-1 tw:[&>label]:flex tw:[&>label]:cursor-pointer tw:[&>label]:items-start tw:[&>label]:gap-[.69rem] tw:[&>label]:rounded-[.62rem] tw:[&>label]:border tw:[&>label]:border-solid tw:[&>label]:border-[#eadfd8] tw:[&>label]:bg-white tw:[&>label]:px-[.92rem] tw:[&>label]:py-[.77rem] tw:[&>label]:text-[.92rem] tw:[&>label]:text-[#322f2c] tw:[&>label:has(input:checked)]:border-cali-brand tw:[&>label:has(input:checked)]:bg-[#fbf5f6] tw:[&_input]:mx-0 tw:[&_input]:mt-[.15rem] tw:[&_input]:mb-0 tw:[&_input]:flex-none tw:[&_input]:accent-cali-brand">{me.companies.map((item) => <label key={item.id}>
          <input type="checkbox" checked={draft.companies.includes(item.id)} onChange={() => setDraft({ ...draft,
            companies: draft.companies.includes(item.id) ? draft.companies.filter((id) => id !== item.id) : [...draft.companies, item.id],
          })} /><span>{item.display_name}</span>
        </label>)}</div></fieldset>
        {error && <InlineNotice as="p" role="alert">{error}</InlineNotice>}
      </StaffDialogBody>
      <StaffDialogFooter>
        <Button type="button" variant="workflowSecondary" onClick={() => setDraft(null)} disabled={busy}>Cancelar</Button>
        <Button type="submit" variant="workflowPrimary" pending={busy} disabled={!draft.companies.length}>{busy ? 'Enviando…' : 'Enviar para revisão'}</Button>
      </StaffDialogFooter>
    </StaffDialogForm></WorkflowDialogOverlay>}
  </WorkspaceAdminContent></WorkspaceAdminPage>;
}
