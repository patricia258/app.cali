import { FormEvent, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Cloud, Loader2, Mail, Plus, X } from 'lucide-react';
import { Progress, Shell } from '../../components/WorkspaceShell';
import { supabase } from '../../lib/supabase';

type ClientRow = {
  id: string;
  name: string;
  contact: string;
  email: string;
  service: string;
  hours: string;
  usage: number;
  nps: string;
  access: string;
  drive: string;
};

const previewClients: ClientRow[] = [
  { id: 'c1', name: 'Grupo Aurora', contact: 'Marina Costa', email: 'marina@grupoaurora.com.br', service: 'Assessoria Estratégica Mensal', hours: '24h10 / 30h', usage: 81, nps: '4,9', access: 'Ativo', drive: 'Não conectado' },
  { id: 'c2', name: 'Novatech', contact: 'Ricardo Martins', email: 'ricardo@novatech.com.br', service: 'Assessoria Estratégica Mensal', hours: '32h50 / 40h', usage: 82, nps: '4,7', access: 'Ativo', drive: 'Conectado' },
  { id: 'c3', name: 'Studio Norte', contact: 'Aline Rocha', email: 'aline@studionorte.com.br', service: 'Projeto de Estruturação', hours: '11h25 / 20h', usage: 57, nps: '5,0', access: 'Ativo', drive: 'Não conectado' },
];

function monthBounds() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const date = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  return { start: date(start), next: date(next) };
}

function formatHours(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h${String(rest).padStart(2, '0')}` : `${hours}h`;
}

export function AdminClientsPage() {
  const preview = sessionStorage.getItem('cali-preview-role') === 'admin';
  const [clients, setClients] = useState<ClientRow[]>(preview ? previewClients : []);
  const [loading, setLoading] = useState(!preview);
  const [open, setOpen] = useState(false);
  const [company, setCompany] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [hours, setHours] = useState('');
  const [service, setService] = useState('');
  const [created, setCreated] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const empty = useMemo(() => !loading && clients.length === 0, [clients.length, loading]);

  async function loadClients() {
    if (preview || !supabase) return;
    setLoading(true);
    setError('');

    const { start, next } = monthBounds();
    const [companiesResult, invitesResult, profilesResult, hoursResult, npsResult] = await Promise.all([
      supabase.from('companies').select('id, display_name, service_type, monthly_hours_contracted, status, drive_folder_url').order('created_at', { ascending: false }),
      supabase.from('client_invites').select('company_id, email, full_name, accepted_at, active').eq('active', true),
      supabase.from('profiles').select('company_id, active, role').eq('role', 'client').eq('active', true),
      supabase.from('hour_entries').select('company_id, minutes').gte('work_date', start).lt('work_date', next),
      supabase.from('nps_responses').select('company_id, score'),
    ]);

    if (companiesResult.error) {
      setError(`Não consegui carregar a carteira: ${companiesResult.error.message}`);
      setLoading(false);
      return;
    }

    const invites = invitesResult.data ?? [];
    const profiles = profilesResult.data ?? [];
    const hourRows = hoursResult.data ?? [];
    const npsRows = npsResult.data ?? [];

    const rows = (companiesResult.data ?? []).map((item) => {
      const invite = invites.find((entry) => entry.company_id === item.id);
      const hasClientProfile = profiles.some((entry) => entry.company_id === item.id);
      const consumedMinutes = hourRows.filter((entry) => entry.company_id === item.id).reduce((total, entry) => total + (entry.minutes ?? 0), 0);
      const contracted = Number(item.monthly_hours_contracted ?? 0);
      const scores = npsRows.filter((entry) => entry.company_id === item.id).map((entry) => Number(entry.score));
      const average = scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null;
      const usage = contracted > 0 ? Math.min(100, Math.round((consumedMinutes / (contracted * 60)) * 100)) : 0;

      return {
        id: item.id,
        name: item.display_name,
        contact: invite?.full_name ?? 'Contato principal não definido',
        email: invite?.email ?? '—',
        service: item.service_type ?? 'Serviço a definir',
        hours: `${formatHours(consumedMinutes)} / ${contracted ? `${contracted}h` : '—'}`,
        usage,
        nps: average === null ? '—' : average.toFixed(1).replace('.', ','),
        access: hasClientProfile ? 'Ativo' : invite ? 'Convite preparado' : 'Sem acesso',
        drive: item.drive_folder_url ? 'Conectado' : 'Não conectado',
      } satisfies ClientRow;
    });

    setClients(rows);
    setLoading(false);
  }

  useEffect(() => {
    void loadClients();
  }, []);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError('');
    setCreated('');
    if (!company.trim() || !contact.trim() || !email.trim()) return;

    const contracted = Number(hours.replace(',', '.') || 0);

    if (preview || !supabase) {
      setClients((current) => [
        ...current,
        {
          id: `c-${Date.now()}`,
          name: company.trim(),
          contact: contact.trim(),
          email: email.trim(),
          service: service.trim() || 'A definir no ciclo',
          hours: `0h / ${contracted || 0}h`,
          usage: 0,
          nps: '—',
          access: 'Convite preparado',
          drive: 'Não conectado',
        },
      ]);
      setCreated(`${company.trim()} foi adicionada à prévia.`);
      setCompany(''); setContact(''); setEmail(''); setHours(''); setService(''); setOpen(false);
      return;
    }

    try {
      setSaving(true);
      const { error: createError } = await supabase.rpc('create_client_account', {
        p_company: company.trim(),
        p_contact: contact.trim(),
        p_email: email.trim().toLowerCase(),
        p_hours: contracted > 0 ? contracted : null,
        p_service_type: service.trim() || null,
      });
      if (createError) throw createError;

      const createdCompany = company.trim();
      setCompany(''); setContact(''); setEmail(''); setHours(''); setService(''); setOpen(false);
      setCreated(`${createdCompany} foi cadastrada no Workspace. O acesso principal está preparado para a etapa de convite.`);
      await loadClients();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível cadastrar o cliente.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Shell role="admin">
      <section className="page">
        <div className="eyebrow">CARTEIRA CALI</div>
        <div className="page-heading">
          <div><h1>Clientes</h1><p>Cadastre a conta, defina o acesso principal e acompanhe horas, satisfação e integrações em um único lugar.</p></div>
          <button className="primary" onClick={() => setOpen(true)}><Plus size={18} />Cadastrar cliente</button>
        </div>

        {created && <div className="inline-notice success"><CheckCircle2 size={19} />{created}</div>}
        {error && <div className="inline-notice">{error}</div>}

        <section className="panel data-panel">
          <div className="data-head"><span>Cliente</span><span>Horas do ciclo</span><span>NPS</span><span>Acesso</span><span>Drive</span></div>
          {loading && <div className="data-loading"><Loader2 className="spin" size={20} />Carregando carteira…</div>}
          {empty && <div className="data-empty"><strong>Nenhum cliente cadastrado ainda.</strong><span>Cadastre o primeiro cliente para abrir o ciclo de trabalho no Workspace.</span></div>}
          {clients.map((client) => (
            <div className="client-data-row" key={client.id}>
              <div className="client-identity"><div className="company-mark">{client.name[0]}</div><div><strong>{client.name}</strong><span>{client.contact} · {client.email}</span><small>{client.service}</small></div></div>
              <div className="hours-cell"><span>{client.hours}</span><Progress value={client.usage} /></div>
              <strong className="nps-cell">{client.nps}</strong>
              <span className={`status-pill ${client.access === 'Ativo' ? 'ok' : ''}`}><Mail size={14} />{client.access}</span>
              <span className={`status-pill ${client.drive === 'Conectado' ? 'ok' : ''}`}><Cloud size={14} />{client.drive}</span>
            </div>
          ))}
        </section>
      </section>

      {open && (
        <div className="modal-backdrop" role="presentation">
          <form className="modal-card" role="dialog" aria-modal="true" onSubmit={handleCreate}>
            <button type="button" className="modal-close" onClick={() => setOpen(false)} aria-label="Fechar"><X size={20} /></button>
            <span className="section-kicker">NOVO CLIENTE</span>
            <h2>Cadastrar e preparar acesso</h2>
            <p>O cliente terá um único acesso principal. O convite por link seguro será disparado na próxima etapa do fluxo.</p>
            <div className="form-grid">
              <label className="stacked-label">Empresa<input value={company} onChange={(event) => setCompany(event.target.value)} placeholder="Nome da empresa" /></label>
              <label className="stacked-label">Contato principal<input value={contact} onChange={(event) => setContact(event.target.value)} placeholder="Nome do decisor" /></label>
              <label className="stacked-label wide">E-mail do acesso<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="decisor@empresa.com.br" /></label>
              <label className="stacked-label">Serviço<input value={service} onChange={(event) => setService(event.target.value)} placeholder="Ex.: CALI Partner" /></label>
              <label className="stacked-label">Horas contratadas no ciclo<input inputMode="decimal" value={hours} onChange={(event) => setHours(event.target.value.replace(/[^0-9.,]/g, ''))} placeholder="30" /></label>
            </div>
            <div className="modal-actions"><button type="button" className="secondary" onClick={() => setOpen(false)}>Cancelar</button><button className="primary" type="submit" disabled={saving}>{saving ? <><Loader2 className="spin" size={17} />Salvando…</> : 'Cadastrar cliente'}</button></div>
          </form>
        </div>
      )}
    </Shell>
  );
}
