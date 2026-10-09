import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Person = { id: string; full_name: string; department: string | null; admission_date: string | null; status: string; leave_reason: string | null; archived_at: string | null };
const professionalFields = 'id,full_name,department,admission_date,status,leave_reason,archived_at';
function situation(person: Person) {
  if (person.status !== 'leave') return { label: 'Ativa', tone: 'ok' };
  return /f[eé]rias|vacation/i.test(person.leave_reason || '') ? { label: 'Férias', tone: 'vacation' } : { label: 'Afastada', tone: 'away' };
}

/** Read-only summary of the existing team. Company comes from the authenticated dashboard. */
export function ClientHomeTeam({ companyId }: { companyId?: string }) {
  const [people, setPeople] = useState<Person[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  useEffect(() => {
    let alive = true;
    setPeople([]);
    if (!companyId || !supabase) { setState('unavailable'); return; }
    const client = supabase;
    setState('loading');
    async function load() {
      try {
        const rows: Person[] = [];
        for (let start = 0; ; start += 500) {
          const result = await client.from('team_members').select(professionalFields).eq('company_id', companyId).order('full_name').range(start, start + 499);
          if (result.error) throw result.error;
          rows.push(...(result.data || []) as Person[]);
          if ((result.data?.length || 0) < 500) break;
        }
        if (alive) { setPeople(rows.filter(person => !person.archived_at && person.status !== 'terminated')); setState('ready'); }
      } catch { if (alive) setState('unavailable'); }
    }
    void load();
    return () => { alive = false; };
  }, [companyId]);
  const today = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).formatToParts(new Date());
  const month = Number(today.find(part => part.type === 'month')?.value);
  const year = Number(today.find(part => part.type === 'year')?.value);
  const anniversaries = people.filter(person => person.admission_date && Number(person.admission_date.slice(5, 7)) === month && Number(person.admission_date.slice(0, 4)) < year);
  const counts = { ok: 0, vacation: 0, away: 0 };
  people.forEach(person => { counts[situation(person).tone as keyof typeof counts]++; });
  return <section className="ch-team-panel" aria-labelledby="home-team-title">
    <div className="ch-team-panel-head"><div><small>EQUIPE · {new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'America/Sao_Paulo' }).format(new Date()).toUpperCase()}</small><h3 id="home-team-title">Pessoas e datas importantes</h3><p>Uma leitura rápida do time da empresa.</p></div><Link className="ch-link" to="/cliente/equipe">Ver equipe <ArrowRight size={13} /></Link></div>
    <div className="ch-team-overview"><div><b>{state === 'ready' ? people.length : '—'}</b><span>colaboradores</span></div>{(['ok', 'vacation', 'away'] as const).map(tone => <span key={tone} className={`ch-team-status ${tone}`}>{state === 'ready' ? counts[tone] : '—'} {tone === 'ok' ? 'ativos' : tone === 'vacation' ? 'em férias' : 'afastados'}</span>)}</div>
    <div className="ch-team-members">{state !== 'ready' ? <p className="ch-empty">{state === 'loading' ? 'Consultando equipe…' : 'Equipe indisponível nesta sessão.'}</p> : !people.length ? <p className="ch-empty">Nenhuma pessoa cadastrada na equipe.</p> : people.slice(0, 3).map((person, index) => { const status = situation(person); return <Link key={person.id} to="/cliente/equipe" className="ch-team-person"><span className={`ch-team-avatar ${index === 1 ? 'blue' : index === 2 ? 'rose' : ''}`}>{person.full_name.split(' ').filter(Boolean).slice(0, 2).map(name => name[0]).join('')}</span><span><strong>{person.full_name}</strong><small>{person.department || 'Área não informada'} · {status.label}</small></span><span className={`ch-team-status ${status.tone}`}>{status.label}</span></Link>; })}</div>
    <div className="ch-team-milestones"><div><span className="ch-team-milestone-icon"><CalendarDays size={15} /></span><span><strong>Aniversário do mês</strong><small>Data de nascimento não disponível no cadastro oficial.</small></span></div><div><span className="ch-team-milestone-icon gold"><Star size={15} /></span><span><strong>Aniversário de empresa</strong><small>{state !== 'ready' ? 'Aguardando consulta da equipe.' : anniversaries.length ? anniversaries.map(person => `${person.full_name.split(' ')[0]} · ${year - Number(person.admission_date!.slice(0, 4))} anos em ${person.admission_date!.slice(8, 10)}/${person.admission_date!.slice(5, 7)}`).join('; ') : 'Nenhum aniversário de empresa neste mês.'}</small></span></div></div>
  </section>;
}
