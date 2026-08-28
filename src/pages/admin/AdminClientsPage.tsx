import { FormEvent, useState } from 'react';
import { CheckCircle2, Cloud, Mail, Plus, X } from 'lucide-react';
import { Progress, Shell } from '../../components/WorkspaceShell';

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

const initialClients: ClientRow[] = [
  { id: 'c1', name: 'Grupo Aurora', contact: 'Marina Costa', email: 'marina@grupoaurora.com.br', service: 'Assessoria Estratégica Mensal', hours: '24h10 / 30h', usage: 81, nps: '4,9', access: 'Ativo', drive: 'Não conectado' },
  { id: 'c2', name: 'Novatech', contact: 'Ricardo Martins', email: 'ricardo@novatech.com.br', service: 'Assessoria Estratégica Mensal', hours: '32h50 / 40h', usage: 82, nps: '4,7', access: 'Ativo', drive: 'Conectado' },
  { id: 'c3', name: 'Studio Norte', contact: 'Aline Rocha', email: 'aline@studionorte.com.br', service: 'Projeto de Estruturação', hours: '11h25 / 20h', usage: 57, nps: '5,0', access: 'Ativo', drive: 'Não conectado' },
];

export function AdminClientsPage() {
  const [clients, setClients] = useState(initialClients);
  const [open, setOpen] = useState(false);
  const [company, setCompany] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [hours, setHours] = useState('');
  const [created, setCreated] = useState('');

  function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!company.trim() || !contact.trim() || !email.trim()) return;
    const contracted = Number(hours || 0);
    setClients((current) => [
      ...current,
      {
        id: `c-${Date.now()}`,
        name: company.trim(),
        contact: contact.trim(),
        email: email.trim(),
        service: 'A definir no ciclo',
        hours: `0h / ${contracted || 0}h`,
        usage: 0,
        nps: '—',
        access: 'Convite preparado',
        drive: 'Não conectado',
      },
    ]);
    setCreated(`${company.trim()} foi cadastrada. O convite será enviado por link seguro quando o backend estiver conectado.`);
    setCompany(''); setContact(''); setEmail(''); setHours(''); setOpen(false);
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

        <section className="panel data-panel">
          <div className="data-head"><span>Cliente</span><span>Horas do ciclo</span><span>NPS</span><span>Acesso</span><span>Drive</span></div>
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
            <h2>Cadastrar e preparar convite</h2>
            <p>O cliente terá um único acesso principal. Ele receberá um link seguro e não precisará criar senha.</p>
            <div className="form-grid">
              <label className="stacked-label">Empresa<input value={company} onChange={(event) => setCompany(event.target.value)} placeholder="Nome da empresa" /></label>
              <label className="stacked-label">Contato principal<input value={contact} onChange={(event) => setContact(event.target.value)} placeholder="Nome do decisor" /></label>
              <label className="stacked-label wide">E-mail do acesso<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="decisor@empresa.com.br" /></label>
              <label className="stacked-label">Horas contratadas no ciclo<input inputMode="decimal" value={hours} onChange={(event) => setHours(event.target.value.replace(/[^0-9.,]/g, ''))} placeholder="30" /></label>
            </div>
            <div className="modal-actions"><button type="button" className="secondary" onClick={() => setOpen(false)}>Cancelar</button><button className="primary" type="submit">Cadastrar cliente</button></div>
          </form>
        </div>
      )}
    </Shell>
  );
}
