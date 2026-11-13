import { WorkflowPage } from '../../../components/ds/WorkflowPage';
import { WorkspaceAdminPage } from '../../../components/workspace/components/WorkspaceAdminPage';
import { WorkspaceAdminContent } from '../../../components/workspace/components/WorkspaceAdminContent';
import { WorkflowControls, WorkflowSegments } from '../../../components/ds/WorkflowControls';
import { WorkflowHeading } from '../../../components/ds/WorkflowHeading';
import { WorkflowGroupHeading } from '../../../components/ds/WorkflowGroupHeading';
import { WorkflowList, WorkflowListRow } from '../../../components/ds/WorkflowList';
import { WorkspaceConfirmDialog } from '../../../components/workspace/components/WorkspaceConfirmDialog';
import { WorkspaceDialogOverlay } from '../../../components/workspace/components/WorkspaceDialogOverlay';
import { FormDetail } from './components/FormDetail';
import { dateTime, errorText, type FormAdminTab } from './formDetails';
import { FormStatusBadge } from '../../../components/forms/FormStatusBadge';
/* CALI Forms — área da administradora (/admin/formularios). Lista de formulários; ao abrir um, três abas:
   Perguntas (montar e publicar), Compartilhar (link, QR Code e cartão) e Respostas (tabela e Excel).
   Nada aqui aparece para o cliente: a rota e o menu são só da administradora. */
import { Button } from '../../../components/ds/Button';
import { EmptyState } from '../../../components/ds/EmptyState';
import { InlineNotice } from '../../../components/ds/InlineNotice';
import { LoadingState } from '../../../components/ds/LoadingState';
import { useEffect, useState } from 'react';
import { useSearchParams } from '../../../hooks/useSearchParams';
import { ListChecks, Plus, RefreshCw } from 'lucide-react';
import { Shell } from '../../../components/workspace/WorkspaceShell';
import {
  createForm, readFormCatalog,
  restoreFormTrash, type FormTrashEntry as TrashRow,
} from '../../../api/forms/admin';
import { type FormAudience, type FormQuestion, type FormRecord, AUDIENCE_LABELS, CATEGORY_SUGGESTIONS, PUBLIC_FORM_BASE, STATUS_LABELS, newQuestion, questionId, slugify } from '../../forms/formModel';

type Overview = Record<string, { responses: number; last: string | null }>;
const TRASH_DAYS = 30;

const shortDate = (value?: string | null) => value ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(value)) : '—';

export function AdminFormsPage() {
  const [params, setParams] = useSearchParams();
  const openId = params.get('form');
  const tab = (params.get('aba') as FormAdminTab) || 'questions';
  const [forms, setForms] = useState<FormRecord[]>([]);
  const [overview, setOverview] = useState<Overview>({});
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState<{ title: string; category: string; audience: FormAudience; busy: boolean; error: string } | null>(null);
  const [audienceFilter, setAudienceFilter] = useState<'all' | FormAudience | 'trash'>('all');
  const [trash, setTrash] = useState<TrashRow[]>([]);
  const [restoring, setRestoring] = useState('');

  async function load() {
    setLoading(true); setError('');
    try {
      const catalog = await readFormCatalog();
      setForms(catalog.forms);
      setOverview(catalog.overview);
      setTrash(catalog.trash);
      setCompanies(catalog.companies);
    } catch (err) { setError(errorText(err, 'Não foi possível carregar os formulários.')); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  const open = forms.find((form) => form.id === openId) || null;
  const visible = audienceFilter === 'all' ? forms : forms.filter((form) => form.audience === audienceFilter);

  // Lixeira: formulário ou respostas excluídos ficam 30 dias e voltam com os mesmos dados (cali_forms_trash_restore).
  async function restore(item: TrashRow) {
    setRestoring(item.id); setError('');
    const { error: restoreError } = await restoreFormTrash(item.id);
    setRestoring('');
    if (restoreError) { setError(errorText(restoreError, 'Não foi possível restaurar.')); return; }
    setAudienceFilter('all'); await load();
  }
  const go = (id: string | null, nextTab: FormAdminTab = 'questions') => setParams(id ? { form: id, aba: nextTab } : {});

  async function create() {
    if (!creating) return;
    const title = creating.title.trim();
    if (!title) { setCreating({ ...creating, error: 'Dê um nome ao formulário.' }); return; }
    setCreating({ ...creating, busy: true, error: '' });
    const base = slugify(title) || 'formulario';
    const taken = new Set(forms.map((form) => form.slug));
    let slug = base.length >= 3 ? base : `${base}-form`; let n = 2;
    while (taken.has(slug)) slug = `${base}-${n++}`.slice(0, 60);
    const questions: FormQuestion[] = [newQuestion('name'), newQuestion('email')];
    const { data, error: insertError } = await createForm({ title, slug, questions, thank_you: '', category: creating.category.trim() || 'Formulário', audience: creating.audience });
    if (insertError || !data) { setCreating({ ...creating, title, busy: false, error: errorText(insertError, 'Não foi possível criar o formulário.') }); return; }
    setForms((current) => [data as FormRecord, ...current]); setCreating(null); go((data as FormRecord).id);
  }

  async function duplicate(form: FormRecord) {
    const taken = new Set(forms.map((item) => item.slug));
    let slug = `${form.slug}-copia`.slice(0, 60); let n = 2;
    while (taken.has(slug)) slug = `${form.slug}-copia-${n++}`.slice(0, 60);
    const { data, error: insertError } = await createForm({ title: `${form.title} (cópia)`.slice(0, 160), slug, description: form.description, thank_you: form.thank_you, company_id: form.company_id, category: form.category, audience: form.audience, stages: form.stages ?? null, submit_label: form.submit_label ?? null, success_text: form.success_text ?? null, confirm_email: form.confirm_email, questions: form.questions.map((question) => ({ ...question, id: questionId() })) });
    if (insertError || !data) { setError(errorText(insertError, 'Não foi possível duplicar.')); return; }
    setForms((current) => [data as FormRecord, ...current]); go((data as FormRecord).id);
  }

  return <Shell role="admin"><WorkspaceAdminPage className="v2-forms v2-client-module tw:[--fm-wine:#5a1e2d] tw:[--fm-line:#eadfd6] tw:[--fm-muted:#8c7e74]
    tw:[--fm-ink:#3e3533] tw:[&_.wf-head_.v2-head-actions_a]:no-underline tw:[&_label>span]:block
    tw:[&_label>span]:text-[0.846rem] tw:[&_label>span]:font-semibold tw:[&_label>span]:text-[color:var(--fm-ink)]
    tw:[&_label>span]:mb-[0.462rem] tw:[&_label>span_em]:not-italic tw:[&_label>span_em]:font-medium
    tw:[&_label>span_em]:text-[color:var(--fm-muted)] tw:[&_label>span_em]:ml-[0.308rem] tw:[&_:is(.v2-forms-grid,.v2-forms-q,.v2-forms-scale,.v2-forms-options)_:is(input:not([type=checkbox]),select,textarea)]:w-full
    tw:[&_:is(.v2-forms-grid,.v2-forms-q,.v2-forms-scale,.v2-forms-options)_:is(input:not([type=checkbox]),select,textarea)]:[border:1px_solid_#e3d6cc]
    tw:[&_:is(.v2-forms-grid,.v2-forms-q,.v2-forms-scale,.v2-forms-options)_:is(input:not([type=checkbox]),select,textarea)]:rounded-[0.615rem]
    tw:[&_:is(.v2-forms-grid,.v2-forms-q,.v2-forms-scale,.v2-forms-options)_:is(input:not([type=checkbox]),select,textarea)]:[padding:0.692rem_0.846rem]
    tw:[&_:is(.v2-forms-grid,.v2-forms-q,.v2-forms-scale,.v2-forms-options)_:is(input:not([type=checkbox]),select,textarea)]:[font:400_1rem/1.4_Inter,sans-serif]
    tw:[&_:is(.v2-forms-grid,.v2-forms-q,.v2-forms-scale,.v2-forms-options)_:is(input:not([type=checkbox]),select,textarea)]:text-[color:var(--fm-ink)]
    tw:[&_:is(.v2-forms-grid,.v2-forms-q,.v2-forms-scale,.v2-forms-options)_:is(input:not([type=checkbox]),select,textarea)]:bg-white
    tw:[&_textarea]:resize-y tw:[&_:is(input,select,textarea):focus]:outline-none tw:[&_:is(input,select,textarea):focus]:[border-color:var(--fm-wine)]
    tw:[&_:is(input,select,textarea):focus]:[box-shadow:0_0_0_0.231rem_rgba(90,30,45,.08)]"><WorkspaceAdminContent><WorkflowPage>
    {open ? <FormDetail key={open.id} form={open} tab={tab} companies={companies} stats={overview[open.id]} onTab={(next) => go(open.id, next)} onBack={() => { go(null); void load(); }} onDuplicate={() => void duplicate(open)}
      onSaved={(saved) => setForms((current) => current.map((item) => item.id === saved.id ? saved : item))}
      onDeleted={() => { setForms((current) => current.filter((item) => item.id !== open.id)); go(null); }} />
    : <>
      <WorkflowHeading><div><small>BACKOFFICE / CALI RH</small><h1>Formulários</h1><p>Pesquisas, questionários, inscrições, levantamentos: crie qualquer formulário com a identidade CALI, envie por link ou QR Code e veja as respostas reunidas aqui.</p></div>
        <div className="v2-head-actions tw:flex tw:flex-wrap tw:items-center tw:gap-[0.769rem]"><Button variant="formSecondary" type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={15} /> {loading ? 'Atualizando…' : 'Atualizar'}</Button><Button variant="workflowPrimary" type="button" onClick={() => setCreating({ title: '', category: '', audience: 'cali', busy: false, error: '' })}><Plus size={15} /> Novo formulário</Button></div></WorkflowHeading>
      {error && <InlineNotice role="alert">{error}</InlineNotice>}
      <WorkflowControls className="v2-forms-filter tw:[margin:0_0_0.462rem] tw:[&_.wf-segments_button_b]:ml-[0.385rem]
        tw:[&_.wf-segments_button_b]:font-bold tw:[&_.wf-segments_button_b]:opacity-[.6]"><WorkflowSegments>{([['all', 'Todos'], ['cali', AUDIENCE_LABELS.cali], ['client', AUDIENCE_LABELS.client], ['trash', 'Lixeira']] satisfies Array<['all' | FormAudience | 'trash', string]>).map(([key, label]) => <button type="button" key={key} className={audienceFilter === key ? 'on' : ''} onClick={() => setAudienceFilter(key)}>{label} <b>{key === 'all' ? forms.length : key === 'trash' ? trash.length : forms.filter((form) => form.audience === key).length}</b></button>)}</WorkflowSegments></WorkflowControls>
      {audienceFilter === 'trash' ? <>
        <WorkflowGroupHeading label="LIXEIRA" title={`Excluídos nos últimos ${TRASH_DAYS} dias`} count={trash.length} />
        {loading ? <LoadingState>Carregando…</LoadingState> : trash.length ? <WorkflowList className="v2-forms-list v2-forms-trash tw:[&_.wf-record-row]:gap-x-[1.538rem]! tw:[&_.wf-record-row]:pt-[1.231rem]!
          tw:[&_.wf-record-row]:pb-[1.231rem]! tw:[@media(max-width:760px)]:[&_.wf-record-row>span:nth-child(n+3)]:hidden!
          tw:[@media(max-width:760px)]:[&_.wf-record-row.header]:hidden! tw:[&_.wf-record-row]:grid-cols-[minmax(18.462rem,2fr)_minmax(13.077rem,1.2fr)_11.538rem_10.769rem_11.538rem]!
          tw:[&_.wf-record-row]:cursor-default tw:[&_.wf-record-row:not(.header):hover]:bg-transparent! tw:[@media(max-width:760px)]:[&_.wf-record-row]:grid-cols-[1fr_auto]!
          tw:[@media(max-width:760px)]:[&_.wf-record-row>span:nth-child(2)]:block! tw:[@media(max-width:760px)]:[&_.wf-record-row>span:nth-child(2)]:col-span-full
          tw:[@media(max-width:760px)]:[&_.wf-record-row>span:nth-child(2)]:order-[3] tw:[@media(max-width:760px)]:[&_.wf-record-row>span:nth-child(2)]:text-[0.923rem]
          tw:[@media(max-width:760px)]:[&_.wf-record-row>span:nth-child(5)]:flex!">
          <WorkflowListRow header><span>Formulário</span><span>O que foi excluído</span><span>Excluído em</span><span>Apagado de vez em</span><span /></WorkflowListRow>
          {trash.map((item) => <WorkflowListRow  key={item.id}>
            <span className="v2-forms-name tw:flex tw:flex-col tw:gap-[0.231rem] tw:min-w-0 tw:[&_strong]:text-[1rem] tw:[&_strong]:text-[color:var(--fm-ink)]
              tw:[&_strong]:overflow-hidden tw:[&_strong]:text-ellipsis tw:[&_strong]:whitespace-nowrap tw:[&_small]:text-[0.846rem]
              tw:[&_small]:text-[color:var(--fm-muted)] tw:[&_small]:overflow-hidden tw:[&_small]:text-ellipsis
              tw:[&_small]:whitespace-nowrap tw:[&_small]:mt-[0.154rem]"><strong>{item.form_title}</strong></span>
            <span>{item.kind === 'form' ? `Formulário e ${item.responses.length} ${item.responses.length === 1 ? 'resposta' : 'respostas'}` : `${item.responses.length} ${item.responses.length === 1 ? 'resposta' : 'respostas'}`}</span>
            <span>{dateTime(item.deleted_at)}</span>
            <span>{shortDate(new Date(new Date(item.deleted_at).getTime() + TRASH_DAYS * 86400000).toISOString())}</span>
            <span className="v2-forms-row-actions tw:flex tw:justify-end"><Button type="button" variant="formSecondary" disabled={Boolean(restoring)} onClick={() => void restore(item)}><RefreshCw size={14} /> {restoring === item.id ? 'Restaurando…' : 'Restaurar'}</Button></span>
          </WorkflowListRow>)}
        </WorkflowList> : <EmptyState variant="workflow"><strong>A lixeira está vazia.</strong><p>Formulários e respostas excluídos ficam aqui por {TRASH_DAYS} dias e podem ser restaurados.</p></EmptyState>}
      </> : <>
      <WorkflowGroupHeading label="FORMULÁRIOS" title={audienceFilter === 'all' ? 'Todos os formulários' : audienceFilter === 'cali' ? 'Formulários da CALI' : 'Formulários para clientes'} count={visible.length} />
      {loading ? <LoadingState>Carregando formulários…</LoadingState> : visible.length ? <WorkflowList className="v2-forms-list tw:[&_.wf-record-row]:grid-cols-[minmax(20rem,2.6fr)_minmax(8.462rem,.8fr)_minmax(13.077rem,1fr)_7.692rem_10rem_9.231rem_10.769rem]!
        tw:[&_.wf-record-row]:gap-x-[1.538rem]! tw:[&_.wf-record-row]:pt-[1.231rem]! tw:[&_.wf-record-row]:pb-[1.231rem]!
        tw:[&_.wf-record-row]:cursor-pointer tw:[&_.wf-record-row:not(.header):hover]:bg-[#fbf7f3]! tw:[@media(max-width:760px)]:[&_.wf-record-row]:grid-cols-[1fr_auto]!
        tw:[@media(max-width:760px)]:[&_.wf-record-row>span:nth-child(n+3)]:hidden! tw:[@media(max-width:760px)]:[&_.wf-record-row.header]:hidden!">
        <WorkflowListRow header><span>Formulário</span><span>Para quem</span><span>Situação</span><span>Respostas</span><span>Última resposta</span><span>Atualizado</span><span /></WorkflowListRow>
        {visible.map((form) => <WorkflowListRow  key={form.id} role="button" tabIndex={0} onClick={() => go(form.id)} onKeyDown={(event) => { if (event.key === 'Enter') go(form.id); }}>
          <span className="v2-forms-name tw:flex tw:flex-col tw:gap-[0.231rem] tw:min-w-0 tw:[&_strong]:text-[1rem] tw:[&_strong]:text-[color:var(--fm-ink)]
            tw:[&_strong]:overflow-hidden tw:[&_strong]:text-ellipsis tw:[&_strong]:whitespace-nowrap tw:[&_small]:text-[0.846rem]
            tw:[&_small]:text-[color:var(--fm-muted)] tw:[&_small]:overflow-hidden tw:[&_small]:text-ellipsis
            tw:[&_small]:whitespace-nowrap tw:[&_small]:mt-[0.154rem]"><strong>{form.title}</strong><small>{PUBLIC_FORM_BASE.replace('https://', '')}{form.slug}</small></span>
          <span><span className={`tw:inline-block tw:[padding:0.231rem_0.769rem] tw:rounded-full tw:text-[0.846rem] tw:font-bold tw:mr-[0.308rem] tw:[&.cali]:bg-[#f3e9ec] tw:[&.cali]:text-cali-brand tw:[&.client]:bg-[#e9f0f7] tw:[&.client]:text-[#2c5a85] v2-forms-aud ${form.audience}`}>{form.audience === 'client' ? (companies.find((company) => company.id === form.company_id)?.name || 'Cliente') : 'CALI'}</span></span>
          <span><FormStatusBadge status={form.status}>{STATUS_LABELS[form.status]}</FormStatusBadge></span>
          <span className="v2-forms-count tw:text-[1.077rem] tw:font-bold tw:text-[color:var(--fm-wine)]">{overview[form.id]?.responses || 0}</span>
          <span>{shortDate(overview[form.id]?.last)}</span>
          <span>{shortDate(form.updated_at)}</span>
          <span className="v2-forms-row-actions tw:flex tw:justify-end"><Button type="button" variant="formSecondary" onClick={(event) => { event.stopPropagation(); go(form.id, 'responses'); }}><ListChecks size={14} /> Respostas</Button></span>
        </WorkflowListRow>)}
      </WorkflowList> : <EmptyState variant="workflow"><strong>Nenhum formulário ainda.</strong><p>Clique em “Novo formulário” para criar o primeiro. Ele começa como rascunho: só recebe respostas depois que você abrir.</p></EmptyState>}
      </>}
    </>}
  </WorkflowPage></WorkspaceAdminContent>
  {creating && <WorkspaceDialogOverlay onMouseDown={(event) => { if (event.target === event.currentTarget && !creating.busy) setCreating(null); }}><WorkspaceConfirmDialog aria-label="Novo formulário">
    <div><small>CALI FORMS</small><h2>Novo formulário</h2><p>Começa como rascunho, já com as perguntas de nome e e-mail. Você monta o resto em seguida.</p></div>
    <label>Nome do formulário<input value={creating.title} maxLength={160} autoFocus placeholder="Ex.: Pesquisa de clima 2026" onChange={(event) => setCreating({ ...creating, title: event.target.value, error: '' })} onKeyDown={(event) => { if (event.key === 'Enter') void create(); }} /></label>
    <label>Categoria (aparece para quem responde)<input list="cali-form-categories" value={creating.category} maxLength={40} placeholder="Ex.: Pesquisa de satisfação" onChange={(event) => setCreating({ ...creating, category: event.target.value })} /></label>
    <label>Para quem<select value={creating.audience} onChange={(event) => setCreating({ ...creating, audience: event.target.value as FormAudience })}><option value="cali">Uso da CALI</option><option value="client">Clientes</option></select></label>
    <datalist id="cali-form-categories">{CATEGORY_SUGGESTIONS.map((item) => <option key={item} value={item} />)}</datalist>
    {creating.error && <p className="v2-forms-error tw:[margin:0_0_1.077rem] tw:[padding:0.769rem_1.077rem] tw:rounded-[0.692rem] tw:text-[0.923rem]
      tw:font-semibold tw:bg-[#fff6f4] tw:text-[#b42318] tw:[border:1px_solid_#f1c4bd]" role="alert">{creating.error}</p>}
    <footer><button type="button" disabled={creating.busy} onClick={() => setCreating(null)}>Cancelar</button><button type="button" disabled={creating.busy} onClick={() => void create()}>{creating.busy ? 'Criando…' : 'Criar formulário'}</button></footer>
  </WorkspaceConfirmDialog></WorkspaceDialogOverlay>}
  </WorkspaceAdminPage></Shell>;
}
