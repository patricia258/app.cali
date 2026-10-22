/* CALI Forms — área da administradora (/admin/formularios). Lista de formulários; ao abrir um, três abas:
   Perguntas (montar e publicar), Compartilhar (link, QR Code e cartão) e Respostas (tabela e Excel).
   Nada aqui aparece para o cliente: a rota e o menu são só da administradora. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowLeft, ArrowUp, Bold, Check, Copy, Italic, Paperclip, Pencil, Smile, Underline, Download, ExternalLink, FileSpreadsheet, ListChecks, Plus, QrCode, RefreshCw, Search, Trash2 } from 'lucide-react';
import { Shell } from '../components/WorkspaceShell';
import { supabase } from '../lib/supabase';
import { downloadQrPng, downloadShareCard, downloadXlsx, qrDataUrl } from './formExports';
import { type FormAudience, type FormQuestion, type FormRecord, type QuestionKind, AUDIENCE_LABELS, CATEGORY_SUGGESTIONS, KIND_LABELS, KIND_ORDER, PUBLIC_FORM_BASE, STATUS_LABELS, END_OF_FORM, choiceOptions, fileLabel, formatAnswer, isAnswerable, stripRichText, newQuestion, questionId, slugify } from './formModel';
import './admin-forms.css';

type Overview = Record<string, { responses: number; last: string | null }>;
type ResponseRow = { id: string; answers: Record<string, unknown>; respondent_name: string | null; respondent_email: string | null; submitted_at: string; confirmation_sent_at: string | null; contacted_at: string | null; admin_note: string | null };
type Tab = 'questions' | 'share' | 'responses';

const FORM_FIELDS = 'id,slug,title,description,thank_you,status,company_id,questions,confirm_email,category,audience,created_at,updated_at';
const EMOJIS = ['😊', '🙂', '🙏', '💬', '✨', '🌱', '🍂', '💡', '📌', '✅', '📝', '📊', '🤝', '❤️', '👏', '🎯', '⏱️', '🔒', '📅', '👉'];
const dateTime = (value?: string | null) => value ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '—';
const shortDate = (value?: string | null) => value ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(value)) : '—';
const errorText = (err: unknown, fallback: string) => {
  const message = err instanceof Error ? err.message : String((err as { message?: string })?.message || '');
  if (/duplicate key|forms_slug_key/.test(message)) return 'Este link já está em uso por outro formulário. Escolha outro.';
  if (/forms_slug_check/.test(message)) return 'O link só pode ter letras minúsculas, números e hífens (3 a 60 caracteres).';
  return message || fallback;
};

export function AdminFormsPage() {
  const [params, setParams] = useSearchParams();
  const openId = params.get('form');
  const tab = (params.get('aba') as Tab) || 'questions';
  const [forms, setForms] = useState<FormRecord[]>([]);
  const [overview, setOverview] = useState<Overview>({});
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState<{ title: string; category: string; audience: FormAudience; busy: boolean; error: string } | null>(null);
  const [audienceFilter, setAudienceFilter] = useState<'all' | FormAudience>('all');

  async function load() {
    if (!supabase) return;
    setLoading(true); setError('');
    try {
      const [list, counts, companyRows] = await Promise.all([
        supabase.from('forms').select(FORM_FIELDS).order('updated_at', { ascending: false }),
        supabase.rpc('admin_form_overview'),
        supabase.from('companies').select('id,display_name,status').order('display_name'),
      ]);
      if (list.error) throw list.error;
      setForms((list.data || []) as FormRecord[]);
      setOverview(Object.fromEntries(((counts.data || []) as Array<{ form_id: string; responses: number; last_response: string | null }>).map((row) => [row.form_id, { responses: Number(row.responses), last: row.last_response }])));
      setCompanies(((companyRows.data || []) as Array<{ id: string; display_name: string; status: string }>).filter((row) => row.status !== 'archived').map((row) => ({ id: row.id, name: row.display_name })));
    } catch (err) { setError(errorText(err, 'Não foi possível carregar os formulários.')); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  const open = forms.find((form) => form.id === openId) || null;
  const visible = audienceFilter === 'all' ? forms : forms.filter((form) => form.audience === audienceFilter);
  const go = (id: string | null, nextTab: Tab = 'questions') => setParams(id ? { form: id, aba: nextTab } : {});

  async function create() {
    if (!supabase || !creating) return;
    const title = creating.title.trim();
    if (!title) { setCreating({ ...creating, error: 'Dê um nome ao formulário.' }); return; }
    setCreating({ ...creating, busy: true, error: '' });
    const base = slugify(title) || 'formulario';
    const taken = new Set(forms.map((form) => form.slug));
    let slug = base.length >= 3 ? base : `${base}-form`; let n = 2;
    while (taken.has(slug)) slug = `${base}-${n++}`.slice(0, 60);
    const questions: FormQuestion[] = [newQuestion('name'), newQuestion('email')];
    const { data, error: insertError } = await supabase.from('forms').insert({ title, slug, questions, thank_you: '', category: creating.category.trim() || 'Formulário', audience: creating.audience }).select(FORM_FIELDS).single();
    if (insertError || !data) { setCreating({ ...creating, title, busy: false, error: errorText(insertError, 'Não foi possível criar o formulário.') }); return; }
    setForms((current) => [data as FormRecord, ...current]); setCreating(null); go((data as FormRecord).id);
  }

  async function duplicate(form: FormRecord) {
    if (!supabase) return;
    const taken = new Set(forms.map((item) => item.slug));
    let slug = `${form.slug}-copia`.slice(0, 60); let n = 2;
    while (taken.has(slug)) slug = `${form.slug}-copia-${n++}`.slice(0, 60);
    const { data, error: insertError } = await supabase.from('forms').insert({ title: `${form.title} (cópia)`.slice(0, 160), slug, description: form.description, thank_you: form.thank_you, company_id: form.company_id, category: form.category, audience: form.audience, confirm_email: form.confirm_email, questions: form.questions.map((question) => ({ ...question, id: questionId() })) }).select(FORM_FIELDS).single();
    if (insertError || !data) { setError(errorText(insertError, 'Não foi possível duplicar.')); return; }
    setForms((current) => [data as FormRecord, ...current]); go((data as FormRecord).id);
  }

  return <Shell role="admin"><div className="ap-app v2-admin-page v2-forms v2-client-module"><div className="ap-content"><div className="wf">
    {open ? <FormDetail key={open.id} form={open} tab={tab} companies={companies} stats={overview[open.id]} onTab={(next) => go(open.id, next)} onBack={() => { go(null); void load(); }} onDuplicate={() => void duplicate(open)}
      onSaved={(saved) => setForms((current) => current.map((item) => item.id === saved.id ? saved : item))}
      onDeleted={() => { setForms((current) => current.filter((item) => item.id !== open.id)); go(null); }} />
    : <>
      <div className="wf-head"><div><small>BACKOFFICE / CALI RH</small><h1>Formulários</h1><p>Pesquisas, questionários, inscrições, levantamentos: crie qualquer formulário com a identidade CALI, envie por link ou QR Code e veja as respostas reunidas aqui.</p></div>
        <div className="v2-head-actions"><button className="wf-secondary" type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={15} /> {loading ? 'Atualizando…' : 'Atualizar'}</button><button className="wf-primary" type="button" onClick={() => setCreating({ title: '', category: '', audience: 'cali', busy: false, error: '' })}><Plus size={15} /> Novo formulário</button></div></div>
      {error && <div className="inline-notice" role="alert">{error}</div>}
      <div className="wf-controls v2-forms-filter"><div className="wf-segments">{([['all', 'Todos'], ['cali', AUDIENCE_LABELS.cali], ['client', AUDIENCE_LABELS.client]] as Array<['all' | FormAudience, string]>).map(([key, label]) => <button type="button" key={key} className={audienceFilter === key ? 'on' : ''} onClick={() => setAudienceFilter(key)}>{label} <b>{key === 'all' ? forms.length : forms.filter((form) => form.audience === key).length}</b></button>)}</div></div>
      <div className="wf-group-head"><div><span>FORMULÁRIOS</span><strong>{audienceFilter === 'all' ? 'Todos os formulários' : audienceFilter === 'cali' ? 'Formulários da CALI' : 'Formulários para clientes'}</strong></div><b>{visible.length}</b></div>
      {loading ? <div className="data-loading">Carregando formulários…</div> : visible.length ? <div className="wf-records v2-forms-list">
        <div className="wf-record-row header"><span>Formulário</span><span>Para quem</span><span>Situação</span><span>Respostas</span><span>Última resposta</span><span>Atualizado</span><span /></div>
        {visible.map((form) => <div className="wf-record-row" key={form.id} role="button" tabIndex={0} onClick={() => go(form.id)} onKeyDown={(event) => { if (event.key === 'Enter') go(form.id); }}>
          <span className="v2-forms-name"><strong>{form.title}</strong><small>{PUBLIC_FORM_BASE.replace('https://', '')}{form.slug}</small></span>
          <span><span className={`v2-forms-aud ${form.audience}`}>{form.audience === 'client' ? (companies.find((company) => company.id === form.company_id)?.name || 'Cliente') : 'CALI'}</span></span>
          <span><span className={`v2-forms-status ${form.status}`}>{STATUS_LABELS[form.status]}</span></span>
          <span className="v2-forms-count">{overview[form.id]?.responses || 0}</span>
          <span>{shortDate(overview[form.id]?.last)}</span>
          <span>{shortDate(form.updated_at)}</span>
          <span className="v2-forms-row-actions"><button type="button" className="wf-secondary" onClick={(event) => { event.stopPropagation(); go(form.id, 'responses'); }}><ListChecks size={14} /> Respostas</button></span>
        </div>)}
      </div> : <div className="wf-empty"><strong>Nenhum formulário ainda.</strong><p>Clique em “Novo formulário” para criar o primeiro. Ele começa como rascunho: só recebe respostas depois que você abrir.</p></div>}
    </>}
  </div></div>
  {creating && <div className="ap-pd-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !creating.busy) setCreating(null); }}><section className="ap-status-confirm" role="dialog" aria-modal="true" aria-label="Novo formulário">
    <div><small>CALI FORMS</small><h2>Novo formulário</h2><p>Começa como rascunho, já com as perguntas de nome e e-mail. Você monta o resto em seguida.</p></div>
    <label>Nome do formulário<input value={creating.title} maxLength={160} autoFocus placeholder="Ex.: Pesquisa de clima 2026" onChange={(event) => setCreating({ ...creating, title: event.target.value, error: '' })} onKeyDown={(event) => { if (event.key === 'Enter') void create(); }} /></label>
    <label>Categoria (aparece para quem responde)<input list="cali-form-categories" value={creating.category} maxLength={40} placeholder="Ex.: Pesquisa de satisfação" onChange={(event) => setCreating({ ...creating, category: event.target.value })} /></label>
    <label>Para quem<select value={creating.audience} onChange={(event) => setCreating({ ...creating, audience: event.target.value as FormAudience })}><option value="cali">Uso da CALI</option><option value="client">Clientes</option></select></label>
    <datalist id="cali-form-categories">{CATEGORY_SUGGESTIONS.map((item) => <option key={item} value={item} />)}</datalist>
    {creating.error && <p className="v2-forms-error" role="alert">{creating.error}</p>}
    <footer><button type="button" disabled={creating.busy} onClick={() => setCreating(null)}>Cancelar</button><button type="button" disabled={creating.busy} onClick={() => void create()}>{creating.busy ? 'Criando…' : 'Criar formulário'}</button></footer>
  </section></div>}
  </div></Shell>;
}

function FormDetail({ form, tab, companies, stats, onTab, onBack, onDuplicate, onSaved, onDeleted }: { form: FormRecord; tab: Tab; companies: Array<{ id: string; name: string }>; stats?: { responses: number; last: string | null }; onTab: (tab: Tab) => void; onBack: () => void; onDuplicate: () => void; onSaved: (form: FormRecord) => void; onDeleted: () => void }) {
  const [draft, setDraft] = useState<FormRecord>(form);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<{ text: string; failed?: boolean } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(form);
  const url = `${PUBLIC_FORM_BASE}${form.slug}`;

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const patch = (next: Partial<FormRecord>) => { setDraft((current) => ({ ...current, ...next })); setNote(null); };
  const patchQuestion = (id: string, next: Partial<FormQuestion>) => patch({ questions: draft.questions.map((question) => question.id === id ? { ...question, ...next } : question) });
  const move = (index: number, delta: number) => { const list = [...draft.questions]; const [item] = list.splice(index, 1); list.splice(index + delta, 0, item); patch({ questions: list }); };

  function problems(next: FormRecord) {
    if (!next.title.trim()) return 'Dê um nome ao formulário.';
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(next.slug) || next.slug.length < 3) return 'O link só pode ter letras minúsculas, números e hífens (mínimo 3 caracteres).';
    if (next.status === 'open' && !next.questions.some(isAnswerable)) return 'Inclua ao menos uma pergunta antes de abrir para respostas.';
    const blank = next.questions.findIndex((question) => !question.label.trim());
    if (blank >= 0) return `A pergunta ${blank + 1} está sem texto.`;
    const noOptions = next.questions.findIndex((question) => (question.kind === 'single_choice' || question.kind === 'multi_choice') && (question.options || []).filter((option) => option.trim()).length < (question.kind === 'single_choice' ? 1 : 2));
    if (noOptions >= 0) return `A pergunta ${noOptions + 1} precisa de opções (escolha única: ao menos uma; múltipla: ao menos duas).`;
    return '';
  }

  async function save(override?: Partial<FormRecord>) {
    if (!supabase) return;
    const next = { ...draft, ...override, questions: (override?.questions || draft.questions).map((question) => { const options = question.options?.map((option) => option.trim()).filter(Boolean); const valid = question.kind === 'yes_no' ? ['Sim', 'Não'] : question.kind === 'single_choice' ? options || [] : []; const logic = (question.logic || []).filter((rule) => rule.goTo && valid.includes(rule.when)); return { ...question, label: question.label.trim(), options, logic: logic.length ? logic : undefined }; }) };
    const problem = problems(next);
    if (problem) { setNote({ text: problem, failed: true }); return; }
    setSaving(true); setNote(null);
    const { data, error } = await supabase.from('forms').update({ title: next.title.trim(), slug: next.slug, description: next.description.trim(), thank_you: next.thank_you.trim(), status: next.status, category: next.category.trim() || 'Formulário', audience: next.audience, company_id: next.audience === 'client' ? next.company_id || null : null, confirm_email: next.confirm_email, questions: next.questions, updated_at: new Date().toISOString() }).eq('id', form.id).select(FORM_FIELDS).single();
    setSaving(false);
    if (error || !data) { setNote({ text: errorText(error, 'Não foi possível salvar.'), failed: true }); return; }
    setDraft(data as FormRecord); onSaved(data as FormRecord);
    setNote({ text: override?.status === 'open' ? 'Formulário aberto: o link já recebe respostas.' : override?.status === 'closed' ? 'Formulário encerrado: o link avisa que não recebe mais respostas.' : 'Alterações salvas.' });
  }

  async function remove() {
    if (!supabase) return;
    setSaving(true);
    const { error } = await supabase.from('forms').delete().eq('id', form.id);
    setSaving(false);
    if (error) { setNote({ text: errorText(error, 'Não foi possível excluir.'), failed: true }); setConfirmDelete(false); return; }
    onDeleted();
  }

  return <>
    <button type="button" className="v2-forms-back" onClick={() => { if (!dirty || window.confirm('Sair sem salvar as alterações?')) onBack(); }}><ArrowLeft size={15} /> Formulários</button>
    <div className="wf-head v2-forms-head"><div><small>CALI FORMS · <span className={`v2-forms-status ${form.status}`}>{STATUS_LABELS[form.status]}</span></small><h1>{form.title}</h1><p>{url.replace('https://', '')} · {stats?.responses || 0} {stats?.responses === 1 ? 'resposta' : 'respostas'}</p></div>
      <div className="v2-head-actions">
        <a className="wf-secondary" href={`/f/${form.slug}?previa=1`} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} /> Ver como respondente</a>
        <button type="button" className="wf-secondary" onClick={onDuplicate}><Copy size={15} /> Duplicar</button>
        {form.status !== 'open' ? <button type="button" className="wf-primary" disabled={saving} onClick={() => void save({ status: 'open' })}>Abrir para respostas</button> : <button type="button" className="wf-secondary" disabled={saving} onClick={() => void save({ status: 'closed' })}>Encerrar respostas</button>}
      </div></div>
    <div className="wf-segments v2-forms-tabs" role="tablist">{([['questions', 'Perguntas'], ['share', 'Compartilhar'], ['responses', `Respostas (${stats?.responses || 0})`]] as Array<[Tab, string]>).map(([key, label]) => <button type="button" role="tab" aria-selected={tab === key} key={key} className={tab === key ? 'on' : ''} onClick={() => onTab(key)}>{label}</button>)}</div>
    {note && <p className={note.failed ? 'v2-forms-error' : 'v2-forms-ok'} role="status">{note.text}</p>}

    {tab === 'questions' && <div className="v2-forms-editor">
      <section className="v2-forms-card">
        <header><small>APRESENTAÇÃO</small><h2>O que a pessoa vê ao abrir o link</h2></header>
        <div className="v2-forms-grid">
          <label className="wide"><span>Nome do formulário</span><input value={draft.title} maxLength={160} onChange={(event) => patch({ title: event.target.value })} /></label>
          <label><span>Categoria <em>aparece para quem responde, acima do título</em></span><input list="cali-form-categories-edit" value={draft.category} maxLength={40} placeholder="Ex.: Questionário" onChange={(event) => patch({ category: event.target.value })} /><datalist id="cali-form-categories-edit">{CATEGORY_SUGGESTIONS.map((item) => <option key={item} value={item} />)}</datalist></label>
          <label><span>Para quem</span><select value={draft.audience} onChange={(event) => patch({ audience: event.target.value as FormAudience })}><option value="cali">Uso da CALI</option><option value="client">Clientes</option></select></label>
          <div className="wide v2-forms-field"><span>Introdução <em>opcional · aparece na primeira tela, antes das perguntas</em></span><RichTextarea value={draft.description} maxLength={1200} rows={5} placeholder="Ex.: Queremos entender como foi sua experiência. A participação é voluntária e leva cerca de 3 minutos." onChange={(value) => patch({ description: value })} /></div>
          <label><span>Link</span><div className="v2-forms-slug"><b>app.calirh.com/f/</b><input value={draft.slug} maxLength={60} onChange={(event) => patch({ slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-{2,}/g, '-') })} /></div></label>
          {draft.audience === 'client' ? <label><span>Cliente <em>opcional</em></span><select value={draft.company_id || ''} onChange={(event) => patch({ company_id: event.target.value || null })}><option value="">Vários clientes / não vincular</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label> : <span />}
          <label className="wide"><span>Mensagem do e-mail de confirmação <em>opcional</em></span><textarea rows={2} maxLength={600} value={draft.thank_you} placeholder="Ex.: Sua contribuição nos ajuda a tornar cada conversa mais clara." onChange={(event) => patch({ thank_you: event.target.value })} /></label>
          <label className="v2-forms-check wide"><input type="checkbox" checked={draft.confirm_email} onChange={(event) => patch({ confirm_email: event.target.checked })} /><span><strong>Enviar e-mail “Recebemos sua resposta”</strong><small>Vai para o e-mail informado na pergunta do tipo E-mail, com uma cópia das respostas.</small></span></label>
        </div>
      </section>

      <section className="v2-forms-card">
        <header><small>PERGUNTAS</small><h2>Uma pergunta por tela, nesta ordem</h2></header>
        {!draft.questions.some((question) => question.kind === 'email') && draft.confirm_email && <p className="v2-forms-warn">Sem pergunta do tipo E-mail, ninguém recebe a confirmação.</p>}
        <ol className="v2-forms-questions">{draft.questions.map((question, index) => <li key={question.id} className="v2-forms-q">
          <div className="v2-forms-q-head">
            <b>{index + 1}</b>
            <select value={question.kind} aria-label="Tipo da pergunta" onChange={(event) => { const kind = event.target.value as QuestionKind; const fresh = newQuestion(kind); patchQuestion(question.id, { kind, options: question.options?.length ? question.options : fresh.options, scaleMin: fresh.scaleMin ?? question.scaleMin, scaleMax: fresh.scaleMax ?? question.scaleMax, minLabel: question.minLabel ?? fresh.minLabel, maxLabel: question.maxLabel ?? fresh.maxLabel, required: kind === 'statement' ? false : question.required, logic: kind === question.kind ? question.logic : undefined }); }}>{KIND_ORDER.map((kind) => <option key={kind} value={kind}>{KIND_LABELS[kind]}</option>)}</select>
            {question.kind !== 'statement' && <label className="v2-forms-required"><input type="checkbox" checked={Boolean(question.required)} onChange={(event) => patchQuestion(question.id, { required: event.target.checked })} /> Obrigatória</label>}
            <span className="v2-forms-q-tools">
              <button type="button" aria-label="Subir" disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={15} /></button>
              <button type="button" aria-label="Descer" disabled={index === draft.questions.length - 1} onClick={() => move(index, 1)}><ArrowDown size={15} /></button>
              <button type="button" aria-label="Duplicar pergunta" onClick={() => { const list = [...draft.questions]; list.splice(index + 1, 0, { ...question, id: questionId() }); patch({ questions: list }); }}><Copy size={15} /></button>
              <button type="button" aria-label="Excluir pergunta" className="danger" onClick={() => patch({ questions: draft.questions.filter((item) => item.id !== question.id) })}><Trash2 size={15} /></button>
            </span>
          </div>
          <input className="v2-forms-q-label" value={question.label} maxLength={400} placeholder={question.kind === 'statement' ? 'Texto que aparece na tela' : 'Escreva a pergunta'} onChange={(event) => patchQuestion(question.id, { label: event.target.value })} />
          <input className="v2-forms-q-help" value={question.help || ''} maxLength={400} placeholder="Explicação curta abaixo da pergunta (opcional)" onChange={(event) => patchQuestion(question.id, { help: event.target.value })} />
          {(question.kind === 'single_choice' || question.kind === 'multi_choice') && <label className="v2-forms-options"><span>Opções, uma por linha</span><textarea rows={Math.max(3, (question.options || []).length + 1)} value={(question.options || []).join('\n')} onChange={(event) => patchQuestion(question.id, { options: event.target.value.split('\n').slice(0, 26) })} /></label>}
          {(question.kind === 'single_choice' || question.kind === 'yes_no') && choiceOptions(question).length > 0 && <details className="v2-forms-logic" open={Boolean(question.logic?.length)}>
            <summary>Pergunta condicional <em>{question.logic?.length ? `${question.logic.length} regra(s)` : 'opcional · leva a pessoa para outra pergunta conforme a resposta'}</em></summary>
            {choiceOptions(question).map((option) => { const rule = question.logic?.find((item) => item.when === option); return <label key={option}><span>Se responder <b>{option}</b>, ir para</span><select value={rule?.goTo || ''} onChange={(event) => { const others = (question.logic || []).filter((item) => item.when !== option); patchQuestion(question.id, { logic: event.target.value ? [...others, { when: option, goTo: event.target.value }] : others }); }}><option value="">a próxima pergunta</option>{draft.questions.slice(index + 1).map((target) => <option key={target.id} value={target.id}>{draft.questions.indexOf(target) + 1}. {stripRichText(target.label).slice(0, 70) || 'Pergunta sem texto'}</option>)}<option value={END_OF_FORM}>encerrar e enviar</option></select></label>; })}
          </details>}
          {question.kind === 'scale' && <div className="v2-forms-scale">
            <label><span>De</span><select value={question.scaleMin ?? 0} onChange={(event) => patchQuestion(question.id, { scaleMin: Number(event.target.value) })}>{[0, 1].map((value) => <option key={value}>{value}</option>)}</select></label>
            <label><span>Até</span><select value={question.scaleMax ?? 10} onChange={(event) => patchQuestion(question.id, { scaleMax: Number(event.target.value) })}>{[3, 4, 5, 6, 7, 8, 9, 10].map((value) => <option key={value}>{value}</option>)}</select></label>
            <label><span>Legenda do menor</span><input value={question.minLabel || ''} maxLength={60} onChange={(event) => patchQuestion(question.id, { minLabel: event.target.value })} /></label>
            <label><span>Legenda do maior</span><input value={question.maxLabel || ''} maxLength={60} onChange={(event) => patchQuestion(question.id, { maxLabel: event.target.value })} /></label>
          </div>}
        </li>)}</ol>
        <div className="v2-forms-add"><span>Adicionar pergunta</span><div>{KIND_ORDER.map((kind) => <button type="button" key={kind} onClick={() => patch({ questions: [...draft.questions, newQuestion(kind)] })}><Plus size={13} /> {KIND_LABELS[kind].replace(' (sem resposta)', '')}</button>)}</div></div>
      </section>

      <div className="v2-forms-savebar">
        <button type="button" className="v2-forms-delete" onClick={() => setConfirmDelete(true)}><Trash2 size={14} /> Excluir formulário</button>
        <span>{dirty ? 'Alterações não salvas' : 'Tudo salvo'}</span>
        <button type="button" className="wf-secondary" disabled={!dirty || saving} onClick={() => { setDraft(form); setNote(null); }}>Descartar</button>
        <button type="button" className="wf-primary" disabled={!dirty || saving} onClick={() => void save()}>{saving ? 'Salvando…' : 'Salvar alterações'}</button>
      </div>
    </div>}

    {tab === 'share' && <SharePanel form={form} url={url} onOpen={() => void save({ status: 'open' })} />}
    {tab === 'responses' && <ResponsesPanel form={form} />}

    {confirmDelete && <div className="ap-pd-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setConfirmDelete(false); }}><section className="ap-status-confirm" role="dialog" aria-modal="true" aria-label="Excluir formulário">
      <div><small>CALI FORMS</small><h2>Excluir formulário</h2><p><strong>{form.title}</strong></p><p>O link para de funcionar e {stats?.responses ? `as ${stats.responses} respostas recebidas são apagadas junto` : 'ele sai da lista'}. Não dá para desfazer. Se quiser só parar de receber respostas, use “Encerrar respostas”.</p></div>
      <footer><button type="button" disabled={saving} onClick={() => setConfirmDelete(false)}>Cancelar</button><button type="button" className="danger" disabled={saving} onClick={() => void remove()}>{saving ? 'Excluindo…' : 'Excluir'}</button></footer>
    </section></div>}
  </>;
}

function SharePanel({ form, url, onOpen }: { form: FormRecord; url: string; onOpen: () => void }) {
  const [qr, setQr] = useState('');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { void qrDataUrl(url, 520).then(setQr); }, [url]);
  const fileBase = `cali-forms-${form.slug}`;
  return <div className="v2-forms-share">
    {form.status !== 'open' && <div className="v2-forms-alert" role="alert"><div><strong>{form.status === 'draft' ? 'Este formulário ainda é rascunho' : 'Este formulário está encerrado'}</strong><p>Quem abrir o link {form.status === 'draft' ? 'vai ver “formulário não encontrado”' : 'vai ver que ele não recebe mais respostas'}. Abra para respostas antes de enviar.</p></div><button type="button" className="wf-primary" onClick={onOpen}>Abrir para respostas</button></div>}
    <section className="v2-forms-card v2-forms-share-card">
      <div className="v2-forms-qr">{qr ? <img src={qr} alt={`QR Code do formulário ${form.title}`} /> : <span className="data-loading">Gerando…</span>}</div>
      <div className="v2-forms-share-body">
        <small>LINK DO FORMULÁRIO</small>
        <div className="v2-forms-link"><input readOnly value={url} onFocus={(event) => event.target.select()} /><button type="button" className="wf-primary" onClick={() => { void navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2200); }); }}><Copy size={15} /> {copied ? 'Copiado' : 'Copiar link'}</button></div>
        <p>Envie o link por e-mail ou WhatsApp. Para eventos, apresentações e materiais impressos, use o QR Code ou o cartão pronto para divulgar.</p>
        <div className="v2-forms-share-actions">
          <button type="button" className="wf-secondary" onClick={() => void downloadQrPng(url, `${fileBase}-qrcode.png`)}><QrCode size={15} /> Baixar QR Code</button>
          <button type="button" className="wf-secondary" disabled={busy} onClick={() => { setBusy(true); void downloadShareCard({ title: form.title, category: form.category, intro: stripRichText(form.description) }, url, `${fileBase}-cartao.png`).finally(() => setBusy(false)); }}><Download size={15} /> {busy ? 'Gerando…' : 'Baixar cartão para divulgar'}</button>
          <a className="wf-secondary" href={`https://wa.me/?text=${encodeURIComponent(`${form.title}: ${url}`)}`} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} /> Enviar no WhatsApp</a>
        </div>
      </div>
    </section>
  </div>;
}

function ResponsesPanel({ form }: { form: FormRecord }) {
  const [rows, setRows] = useState<ResponseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [contactFilter, setContactFilter] = useState<'all' | 'pending' | 'done'>('all');
  const [answerFilter, setAnswerFilter] = useState('');
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 }>({ key: 'date', dir: -1 });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [noteFor, setNoteFor] = useState<{ row: ResponseRow; text: string; busy: boolean } | null>(null);
  const [toast, setToast] = useState('');
  const columns = useMemo(() => form.questions.filter(isAnswerable), [form.questions]);
  const choiceColumns = useMemo(() => columns.filter((question) => ['single_choice', 'multi_choice', 'yes_no', 'scale'].includes(question.kind)), [columns]);

  async function load() {
    if (!supabase) return;
    setLoading(true); setError('');
    const { data, error: loadError } = await supabase.from('form_responses').select('id,answers,respondent_name,respondent_email,submitted_at,confirmation_sent_at,contacted_at,admin_note').eq('form_id', form.id).order('submitted_at', { ascending: false }).limit(5000);
    if (loadError) setError(errorText(loadError, 'Não foi possível carregar as respostas.')); else setRows((data || []) as ResponseRow[]);
    setLoading(false); setSelected(new Set());
  }
  useEffect(() => { void load(); }, [form.id]);

  const textOf = (question: FormQuestion, row: ResponseRow) => formatAnswer(question, row.answers[question.id]);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    const [filterId, filterValue] = answerFilter ? answerFilter.split('::') : ['', ''];
    const list = rows.filter((row) => {
      if (contactFilter === 'pending' && row.contacted_at) return false;
      if (contactFilter === 'done' && !row.contacted_at) return false;
      if (filterId) { const value = row.answers[filterId]; if (Array.isArray(value) ? !value.map(String).includes(filterValue) : String(value ?? '') !== filterValue) return false; }
      if (!term) return true;
      return [row.respondent_name, row.respondent_email, row.admin_note, ...columns.map((question) => textOf(question, row))].join(' ').toLowerCase().includes(term);
    });
    const key = sort.key;
    const valueOf = (row: ResponseRow): string | number => key === 'date' ? row.submitted_at : key === 'contact' ? (row.contacted_at || '') : key === 'note' ? (row.admin_note || '') : (() => { const question = columns.find((item) => item.id === key); const raw = row.answers[key]; return typeof raw === 'number' ? raw : question ? textOf(question, row) : ''; })();
    return [...list].sort((a, b) => { const x = valueOf(a), y = valueOf(b); if (x === y) return 0; if (x === '' ) return 1; if (y === '') return -1; return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'pt-BR', { sensitivity: 'base' })) * sort.dir; });
  }, [rows, query, columns, contactFilter, answerFilter, sort]);

  function flash(message: string) { setToast(message); window.setTimeout(() => setToast((current) => current === message ? '' : current), 1800); }
  function copy(text: string) { if (!text) return; void navigator.clipboard.writeText(text).then(() => flash(`Copiado: ${text.length > 40 ? `${text.slice(0, 40)}…` : text}`)); }
  function sortBy(key: string) { setSort((current) => current.key === key ? { key, dir: current.dir === 1 ? -1 : 1 } : { key, dir: key === 'date' ? -1 : 1 }); }
  const sortMark = (key: string) => sort.key === key ? (sort.dir === 1 ? ' ↑' : ' ↓') : '';
  const allChecked = filtered.length > 0 && filtered.every((row) => selected.has(row.id));
  function toggle(id: string) { setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }

  async function exportExcel() {
    const header = ['Data', ...columns.map((question) => stripRichText(question.label)), 'Contato', 'Nota interna'];
    // Arquivos saem como link: os do app valem 30 dias; os importados (Drive) seguem o link original.
    const paths = filtered.flatMap((row) => columns.filter((question) => question.kind === 'file').map((question) => row.answers[question.id])).filter((value): value is string => typeof value === 'string' && !!value && !/^https?:/.test(value));
    const links: Record<string, string> = {};
    if (paths.length && supabase) { const signed = await supabase.storage.from('cali-forms').createSignedUrls(paths, 30 * 86400); for (const item of signed.data || []) if (item.path && item.signedUrl) links[item.path] = item.signedUrl; }
    const body = filtered.map((row) => [dateTime(row.submitted_at), ...columns.map((question) => { const value = row.answers[question.id]; if (question.kind === 'file' && typeof value === 'string' && value) return /^https?:/.test(value) ? value : links[value] || value; return typeof value === 'number' ? value : formatAnswer(question, value); }), row.contacted_at ? `Sim · ${dateTime(row.contacted_at)}` : 'Não', row.admin_note || '']);
    downloadXlsx(`cali-forms-${form.slug}-respostas.xlsx`, form.title, header, body);
  }

  async function setContacted(row: ResponseRow, done: boolean) {
    if (!supabase) return;
    const contacted_at = done ? new Date().toISOString() : null;
    setRows((current) => current.map((item) => item.id === row.id ? { ...item, contacted_at } : item));
    const { error: updateError } = await supabase.from('form_responses').update({ contacted_at }).eq('id', row.id);
    if (updateError) { setError(errorText(updateError, 'Não foi possível marcar o contato.')); setRows((current) => current.map((item) => item.id === row.id ? { ...item, contacted_at: row.contacted_at } : item)); }
  }

  async function saveNote() {
    if (!supabase || !noteFor) return;
    setNoteFor({ ...noteFor, busy: true });
    const admin_note = noteFor.text.trim() || null;
    const { error: updateError } = await supabase.from('form_responses').update({ admin_note }).eq('id', noteFor.row.id);
    if (updateError) { setError(errorText(updateError, 'Não foi possível salvar a nota.')); setNoteFor({ ...noteFor, busy: false }); return; }
    setRows((current) => current.map((item) => item.id === noteFor.row.id ? { ...item, admin_note } : item)); setNoteFor(null);
  }

  async function removeSelected() {
    if (!supabase || !selected.size) return;
    setDeleting(true);
    const ids = [...selected];
    const { error: deleteError } = await supabase.from('form_responses').delete().in('id', ids);
    setDeleting(false); setConfirmDelete(false);
    if (deleteError) { setError(errorText(deleteError, 'Não foi possível excluir.')); return; }
    setRows((current) => current.filter((item) => !selected.has(item.id))); setSelected(new Set()); flash(`${ids.length} ${ids.length === 1 ? 'resposta excluída' : 'respostas excluídas'}`);
  }

  return <div className="v2-forms-responses">
    <div className="wf-controls v2-forms-controls">
      <label className="v2-forms-search"><Search size={15} /><input value={query} placeholder="Buscar nas respostas" onChange={(event) => setQuery(event.target.value)} /></label>
      <select className="v2-forms-filter-select" aria-label="Contato" value={contactFilter} onChange={(event) => setContactFilter(event.target.value as typeof contactFilter)}><option value="all">Contato: todos</option><option value="pending">Ainda sem contato</option><option value="done">Já contatados</option></select>
      {choiceColumns.length > 0 && <select className="v2-forms-filter-select" aria-label="Filtrar por resposta" value={answerFilter} onChange={(event) => setAnswerFilter(event.target.value)}><option value="">Filtrar por resposta</option>{choiceColumns.map((question) => <optgroup key={question.id} label={stripRichText(question.label).slice(0, 60)}>{(question.kind === 'yes_no' ? ['Sim', 'Não'] : question.kind === 'scale' ? scaleOptions(question) : question.options || []).map((option) => <option key={option} value={`${question.id}::${option}`}>{option}</option>)}</optgroup>)}</select>}
      <span className="v2-forms-total">{filtered.length} de {rows.length}</span>
      <button type="button" className="wf-secondary" onClick={() => void load()} disabled={loading}><RefreshCw size={15} /> Atualizar</button>
      <button type="button" className="wf-primary" disabled={!filtered.length} onClick={() => void exportExcel()}><FileSpreadsheet size={15} /> Exportar Excel</button>
    </div>
    {selected.size > 0 && <div className="v2-forms-selbar" role="status"><strong>{selected.size} {selected.size === 1 ? 'resposta selecionada' : 'respostas selecionadas'}</strong><button type="button" className="v2-forms-delete" onClick={() => setConfirmDelete(true)}><Trash2 size={14} /> Excluir</button><button type="button" className="wf-secondary" onClick={() => setSelected(new Set())}>Limpar seleção</button></div>}
    {error && <div className="inline-notice" role="alert">{error}</div>}
    {loading ? <div className="data-loading">Carregando respostas…</div> : !rows.length ? <div className="wf-empty"><strong>Nenhuma resposta ainda.</strong><p>{form.status === 'open' ? 'Assim que alguém responder, aparece aqui.' : 'Abra o formulário para respostas e compartilhe o link.'}</p></div>
      : <div className="v2-forms-table-wrap"><table className="v2-forms-table">
        <thead><tr>
          <th className="v2-forms-check-col"><input type="checkbox" aria-label="Selecionar todas" checked={allChecked} onChange={() => setSelected(allChecked ? new Set() : new Set(filtered.map((row) => row.id)))} /></th>
          <th className="v2-forms-date-col"><button type="button" onClick={() => sortBy('date')}>Data{sortMark('date')}</button></th>
          <th><button type="button" onClick={() => sortBy('contact')}>Contato{sortMark('contact')}</button></th>
          <th><button type="button" onClick={() => sortBy('note')}>Nota{sortMark('note')}</button></th>
          {columns.map((question) => <th key={question.id} title={stripRichText(question.label)}><button type="button" onClick={() => sortBy(question.id)}>{stripRichText(question.label)}{sortMark(question.id)}</button></th>)}
        </tr></thead>
        <tbody>{filtered.map((row) => <tr key={row.id} className={selected.has(row.id) ? 'is-selected' : ''}>
          <td className="v2-forms-check-col"><input type="checkbox" aria-label="Selecionar resposta" checked={selected.has(row.id)} onChange={() => toggle(row.id)} /></td>
          <td className="v2-forms-date v2-forms-date-col">{dateTime(row.submitted_at)}</td>
          <td><label className={`v2-forms-contact${row.contacted_at ? ' done' : ''}`} title={row.contacted_at ? `Contato marcado em ${dateTime(row.contacted_at)}` : 'Marcar que entrei em contato'}><input type="checkbox" checked={Boolean(row.contacted_at)} onChange={(event) => void setContacted(row, event.target.checked)} />{row.contacted_at ? 'Contatado' : 'Pendente'}</label></td>
          <td><button type="button" className={`v2-forms-note${row.admin_note ? ' has' : ''}`} title={row.admin_note || 'Adicionar nota'} onClick={() => setNoteFor({ row, text: row.admin_note || '', busy: false })}><Pencil size={12} /> {row.admin_note ? (row.admin_note.length > 28 ? `${row.admin_note.slice(0, 28)}…` : row.admin_note) : 'Nota'}</button></td>
          {columns.map((question) => { const raw = row.answers[question.id]; const text = textOf(question, row); if (question.kind === 'file' && raw) return <td key={question.id}><FileLink value={String(raw)} /></td>; return <td key={question.id} className={text ? 'v2-forms-copy' : ''} title={text ? `${text}\n\nClique para copiar` : undefined} onClick={() => copy(text)}>{text || <span className="v2-forms-empty">—</span>}{text && <Copy size={12} className="v2-forms-copy-ico" aria-hidden="true" />}</td>; })}
        </tr>)}</tbody>
      </table></div>}
    {toast && <div className="v2-forms-toast" role="status"><Check size={14} /> {toast}</div>}
    {noteFor && <div className="ap-pd-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !noteFor.busy) setNoteFor(null); }}><section className="ap-status-confirm" role="dialog" aria-modal="true" aria-label="Nota interna">
      <div><small>NOTA INTERNA · SÓ VOCÊ VÊ</small><h2>{noteFor.row.respondent_name || 'Resposta'}</h2><p>{dateTime(noteFor.row.submitted_at)}{noteFor.row.respondent_email ? ` · ${noteFor.row.respondent_email}` : ''}</p></div>
      <label>Nota<textarea rows={4} maxLength={2000} autoFocus value={noteFor.text} placeholder="Ex.: liguei em 22/10, confirmou presença." onChange={(event) => setNoteFor({ ...noteFor, text: event.target.value })} /></label>
      <footer><button type="button" disabled={noteFor.busy} onClick={() => setNoteFor(null)}>Cancelar</button><button type="button" disabled={noteFor.busy} onClick={() => void saveNote()}>{noteFor.busy ? 'Salvando…' : 'Salvar nota'}</button></footer>
    </section></div>}
    {confirmDelete && <div className="ap-pd-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !deleting) setConfirmDelete(false); }}><section className="ap-status-confirm" role="dialog" aria-modal="true" aria-label="Excluir respostas">
      <div><small>CALI FORMS</small><h2>Excluir {selected.size === 1 ? 'resposta' : `${selected.size} respostas`}?</h2><p>{rows.filter((row) => selected.has(row.id)).slice(0, 4).map((row) => row.respondent_name || dateTime(row.submitted_at)).join(', ')}{selected.size > 4 ? ` e mais ${selected.size - 4}` : ''}. Não dá para desfazer.</p></div>
      <footer><button type="button" disabled={deleting} onClick={() => setConfirmDelete(false)}>Cancelar</button><button type="button" className="danger" disabled={deleting} onClick={() => void removeSelected()}>{deleting ? 'Excluindo…' : 'Excluir'}</button></footer>
    </section></div>}
  </div>;
}

function scaleOptions(question: FormQuestion) {
  const min = question.scaleMin ?? 0, max = question.scaleMax ?? 10;
  return Array.from({ length: Math.max(0, max - min + 1) }, (_, index) => String(min + index));
}

/** Caixa de texto com negrito, itálico, sublinhado e emoji. Guarda marcação simples (**, *, __) que a página pública converte. */
function RichTextarea({ value, onChange, rows, maxLength, placeholder }: { value: string; onChange: (value: string) => void; rows: number; maxLength: number; placeholder?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  function apply(before: string, after = before) {
    const area = ref.current; if (!area) return;
    const { selectionStart: start, selectionEnd: end } = area;
    const selected = value.slice(start, end) || 'texto';
    const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`.slice(0, maxLength);
    onChange(next);
    requestAnimationFrame(() => { area.focus(); area.setSelectionRange(start + before.length, start + before.length + selected.length); });
  }
  function insert(text: string) {
    const area = ref.current; const start = area?.selectionStart ?? value.length; const end = area?.selectionEnd ?? value.length;
    onChange(`${value.slice(0, start)}${text}${value.slice(end)}`.slice(0, maxLength)); setEmojiOpen(false);
    requestAnimationFrame(() => { area?.focus(); area?.setSelectionRange(start + text.length, start + text.length); });
  }
  return <div className="v2-forms-rich">
    <div className="v2-forms-rich-bar" role="toolbar" aria-label="Formatação">
      <button type="button" title="Negrito" aria-label="Negrito" onClick={() => apply('**')}><Bold size={14} /></button>
      <button type="button" title="Itálico" aria-label="Itálico" onClick={() => apply('*')}><Italic size={14} /></button>
      <button type="button" title="Sublinhado" aria-label="Sublinhado" onClick={() => apply('__')}><Underline size={14} /></button>
      <span className="v2-forms-rich-sep" />
      <button type="button" title="Emoji" aria-label="Emoji" aria-expanded={emojiOpen} onClick={() => setEmojiOpen((open) => !open)}><Smile size={14} /></button>
      <small>Selecione o trecho e clique em B, I ou U</small>
      {emojiOpen && <div className="v2-forms-emoji">{EMOJIS.map((emoji) => <button type="button" key={emoji} onClick={() => insert(emoji)}>{emoji}</button>)}</div>}
    </div>
    <textarea ref={ref} rows={rows} maxLength={maxLength} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
  </div>;
}

/** Arquivo enviado numa resposta: link do Drive (importados) ou link temporário do armazenamento do app. */
function FileLink({ value }: { value: string }) {
  const [busy, setBusy] = useState(false);
  if (/^https?:\/\//.test(value)) return <a className="v2-forms-file" href={value} target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()}><Paperclip size={13} /> Abrir arquivo</a>;
  return <button type="button" className="v2-forms-file" disabled={busy} onClick={async (event) => {
    event.stopPropagation(); if (!supabase) return; setBusy(true);
    const opened = window.open('', '_blank');
    const { data } = await supabase.storage.from('cali-forms').createSignedUrl(value, 600);
    setBusy(false);
    if (data?.signedUrl && opened) opened.location.href = data.signedUrl; else opened?.close();
  }}><Paperclip size={13} /> {busy ? 'Abrindo…' : fileLabel(value)}</button>;
}
