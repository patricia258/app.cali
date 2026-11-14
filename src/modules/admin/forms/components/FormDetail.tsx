import { WorkflowSegments } from '../../../../components/ds/WorkflowControls';
import { WorkflowHeading } from '../../../../components/ds/WorkflowHeading';
import { WorkspaceConfirmDialog } from '../../../../components/workspace/components/WorkspaceConfirmDialog';
import { WorkspaceDialogOverlay } from '../../../../components/workspace/components/WorkspaceDialogOverlay';
import { FormStatusBadge } from '../../../../components/forms/FormStatusBadge';
import { confirmAction } from '../../../../components/feedback/workspaceDialogs';
import { Button } from '../../../../components/ds/Button';
import { useEffect, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp, Copy, ExternalLink, Plus, Trash2 } from 'lucide-react';
import { deleteForm, saveForm } from '../../../../api/forms/admin';
import { type FormAudience, type FormQuestion, type FormRecord, type QuestionKind, CATEGORY_SUGGESTIONS, KIND_LABELS, KIND_ORDER, PUBLIC_FORM_BASE, STATUS_LABELS, END_OF_FORM, choiceOptions, isAnswerable, stripRichText, newQuestion, questionId } from '../../../forms/formModel';
import { errorText, type FormAdminTab } from '../formDetails';
import { FormRichTextarea } from './FormRichTextarea';
import { FormSharePanel } from './FormSharePanel';
import { FormResponsesPanel } from './FormResponsesPanel';

export function FormDetail({ form, tab, companies, stats, onTab, onBack, onDuplicate, onSaved, onDeleted }: { form: FormRecord; tab: FormAdminTab; companies: Array<{ id: string; name: string }>; stats?: { responses: number; last: string | null }; onTab: (tab: FormAdminTab) => void; onBack: () => void; onDuplicate: () => void; onSaved: (form: FormRecord) => void; onDeleted: () => void }) {
  const [draft, setDraft] = useState<FormRecord>(form);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<{ text: string; failed?: boolean } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [typedName, setTypedName] = useState('');
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
    const next = { ...draft, ...override, questions: (override?.questions || draft.questions).map((question) => { const options = question.options?.map((option) => option.trim()).filter(Boolean); const valid = question.kind === 'yes_no' ? ['Sim', 'Não'] : question.kind === 'single_choice' ? options || [] : []; const logic = (question.logic || []).filter((rule) => rule.goTo && valid.includes(rule.when)); return { ...question, label: question.label.trim(), options, logic: logic.length ? logic : undefined }; }) };
    const problem = problems(next);
    if (problem) { setNote({ text: problem, failed: true }); return; }
    setSaving(true); setNote(null);
    const { data, error } = await saveForm(form.id, { title: next.title.trim(), slug: next.slug, description: next.description.trim(), thank_you: next.thank_you.trim(), status: next.status, submit_label: next.submit_label?.trim() || null, success_text: next.success_text?.trim() || null, category: next.category.trim() || 'Formulário', audience: next.audience, stages: (next.stages || []).map((item) => item.trim()).filter(Boolean).slice(0, 12).length ? (next.stages || []).map((item) => item.trim()).filter(Boolean).slice(0, 12) : null, company_id: next.audience === 'client' ? next.company_id || null : null, confirm_email: next.confirm_email, questions: next.questions, updated_at: new Date().toISOString() });
    setSaving(false);
    if (error || !data) { setNote({ text: errorText(error, 'Não foi possível salvar.'), failed: true }); return; }
    setDraft(data as FormRecord); onSaved(data as FormRecord);
    setNote({ text: override?.status === 'open' ? 'Formulário aberto: o link já recebe respostas.' : override?.status === 'closed' ? 'Formulário encerrado: o link avisa que não recebe mais respostas.' : 'Alterações salvas.' });
  }

  async function remove() {
    setSaving(true);
    const { error } = await deleteForm(form.id);
    setSaving(false);
    if (error) { setNote({ text: errorText(error, 'Não foi possível excluir.'), failed: true }); setConfirmDelete(false); return; }
    onDeleted();
  }

  return <>
    <button type="button" className="v2-forms-back tw:inline-flex tw:items-center tw:gap-[0.462rem] tw:border-0 tw:bg-transparent tw:text-[color:var(--fm-wine)]
      tw:[font:600_0.923rem_Inter,sans-serif] tw:p-0 tw:[margin:0_0_0.923rem] tw:cursor-pointer" onClick={async () => { if (!dirty || await confirmAction('Sair sem salvar as alterações?')) onBack(); }}><ArrowLeft size={15} /> Formulários</button>
    <WorkflowHeading className="v2-forms-head tw:[&_small]:flex tw:[&_small]:items-center tw:[&_small]:gap-[0.615rem] tw:[&_small_.wf-tag]:tracking-[0] tw:[&_small_.wf-tag]:normal-case"><div><small>CALI FORMS · <FormStatusBadge status={form.status}>{STATUS_LABELS[form.status]}</FormStatusBadge></small><h1>{form.title}</h1><p>{url.replace('https://', '')} · {stats?.responses || 0} {stats?.responses === 1 ? 'resposta' : 'respostas'}</p></div>
      <div className="v2-head-actions tw:flex tw:flex-wrap tw:items-center tw:gap-[0.769rem]">
        <a className="wf-secondary tw:inline-flex tw:items-center tw:gap-[0.538rem] tw:justify-center tw:[border:1px_solid_#e3d6cc]
          tw:bg-white tw:text-cali-brand tw:rounded-[0.538rem] tw:[padding:0.692rem_1rem] tw:[font:600_0.846rem_Inter,sans-serif]
          tw:no-underline tw:cursor-pointer tw:[transition:border-color_.15s,background_.15s] tw:[&:hover:not(:disabled)]:border-cali-brand
          tw:[&:hover:not(:disabled)]:bg-[#fbf7f3] tw:[&:disabled]:opacity-[.45] tw:[&:disabled]:cursor-default" href={`/f/${form.slug}?previa=1`} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} /> Ver como respondente</a>
        <Button type="button" variant="formSecondary" onClick={onDuplicate}><Copy size={15} /> Duplicar</Button>
        {form.status !== 'open' ? <Button type="button" variant="workflowPrimary" disabled={saving} onClick={() => void save({ status: 'open' })}>Abrir para respostas</Button> : <Button type="button" variant="formSecondary" disabled={saving} onClick={() => void save({ status: 'closed' })}>Encerrar respostas</Button>}
      </div></WorkflowHeading>
    <WorkflowSegments className="v2-forms-tabs tw:[margin:0.308rem_0_1.231rem] tw:w-max tw:max-w-full" role="tablist">{([['questions', 'Perguntas'], ['share', 'Compartilhar'], ['responses', `Respostas (${stats?.responses || 0})`]] satisfies Array<[FormAdminTab, string]>).map(([key, label]) => <button type="button" role="tab" aria-selected={tab === key} key={key} className={tab === key ? 'on' : ''} onClick={() => onTab(key)}>{label}</button>)}</WorkflowSegments>
    {note && <p className={note.failed ? "v2-forms-error tw:[margin:0_0_1.077rem] tw:[padding:0.769rem_1.077rem] tw:rounded-[0.692rem] tw:text-[0.923rem] tw:font-semibold tw:bg-[#fff6f4] tw:text-[#b42318] tw:[border:1px_solid_#f1c4bd]" : "v2-forms-ok tw:[margin:0_0_1.077rem] tw:[padding:0.769rem_1.077rem] tw:rounded-[0.692rem] tw:text-[0.923rem] tw:font-semibold tw:bg-[#e6f6ec] tw:text-[#31805a] tw:[border:1px_solid_#caebd9]"} role="status">{note.text}</p>}

    {tab === 'questions' && <div className="v2-forms-editor tw:flex tw:flex-col tw:gap-[1.231rem] tw:pb-[6.462rem]">
      <section className="v2-forms-card tw:bg-white tw:[border:1px_solid_var(--fm-line)] tw:rounded-[0.923rem] tw:[padding:1.538rem_1.692rem]
        tw:[&>header]:mb-[1.231rem] tw:[&>header_small]:text-[0.769rem] tw:[&>header_small]:font-bold
        tw:[&>header_small]:tracking-[.12em] tw:[&>header_small]:text-cali-gold tw:[&>header_h2]:text-[1.231rem]
        tw:[&>header_h2]:font-semibold tw:[&>header_h2]:text-[color:var(--fm-ink)] tw:[&>header_h2]:[margin:0.308rem_0_0]">
        <header><small>APRESENTAÇÃO</small><h2>O que a pessoa vê ao abrir o link</h2></header>
        <div className="v2-forms-grid tw:grid tw:grid-cols-2 tw:[gap:1.077rem_1.231rem] tw:[&_.wide]:col-span-full tw:[&_label>span]:block
          tw:[&_label>span]:text-[0.846rem] tw:[&_label>span]:font-semibold tw:[&_label>span]:text-[color:var(--fm-ink)]
          tw:[&_label>span]:mb-[0.462rem] tw:[@media(max-width:760px)]:grid-cols-[1fr]">
          <label className="wide"><span>Nome do formulário</span><input value={draft.title} maxLength={160} onChange={(event) => patch({ title: event.target.value })} /></label>
          <label><span>Categoria <em>aparece para quem responde, acima do título</em></span><input list="cali-form-categories-edit" value={draft.category} maxLength={40} placeholder="Ex.: Questionário" onChange={(event) => patch({ category: event.target.value })} /><datalist id="cali-form-categories-edit">{CATEGORY_SUGGESTIONS.map((item) => <option key={item} value={item} />)}</datalist></label>
          <label><span>Para quem</span><select value={draft.audience} onChange={(event) => patch({ audience: event.target.value as FormAudience })}><option value="cali">Uso da CALI</option><option value="client">Clientes</option></select></label>
          <div className="wide v2-forms-field tw:[&>span]:block tw:[&>span]:text-[0.846rem] tw:[&>span]:font-semibold tw:[&>span]:text-[color:var(--fm-ink)]
            tw:[&>span]:mb-[0.462rem] tw:[&>span_em]:not-italic tw:[&>span_em]:font-medium tw:[&>span_em]:text-[color:var(--fm-muted)]
            tw:[&>span_em]:ml-[0.308rem]"><span>Introdução <em>opcional · aparece na primeira tela, antes das perguntas</em></span><FormRichTextarea value={draft.description} maxLength={1200} rows={5} placeholder="Ex.: Queremos entender como foi sua experiência. A participação é voluntária e leva cerca de 3 minutos." onChange={(value) => patch({ description: value })} /></div>
          <label><span>Link</span><div className="v2-forms-slug tw:flex tw:items-center tw:[border:1px_solid_#e3d6cc] tw:rounded-[0.615rem] tw:bg-[#fbf7f3]
            tw:overflow-hidden tw:[&_b]:text-[0.923rem] tw:[&_b]:font-medium tw:[&_b]:text-[color:var(--fm-muted)]
            tw:[&_b]:[padding:0_0.154rem_0_0.846rem] tw:[&_b]:whitespace-nowrap tw:[&_input]:border-0! tw:[&_input]:rounded-none!
            tw:[&_input]:bg-white! tw:[&_input]:pl-[0.462rem]!"><b>app.calirh.com/f/</b><input value={draft.slug} maxLength={60} onChange={(event) => patch({ slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-{2,}/g, '-') })} /></div></label>
          {draft.audience === 'client' ? <label><span>Cliente <em>opcional</em></span><select value={draft.company_id || ''} onChange={(event) => patch({ company_id: event.target.value || null })}><option value="">Vários clientes / não vincular</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label> : <span />}
          <label className="wide"><span>Mensagem do e-mail de confirmação <em>opcional</em></span><textarea rows={2} maxLength={600} value={draft.thank_you} placeholder="Ex.: Sua contribuição nos ajuda a tornar cada conversa mais clara." onChange={(event) => patch({ thank_you: event.target.value })} /></label>
          <label><span>Texto do botão final <em>opcional · padrão “Enviar”</em></span><input value={draft.submit_label || ''} maxLength={60} placeholder="Enviar" onChange={(event) => patch({ submit_label: event.target.value })} /></label>
          <label><span>Mensagem de sucesso <em>opcional · padrão “Muito obrigado!”</em></span><textarea rows={2} maxLength={600} value={draft.success_text || ''} placeholder="Ex.: Recebemos sua proposta! Nossa equipe vai entrar em contato." onChange={(event) => patch({ success_text: event.target.value })} /></label>
          <label className="wide"><span>Etapas de acompanhamento <em>opcional · uma por linha; aparecem como “Situação” em cada resposta (triagem)</em></span><textarea rows={3} value={(draft.stages || []).join('\n')} placeholder={'Ex.:\nNovo\nEm análise\nAprovado'} onChange={(event) => patch({ stages: event.target.value.split('\n') })} /></label>
          <label className="v2-forms-check wide tw:flex tw:gap-[0.769rem] tw:items-start tw:[padding:0.923rem_1.077rem] tw:[border:1px_solid_var(--fm-line)]
            tw:rounded-[0.769rem] tw:bg-[#fbf7f3] tw:cursor-pointer tw:[&_input]:mt-[0.154rem] tw:[&_input]:[accent-color:var(--fm-wine)]
            tw:[.v2-forms_label_&>span]:flex tw:[.v2-forms_label_&>span]:flex-col tw:[.v2-forms_label_&>span]:gap-[0.154rem]
            tw:[.v2-forms_label_&>span]:m-0 tw:[&_strong]:text-[0.923rem] tw:[&_strong]:text-[color:var(--fm-ink)]
            tw:[&_small]:text-[0.846rem] tw:[&_small]:text-[color:var(--fm-muted)] tw:[&_small]:font-normal"><input type="checkbox" checked={draft.confirm_email} onChange={(event) => patch({ confirm_email: event.target.checked })} /><span><strong>Enviar e-mail “Recebemos sua resposta”</strong><small>Vai para o e-mail informado na pergunta do tipo E-mail, com uma cópia das respostas.</small></span></label>
        </div>
      </section>

      <section className="v2-forms-card tw:bg-white tw:[border:1px_solid_var(--fm-line)] tw:rounded-[0.923rem] tw:[padding:1.538rem_1.692rem]
        tw:[&>header]:mb-[1.231rem] tw:[&>header_small]:text-[0.769rem] tw:[&>header_small]:font-bold
        tw:[&>header_small]:tracking-[.12em] tw:[&>header_small]:text-cali-gold tw:[&>header_h2]:text-[1.231rem]
        tw:[&>header_h2]:font-semibold tw:[&>header_h2]:text-[color:var(--fm-ink)] tw:[&>header_h2]:[margin:0.308rem_0_0]">
        <header><small>PERGUNTAS</small><h2>Uma pergunta por tela, nesta ordem</h2></header>
        {!draft.questions.some((question) => question.kind === 'email') && draft.confirm_email && <p className="v2-forms-warn tw:[margin:0_0_1.077rem] tw:[padding:0.769rem_1.077rem] tw:rounded-[0.692rem] tw:text-[0.923rem]
          tw:font-semibold tw:bg-[#fff5e0] tw:text-[#967030] tw:[border:1px_solid_#f2dfb8]">Sem pergunta do tipo E-mail, ninguém recebe a confirmação.</p>}
        <ol className="v2-forms-questions tw:list-none tw:m-0 tw:p-0 tw:flex tw:flex-col tw:gap-[0.923rem]">{draft.questions.map((question, index) => <li key={question.id} className="v2-forms-q tw:[border:1px_solid_var(--fm-line)] tw:[border-left:0.231rem_solid_var(--fm-wine)]
          tw:rounded-[0.769rem] tw:[padding:1.077rem_1.231rem] tw:flex tw:flex-col tw:gap-[0.692rem] tw:bg-[#fffdfb]">
          <div className="v2-forms-q-head tw:flex tw:items-center tw:gap-[0.769rem] tw:flex-wrap tw:[&>b]:grid tw:[&>b]:place-items-center
            tw:[&>b]:w-[2rem] tw:[&>b]:h-[2rem] tw:[&>b]:rounded-[50%] tw:[&>b]:bg-[var(--fm-wine)] tw:[&>b]:text-white
            tw:[&>b]:text-[0.923rem] tw:[&>b]:flex-none tw:[&_select]:w-auto! tw:[&_select]:min-w-[15.385rem]">
            <b>{index + 1}</b>
            <select value={question.kind} aria-label="Tipo da pergunta" onChange={(event) => { const kind = event.target.value as QuestionKind; const fresh = newQuestion(kind); patchQuestion(question.id, { kind, options: question.options?.length ? question.options : fresh.options, scaleMin: fresh.scaleMin ?? question.scaleMin, scaleMax: fresh.scaleMax ?? question.scaleMax, minLabel: question.minLabel ?? fresh.minLabel, maxLabel: question.maxLabel ?? fresh.maxLabel, required: kind === 'statement' ? false : question.required, logic: kind === question.kind ? question.logic : undefined }); }}>{KIND_ORDER.map((kind) => <option key={kind} value={kind}>{KIND_LABELS[kind]}</option>)}</select>
            {question.kind !== 'statement' && <label className="v2-forms-required tw:inline-flex! tw:items-center tw:gap-[0.462rem] tw:text-[0.923rem] tw:font-semibold
              tw:text-[color:var(--fm-ink)] tw:cursor-pointer tw:[&_input]:[accent-color:var(--fm-wine)]"><input type="checkbox" checked={Boolean(question.required)} onChange={(event) => patchQuestion(question.id, { required: event.target.checked })} /> Obrigatória</label>}
            <span className="v2-forms-q-tools tw:ml-auto tw:flex tw:gap-[0.308rem] tw:[&_button]:grid tw:[&_button]:place-items-center
              tw:[&_button]:w-[2.308rem] tw:[&_button]:h-[2.308rem] tw:[&_button]:[border:1px_solid_var(--fm-line)]
              tw:[&_button]:rounded-[0.538rem] tw:[&_button]:bg-white tw:[&_button]:text-[color:var(--fm-ink)]
              tw:[&_button]:cursor-pointer tw:[&_button:hover:not(:disabled)]:[border-color:var(--fm-wine)]
              tw:[&_button:hover:not(:disabled)]:text-[color:var(--fm-wine)] tw:[&_button:disabled]:opacity-[.35]
              tw:[&_button:disabled]:cursor-default tw:[&_button.danger:hover]:[border-color:#b42318] tw:[&_button.danger:hover]:text-[#b42318]
              tw:[@media(max-width:760px)]:ml-0">
              <button type="button" aria-label="Subir" disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={15} /></button>
              <button type="button" aria-label="Descer" disabled={index === draft.questions.length - 1} onClick={() => move(index, 1)}><ArrowDown size={15} /></button>
              <button type="button" aria-label="Duplicar pergunta" onClick={() => { const list = [...draft.questions]; list.splice(index + 1, 0, { ...question, id: questionId() }); patch({ questions: list }); }}><Copy size={15} /></button>
              <button type="button" aria-label="Excluir pergunta" className="danger" onClick={() => patch({ questions: draft.questions.filter((item) => item.id !== question.id) })}><Trash2 size={15} /></button>
            </span>
          </div>
          <input className="v2-forms-q-label tw:text-[1.077rem]! tw:font-semibold!" value={question.label} maxLength={400} placeholder={question.kind === 'statement' ? 'Texto que aparece na tela' : 'Escreva a pergunta'} onChange={(event) => patchQuestion(question.id, { label: event.target.value })} />
          <input className="v2-forms-q-help tw:text-[0.923rem]! tw:text-[color:var(--fm-muted)]!" value={question.help || ''} maxLength={400} placeholder="Explicação curta abaixo da pergunta (opcional)" onChange={(event) => patchQuestion(question.id, { help: event.target.value })} />
          {(question.kind === 'single_choice' || question.kind === 'multi_choice') && <label className="v2-forms-options"><span>Opções, uma por linha</span><textarea rows={Math.max(3, (question.options || []).length + 1)} value={(question.options || []).join('\n')} onChange={(event) => patchQuestion(question.id, { options: event.target.value.split('\n').slice(0, 26) })} /></label>}
          {(question.kind === 'single_choice' || question.kind === 'yes_no') && choiceOptions(question).length > 0 && <details className="v2-forms-logic tw:[border:1px_dashed_#e3d6cc] tw:rounded-[0.692rem] tw:[padding:0.692rem_0.923rem]
            tw:bg-[#fbf7f3] tw:[&_summary]:cursor-pointer tw:[&_summary]:text-[0.923rem] tw:[&_summary]:font-semibold
            tw:[&_summary]:text-cali-brand tw:[&_summary_em]:not-italic tw:[&_summary_em]:font-medium tw:[&_summary_em]:text-[color:var(--fm-muted)]
            tw:[&_summary_em]:ml-[0.462rem] tw:[&_label]:grid! tw:[&_label]:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]
            tw:[&_label]:gap-[0.769rem] tw:[&_label]:items-center tw:[&_label]:mt-[0.615rem] tw:[&_label>span]:m-0!
            tw:[&_label>span]:font-medium! tw:[&_label>span]:text-[color:var(--fm-ink)] tw:[&_label_b]:text-cali-brand" open={Boolean(question.logic?.length)}>
            <summary>Pergunta condicional <em>{question.logic?.length ? `${question.logic.length} regra(s)` : 'opcional · leva a pessoa para outra pergunta conforme a resposta'}</em></summary>
            {choiceOptions(question).map((option) => { const rule = question.logic?.find((item) => item.when === option); return <label key={option}><span>Se responder <b>{option}</b>, ir para</span><select value={rule?.goTo || ''} onChange={(event) => { const others = (question.logic || []).filter((item) => item.when !== option); patchQuestion(question.id, { logic: event.target.value ? [...others, { when: option, goTo: event.target.value }] : others }); }}><option value="">a próxima pergunta</option>{draft.questions.slice(index + 1).map((target) => <option key={target.id} value={target.id}>{draft.questions.indexOf(target) + 1}. {stripRichText(target.label).slice(0, 70) || 'Pergunta sem texto'}</option>)}<option value={END_OF_FORM}>encerrar e enviar</option></select></label>; })}
          </details>}
          {question.kind === 'file' && <label className="v2-forms-options"><span>Tipos de arquivo aceitos</span><select value={question.accept || 'any'} onChange={(event) => patchQuestion(question.id, { accept: event.target.value as FormQuestion['accept'] })}><option value="any">Foto, PDF, documentos, áudio e vídeo</option><option value="images_pdf">Só PDF e imagens</option></select></label>}
          {question.kind === 'scale' && <div className="v2-forms-scale tw:grid tw:grid-cols-[6.923rem_6.923rem_minmax(0,1fr)_minmax(0,1fr)] tw:gap-[0.769rem] tw:[@media(max-width:760px)]:grid-cols-[1fr_1fr]">
            <label><span>De</span><select value={question.scaleMin ?? 0} onChange={(event) => patchQuestion(question.id, { scaleMin: Number(event.target.value) })}>{[0, 1].map((value) => <option key={value}>{value}</option>)}</select></label>
            <label><span>Até</span><select value={question.scaleMax ?? 10} onChange={(event) => patchQuestion(question.id, { scaleMax: Number(event.target.value) })}>{[3, 4, 5, 6, 7, 8, 9, 10].map((value) => <option key={value}>{value}</option>)}</select></label>
            <label><span>Legenda do menor</span><input value={question.minLabel || ''} maxLength={60} onChange={(event) => patchQuestion(question.id, { minLabel: event.target.value })} /></label>
            <label><span>Legenda do maior</span><input value={question.maxLabel || ''} maxLength={60} onChange={(event) => patchQuestion(question.id, { maxLabel: event.target.value })} /></label>
          </div>}
        </li>)}</ol>
        <div className="v2-forms-add tw:mt-[1.231rem] tw:pt-[1.077rem] tw:[border-top:1px_dashed_var(--fm-line)] tw:[&>span]:block
          tw:[&>span]:text-[0.846rem] tw:[&>span]:font-semibold tw:[&>span]:text-[color:var(--fm-muted)]
          tw:[&>span]:mb-[0.615rem] tw:[&>div]:flex tw:[&>div]:flex-wrap tw:[&>div]:gap-[0.462rem] tw:[&_button]:inline-flex
          tw:[&_button]:items-center tw:[&_button]:gap-[0.385rem] tw:[&_button]:[border:1px_solid_var(--fm-line)]
          tw:[&_button]:rounded-[76.846rem] tw:[&_button]:bg-white tw:[&_button]:text-[color:var(--fm-ink)]
          tw:[&_button]:[font:500_0.846rem_Inter,sans-serif] tw:[&_button]:[padding:0.462rem_0.846rem] tw:[&_button]:cursor-pointer
          tw:[&_button:hover]:[border-color:var(--fm-wine)] tw:[&_button:hover]:text-[color:var(--fm-wine)]
          tw:[&_button:hover]:bg-[#fbf7f3]"><span>Adicionar pergunta</span><div>{KIND_ORDER.map((kind) => <button type="button" key={kind} onClick={() => patch({ questions: [...draft.questions, newQuestion(kind)] })}><Plus size={13} /> {KIND_LABELS[kind].replace(' (sem resposta)', '')}</button>)}</div></div>
      </section>

      <div className="v2-forms-savebar tw:sticky tw:bottom-[0.923rem] tw:z-5 tw:flex tw:items-center tw:gap-[0.769rem]
        tw:[padding:0.769rem_1.077rem] tw:[border:1px_solid_var(--fm-line)] tw:rounded-[0.923rem] tw:bg-[rgba(255,253,251,.96)]
        tw:[box-shadow:0_0.769rem_2.308rem_rgba(29,17,19,.1)] tw:[backdrop-filter:blur(0.462rem)] tw:[&>span]:ml-auto
        tw:[&>span]:text-[0.846rem] tw:[&>span]:text-[color:var(--fm-muted)] tw:[@media(max-width:760px)]:flex-wrap">
        <button type="button" className="v2-forms-delete tw:inline-flex tw:items-center tw:gap-[0.462rem] tw:border-0 tw:bg-transparent
          tw:text-[#b42318] tw:[font:600_0.846rem_Inter,sans-serif] tw:cursor-pointer tw:[padding:0.462rem_0.308rem]" onClick={() => setConfirmDelete(true)}><Trash2 size={14} /> Excluir formulário</button>
        <span>{dirty ? 'Alterações não salvas' : 'Tudo salvo'}</span>
        <Button type="button" variant="formSecondary" disabled={!dirty || saving} onClick={() => { setDraft(form); setNote(null); }}>Descartar</Button>
        <Button type="button" variant="workflowPrimary" disabled={!dirty || saving} onClick={() => void save()}>{saving ? 'Salvando…' : 'Salvar alterações'}</Button>
      </div>
    </div>}

    {tab === 'share' && <FormSharePanel form={form} url={url} onOpen={() => void save({ status: 'open' })} />}
    {tab === 'responses' && <FormResponsesPanel form={form} />}

    {confirmDelete && <WorkspaceDialogOverlay onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setConfirmDelete(false); }}><WorkspaceConfirmDialog aria-label="Excluir formulário">
      <div><small>CALI FORMS</small><h2>Excluir formulário</h2><p><strong>{form.title}</strong></p><p>O link para de funcionar e {stats?.responses ? `as ${stats.responses} respostas saem junto` : 'ele sai da lista'}. Tudo fica na Lixeira por 30 dias e pode ser restaurado. Se quiser só parar de receber respostas, use “Encerrar respostas”.</p></div>
      <label>Para confirmar, digite o nome do formulário<input value={typedName} autoComplete="off" placeholder={form.title} onChange={(event) => setTypedName(event.target.value)} /></label>
      <footer><button type="button" disabled={saving} onClick={() => { setConfirmDelete(false); setTypedName(''); }}>Cancelar</button><button type="button" className="danger tw:border-[#b42318]! tw:bg-[#b42318]!" disabled={saving || typedName.trim().toLowerCase() !== form.title.trim().toLowerCase()} onClick={() => void remove()}>{saving ? 'Excluindo…' : 'Excluir'}</button></footer>
    </WorkspaceConfirmDialog></WorkspaceDialogOverlay>}
  </>;
}
