import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Banknote, BriefcaseBusiness, CalendarDays, CheckCircle2, Cloud, FileCheck2, Loader2, Mail, Plus, Upload, UserRound, X } from 'lucide-react';
import { Progress, Shell } from '../../components/WorkspaceShell';
import { supabase } from '../../lib/supabase';

type ClientRow = { id: string; name: string; contact: string; email: string; service: string; hours: string; usage: number; nps: string; access: string; drive: string };
const previewClients: ClientRow[] = [
  { id: 'c1', name: 'Grupo Aurora', contact: 'Marina Costa', email: 'marina@grupoaurora.com.br', service: 'Assessoria Estratégica Mensal', hours: '24h10 / 30h', usage: 81, nps: '4,9', access: 'Ativo', drive: 'Não conectado' },
  { id: 'c2', name: 'Novatech', contact: 'Ricardo Martins', email: 'ricardo@novatech.com.br', service: 'Assessoria Estratégica Mensal', hours: '32h50 / 40h', usage: 82, nps: '4,7', access: 'Ativo', drive: 'Conectado' },
  { id: 'c3', name: 'Studio Norte', contact: 'Aline Rocha', email: 'aline@studionorte.com.br', service: 'Projeto de Estruturação', hours: '11h25 / 20h', usage: 57, nps: '5,0', access: 'Ativo', drive: 'Não conectado' },
];

function monthBounds() {
  const now = new Date(); const start = new Date(now.getFullYear(), now.getMonth(), 1); const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const date = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  return { start: date(start), next: date(next) };
}
function formatHours(minutes: number) { const hours = Math.floor(minutes / 60), rest = minutes % 60; return rest ? `${hours}h${String(rest).padStart(2, '0')}` : `${hours}h`; }
function currencyToNumber(value: string) { const clean = value.replace(/[^0-9,.-]/g, '').replace(/\./g, '').replace(',', '.'); return Number(clean || 0); }

export function AdminClientsPage() {
  const preview = sessionStorage.getItem('cali-preview-role') === 'admin';
  const [clients, setClients] = useState<ClientRow[]>(preview ? previewClients : []);
  const [loading, setLoading] = useState(!preview); const [open, setOpen] = useState(false); const [created, setCreated] = useState(''); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState(''); const [segment, setSegment] = useState(''); const [contact, setContact] = useState(''); const [decisionTitle, setDecisionTitle] = useState(''); const [email, setEmail] = useState('');
  const [service, setService] = useState(''); const [hours, setHours] = useState(''); const [startDate, setStartDate] = useState(''); const [endDate, setEndDate] = useState(''); const [contractValue, setContractValue] = useState('');
  const [billingFrequency, setBillingFrequency] = useState('monthly'); const [paymentMethod, setPaymentMethod] = useState('pix'); const [billingStatus, setBillingStatus] = useState('current'); const [billingDay, setBillingDay] = useState(''); const [notes, setNotes] = useState('');
  const [contractDate, setContractDate] = useState(''); const [contractFile, setContractFile] = useState<File | null>(null); const [addendumDate, setAddendumDate] = useState(''); const [addendumFile, setAddendumFile] = useState<File | null>(null);
  const empty = useMemo(() => !loading && clients.length === 0, [clients.length, loading]);

  useEffect(() => {
    if (!open) return;
    document.body.classList.add('workspace-modal-open');
    return () => document.body.classList.remove('workspace-modal-open');
  }, [open]);

  async function loadClients() {
    if (preview || !supabase) return;
    setLoading(true); setError('');
    const { start, next } = monthBounds();
    const [companiesResult, invitesResult, profilesResult, hoursResult, npsResult] = await Promise.all([
      supabase.from('companies').select('id, display_name, service_type, monthly_hours_contracted, status, drive_folder_url').order('created_at', { ascending: false }),
      supabase.from('client_invites').select('company_id, email, full_name, accepted_at, active').eq('active', true),
      supabase.from('profiles').select('company_id, active, role').eq('role', 'client').eq('active', true),
      supabase.from('hour_entries').select('company_id, minutes').gte('work_date', start).lt('work_date', next),
      supabase.from('nps_responses').select('company_id, score'),
    ]);
    if (companiesResult.error) { setError(`Não consegui carregar a carteira: ${companiesResult.error.message}`); setLoading(false); return; }
    const invites = invitesResult.data ?? [], profiles = profilesResult.data ?? [], hourRows = hoursResult.data ?? [], npsRows = npsResult.data ?? [];
    setClients((companiesResult.data ?? []).map((item) => {
      const invite = invites.find((entry) => entry.company_id === item.id); const hasClientProfile = profiles.some((entry) => entry.company_id === item.id);
      const consumedMinutes = hourRows.filter((entry) => entry.company_id === item.id).reduce((total, entry) => total + (entry.minutes ?? 0), 0); const contracted = Number(item.monthly_hours_contracted ?? 0);
      const scores = npsRows.filter((entry) => entry.company_id === item.id).map((entry) => Number(entry.score)); const average = scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null;
      return { id: item.id, name: item.display_name, contact: invite?.full_name ?? 'Contato principal não definido', email: invite?.email ?? '—', service: item.service_type ?? 'Serviço a definir', hours: `${formatHours(consumedMinutes)} / ${contracted ? `${contracted}h` : '—'}`, usage: contracted > 0 ? Math.min(100, Math.round((consumedMinutes / (contracted * 60)) * 100)) : 0, nps: average === null ? '—' : average.toFixed(1).replace('.', ','), access: hasClientProfile ? 'Ativo' : invite ? 'Convite preparado' : 'Sem acesso', drive: item.drive_folder_url ? 'Conectado' : 'Não conectado' };
    }));
    setLoading(false);
  }
  useEffect(() => { void loadClients(); }, []);

  function resetForm() {
    setCompany(''); setSegment(''); setContact(''); setDecisionTitle(''); setEmail(''); setService(''); setHours(''); setStartDate(''); setEndDate(''); setContractValue(''); setBillingFrequency('monthly'); setPaymentMethod('pix'); setBillingStatus('current'); setBillingDay(''); setNotes(''); setContractDate(''); setContractFile(null); setAddendumDate(''); setAddendumFile(null);
  }

  async function uploadAccountDocument(companyId: string, file: File, type: 'contract' | 'addendum', documentDate: string) {
    if (!supabase) return;
    const safeName = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '-');
    const path = `${companyId}/account/${type}-${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from('cali-workspace-private').upload(path, file, { upsert: false });
    if (uploadError) throw uploadError;
    const { data: sessionData } = await supabase.auth.getSession();
    const { error: documentError } = await supabase.from('account_documents').insert({ company_id: companyId, document_type: type, title: type === 'contract' ? 'Contrato assinado' : 'Aditivo contratual', document_date: documentDate || null, storage_path: path, client_visible: true, created_by: sessionData.session?.user.id ?? null });
    if (documentError) throw documentError;
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault(); setError(''); setCreated(''); if (!company.trim() || !contact.trim() || !email.trim()) return;
    const contracted = Number(hours.replace(',', '.') || 0); const value = currencyToNumber(contractValue);
    if (preview || !supabase) {
      setClients((current) => [...current, { id: `c-${Date.now()}`, name: company.trim(), contact: contact.trim(), email: email.trim(), service: service.trim() || 'A definir no ciclo', hours: `0h / ${contracted || 0}h`, usage: 0, nps: '—', access: 'Convite preparado', drive: 'Não conectado' }]);
      setCreated(`${company.trim()} foi adicionada à prévia com contrato, cobrança e acesso preparados.`); resetForm(); setOpen(false); return;
    }
    try {
      setSaving(true);
      const { data: companyId, error: createError } = await supabase.rpc('create_client_account', { p_company: company.trim(), p_contact: contact.trim(), p_email: email.trim().toLowerCase(), p_hours: contracted > 0 ? contracted : null, p_service_type: service.trim() || null });
      if (createError) throw createError;
      const id = String(companyId);
      const { error: updateError } = await supabase.from('companies').update({ segment: segment || null, decision_maker_title: decisionTitle || null, start_date: startDate || null, end_date: endDate || null, contract_value: value > 0 ? value : null, billing_frequency: billingFrequency || null, payment_method: paymentMethod || null, billing_status: billingStatus || null, billing_day: billingDay ? Number(billingDay) : null, payment_notes: notes || null }).eq('id', id);
      if (updateError) throw updateError;
      if (contractFile) await uploadAccountDocument(id, contractFile, 'contract', contractDate);
      if (addendumFile) await uploadAccountDocument(id, addendumFile, 'addendum', addendumDate);
      const createdCompany = company.trim(); resetForm(); setOpen(false); setCreated(`${createdCompany} foi cadastrada. A conta já está preparada para contrato, cobrança, horas e convite do decisor.`); await loadClients();
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Não foi possível cadastrar o cliente.'); } finally { setSaving(false); }
  }

  return (
    <Shell role="admin">
      <section className="page">
        <div className="eyebrow">CARTEIRA CALI</div><div className="page-heading"><div><h1>Clientes</h1><p>Cadastre a conta, defina o acesso principal e acompanhe horas, satisfação e integrações em um único lugar.</p></div><button className="primary" onClick={() => setOpen(true)}><Plus size={18} />Cadastrar cliente</button></div>
        {created && <div className="inline-notice success"><CheckCircle2 size={19} />{created}</div>}{error && <div className="inline-notice">{error}</div>}
        <section className="panel data-panel"><div className="data-head"><span>Cliente</span><span>Horas do ciclo</span><span>NPS</span><span>Acesso</span><span>Drive</span></div>{loading && <div className="data-loading"><Loader2 className="spin" size={20} />Carregando carteira…</div>}{empty && <div className="data-empty"><strong>Nenhum cliente cadastrado ainda.</strong><span>Cadastre o primeiro cliente para abrir o ciclo de trabalho no Workspace.</span></div>}{clients.map((client) => <div className="client-data-row" key={client.id}><div className="client-identity"><div className="company-mark">{client.name[0]}</div><div><strong>{client.name}</strong><span>{client.contact} · {client.email}</span><small>{client.service}</small></div></div><div className="hours-cell"><span>{client.hours}</span><Progress value={client.usage} /></div><strong className="nps-cell">{client.nps}</strong><span className={`status-pill ${client.access === 'Ativo' ? 'ok' : ''}`}><Mail size={14} />{client.access}</span><span className={`status-pill ${client.drive === 'Conectado' ? 'ok' : ''}`}><Cloud size={14} />{client.drive}</span></div>)}</section>
      </section>

      {open && <div className="modal-backdrop full-screen-modal" role="presentation"><form className="modal-card client-account-modal" role="dialog" aria-modal="true" onSubmit={handleCreate}>
        <button type="button" className="modal-close" onClick={() => setOpen(false)} aria-label="Fechar"><X size={20} /></button>
        <div className="account-modal-intro"><span className="section-kicker">NOVA CONTA</span><h2>Cadastrar cliente e organizar a gestão da conta</h2><p>Dados comerciais, contrato, cobrança, horas e acesso principal ficam conectados desde o início do trabalho.</p></div>

        <div className="account-form-sections">
          <section className="account-form-section"><div className="account-section-title"><BriefcaseBusiness size={19} /><div><strong>Empresa e serviço</strong><span>O que foi contratado e por quanto tempo.</span></div></div><div className="form-grid">
            <label className="stacked-label">Empresa<input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Nome da empresa" required /></label><label className="stacked-label">Segmento<input value={segment} onChange={(e) => setSegment(e.target.value)} placeholder="Ex.: Tecnologia" /></label>
            <label className="stacked-label">Serviço<select value={service} onChange={(e) => setService(e.target.value)}><option value="">Selecionar serviço</option><option>CALI Partner</option><option>CALI Full</option><option>Assessoria Estratégica Mensal</option><option>Mentoria para RH</option><option>Treinamento</option><option>Projeto de Estruturação</option><option>Solução personalizada</option></select></label><label className="stacked-label">Horas contratadas no ciclo<input inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value.replace(/[^0-9.,]/g, ''))} placeholder="30" /></label>
            <label className="stacked-label"><span className="label-with-icon"><CalendarDays size={15} />Início</span><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label><label className="stacked-label"><span className="label-with-icon"><CalendarDays size={15} />Término / renovação</span><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></label>
          </div></section>

          <section className="account-form-section"><div className="account-section-title"><UserRound size={19} /><div><strong>Decisor e acesso</strong><span>Um acesso principal por empresa nesta fase.</span></div></div><div className="form-grid"><label className="stacked-label">Nome do decisor<input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Nome completo" required /></label><label className="stacked-label">Cargo<input value={decisionTitle} onChange={(e) => setDecisionTitle(e.target.value)} placeholder="Ex.: CEO, Diretora de RH" /></label><label className="stacked-label wide">E-mail do acesso<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="decisor@empresa.com.br" required /></label></div></section>

          <section className="account-form-section"><div className="account-section-title"><Banknote size={19} /><div><strong>Contrato e cobrança</strong><span>Base para acompanhamento financeiro e cobranças futuras.</span></div></div><div className="form-grid">
            <label className="stacked-label">Valor acordado<input value={contractValue} onChange={(e) => setContractValue(e.target.value)} placeholder="R$ 5.800,00" /></label><label className="stacked-label">Frequência<select value={billingFrequency} onChange={(e) => setBillingFrequency(e.target.value)}><option value="monthly">Mensal</option><option value="single">Única</option><option value="quarterly">Trimestral</option><option value="custom">Personalizada</option></select></label>
            <label className="stacked-label">Forma de cobrança<select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}><option value="pix">Pix</option><option value="boleto">Boleto</option><option value="transfer">Transferência</option><option value="card">Cartão</option><option value="other">Outra</option></select></label><label className="stacked-label">Situação<select value={billingStatus} onChange={(e) => setBillingStatus(e.target.value)}><option value="current">Em dia</option><option value="pending">Pendente</option><option value="overdue">Em atraso</option><option value="not_configured">Ainda não configurada</option></select></label>
            <label className="stacked-label">Dia de vencimento<input inputMode="numeric" maxLength={2} value={billingDay} onChange={(e) => setBillingDay(e.target.value.replace(/\D/g, '').slice(0, 2))} placeholder="10" /></label><label className="stacked-label">Observação financeira<input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: NF antes do boleto" /></label>
          </div></section>

          <section className="account-form-section account-documents-section"><div className="account-section-title"><FileCheck2 size={19} /><div><strong>Documentos da conta</strong><span>Contrato assinado e aditivos ficam vinculados à empresa.</span></div></div><div className="document-upload-grid">
            <div className="account-upload-card"><div><strong>Contrato assinado</strong><span>{contractFile?.name || 'PDF, DOC ou imagem'}</span></div><label><Upload size={16} />Anexar<input type="file" accept=".pdf,.doc,.docx,image/*" onChange={(e) => setContractFile(e.target.files?.[0] ?? null)} /></label><input aria-label="Data do contrato" type="date" value={contractDate} onChange={(e) => setContractDate(e.target.value)} /></div>
            <div className="account-upload-card"><div><strong>Aditivo contratual</strong><span>{addendumFile?.name || 'Opcional neste cadastro'}</span></div><label><Upload size={16} />Anexar<input type="file" accept=".pdf,.doc,.docx,image/*" onChange={(e) => setAddendumFile(e.target.files?.[0] ?? null)} /></label><input aria-label="Data do aditivo" type="date" value={addendumDate} onChange={(e) => setAddendumDate(e.target.value)} /></div>
          </div></section>
        </div>

        <div className="account-modal-footer"><p>Depois do cadastro, a conta poderá concentrar cobranças, comprovantes, relatórios, contratos, aditivos e histórico do relacionamento.</p><div className="modal-actions"><button type="button" className="secondary" onClick={() => setOpen(false)}>Cancelar</button><button className="primary" type="submit" disabled={saving}>{saving ? <><Loader2 className="spin" size={17} />Salvando…</> : 'Cadastrar conta'}</button></div></div>
      </form></div>}
    </Shell>
  );
}
