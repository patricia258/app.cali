import { ClientHomeLink } from './ClientHomeCard';
import { ClientHomeEmpty } from './ClientHomeEmpty';
import { useClientHomeTeam } from '../hooks/useClientHomeTeam';
import { Link } from '../../../../components/navigation/Link';
import { ArrowRight, CalendarDays, Star } from 'lucide-react';
import type { ClientHomePerson } from '../../../../api/client/home/team';
import { useWorkspaceAuth } from '../../../../auth/hooks/useWorkspaceAuth';

const statusTone = {
  ok: 'tw:bg-cali-teal-surface tw:text-cali-green-accent',
  vacation: 'tw:bg-cali-orange-surface tw:text-cali-gold-text',
  away: 'tw:bg-cali-red-surface tw:text-cali-red-accent',
};

function TeamStatus({ tone, children }: { tone: keyof typeof statusTone; children: React.ReactNode }) {
  return (
    <span
      className={`tw:rounded-md tw:px-2 tw:py-1.5 tw:text-cali-label tw:whitespace-nowrap ${statusTone[tone]}`}
    >
      {children}
    </span>
  );
}

function situation(person: ClientHomePerson) {
  if (person.status !== 'leave') return { label: 'Ativa', tone: 'ok' as const };
  return /f[eé]rias|vacation/i.test(person.leave_reason || '')
    ? { label: 'Férias', tone: 'vacation' as const }
    : { label: 'Afastada', tone: 'away' as const };
}

/** Read-only summary of the existing team. Company comes from the authenticated dashboard. */
export function ClientHomeTeam({ companyId }: { companyId?: string }) {
  const { user } = useWorkspaceAuth();
  const team = useClientHomeTeam(user?.id, companyId);
  const people = team.data ?? [];
  const state = !companyId || !user?.id || team.isError ? 'unavailable' : team.isPending ? 'loading' : 'ready';
  const today = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());
  const month = Number(today.find((part) => part.type === 'month')?.value);
  const year = Number(today.find((part) => part.type === 'year')?.value);
  const anniversaries = people.filter(
    (person) =>
      person.admission_date &&
      Number(person.admission_date.slice(5, 7)) === month &&
      Number(person.admission_date.slice(0, 4)) < year,
  );
  const counts = { ok: 0, vacation: 0, away: 0 };
  people.forEach((person) => {
    counts[situation(person).tone]++;
  });
  return (
    <section
      className="tw:flex tw:min-w-0 tw:flex-col tw:rounded-[0.923rem] tw:border tw:border-solid tw:border-cali-sand-line tw:bg-cali-neutral-surface tw:p-5.5"
      aria-labelledby="home-team-title"
    >
      <div className="tw:flex tw:items-start tw:justify-between tw:gap-3 tw:[&_small]:text-xs tw:[&_small]:font-extrabold tw:[&_small]:tracking-[0.092rem] tw:[&_small]:text-cali-gold-accent tw:[&_h3]:my-2 tw:[&_h3]:text-xl tw:[&_p]:m-0 tw:[&_p]:text-xs tw:[&_p]:text-cali-sand-text">
        <div>
          <small>
            EQUIPE ·{' '}
            {new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'America/Sao_Paulo' })
              .format(new Date())
              .toUpperCase()}
          </small>
          <h3 id="home-team-title">Pessoas e datas importantes</h3>
          <p>Uma leitura rápida do time da empresa.</p>
        </div>
        <ClientHomeLink className="tw:shrink-0" to="/cliente/equipe">
          Ver equipe <ArrowRight size={13} />
        </ClientHomeLink>
      </div>
      <div className="tw:mt-2.5 tw:flex tw:flex-wrap tw:items-center tw:gap-2 tw:border-0 tw:border-b tw:border-solid tw:border-cali-neutral-soft tw:pt-4 tw:pb-3.5 tw:[&>div]:mr-auto tw:[&>div]:flex tw:[&>div]:items-baseline tw:[&>div]:gap-1.5 tw:[&_b]:text-cali-title-lg tw:[&_b]:text-cali-brand tw:[&>div>span]:text-xs tw:[&>div>span]:text-cali-sand-text">
        <div>
          <b>{state === 'ready' ? people.length : '—'}</b>
          <span>colaboradores</span>
        </div>
        {(['ok', 'vacation', 'away'] as const).map((tone) => (
          <TeamStatus key={tone} tone={tone}>
            {state === 'ready' ? counts[tone] : '—'}{' '}
            {tone === 'ok' ? 'ativos' : tone === 'vacation' ? 'em férias' : 'afastados'}
          </TeamStatus>
        ))}
      </div>
      <div className="tw:[&_strong]:text-sm tw:[&_small]:text-cali-label tw:[&_small]:text-cali-sand-text">
        {state !== 'ready' ? (
          <ClientHomeEmpty as="p">
            {state === 'loading' ? 'Consultando equipe…' : 'Equipe indisponível nesta sessão.'}
          </ClientHomeEmpty>
        ) : !people.length ? (
          <ClientHomeEmpty as="p">Nenhuma pessoa cadastrada na equipe.</ClientHomeEmpty>
        ) : (
          people.slice(0, 3).map((person, index) => {
            const status = situation(person);
            return (
              <Link
                key={person.id}
                to="/cliente/equipe"
                className="tw:flex tw:w-full tw:items-center tw:gap-3 tw:border-0 tw:border-b tw:border-solid tw:border-cali-neutral-soft tw:py-2.5 tw:text-cali-neutral-strong"
              >
                <span
                  className={`tw:grid tw:size-9.5 tw:shrink-0 tw:place-items-center tw:rounded-lg tw:text-xs tw:font-extrabold ${index === 1 ? 'tw:bg-cali-blue-soft tw:text-cali-blue-text' : index === 2 ? 'tw:bg-cali-burgundy-surface tw:text-cali-burgundy-line' : 'tw:bg-cali-sand-line tw:text-cali-brand'}`}
                >
                  {person.full_name
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((name) => name[0])
                    .join('')}
                </span>
                <span className="tw:flex tw:min-w-0 tw:flex-1 tw:flex-col tw:gap-1">
                  <strong>{person.full_name}</strong>
                  <small>
                    {person.department || 'Área não informada'} · {status.label}
                  </small>
                </span>
                <TeamStatus tone={status.tone}>{status.label}</TeamStatus>
              </Link>
            );
          })
        )}
      </div>
      <div className="tw:mt-4 tw:grid tw:grid-cols-2 tw:gap-3 tw:max-[37.5rem]:grid-cols-1 tw:[&>div]:flex tw:[&>div]:min-w-0 tw:[&>div]:items-center tw:[&>div]:gap-2.5 tw:[&>div]:rounded-cali-compact-control tw:[&>div]:bg-cali-surface-soft tw:[&>div]:p-3 tw:[&>div>span:last-child]:flex tw:[&>div>span:last-child]:min-w-0 tw:[&>div>span:last-child]:flex-col tw:[&>div>span:last-child]:gap-1 tw:[&_strong]:text-xs tw:[&_small]:text-cali-label tw:[&_small]:text-cali-sand-text">
        <div>
          <span className="tw:grid tw:size-8.5 tw:shrink-0 tw:place-items-center tw:rounded-lg tw:bg-cali-violet-surface tw:text-cali-violet-text">
            <CalendarDays size={15} />
          </span>
          <span>
            <strong>Aniversário do mês</strong>
            <small>Datas de aniversário ainda não disponíveis.</small>
          </span>
        </div>
        <div>
          <span className="tw:grid tw:size-8.5 tw:shrink-0 tw:place-items-center tw:rounded-lg tw:bg-cali-gold-soft tw:text-cali-gold-accent">
            <Star size={15} />
          </span>
          <span>
            <strong>Aniversário de empresa</strong>
            <small>
              {state !== 'ready'
                ? 'Aguardando consulta da equipe.'
                : anniversaries.length
                  ? anniversaries
                      .map(
                        (person) =>
                          `${person.full_name.split(' ')[0]} · ${year - Number(person.admission_date!.slice(0, 4))} anos em ${person.admission_date!.slice(8, 10)}/${person.admission_date!.slice(5, 7)}`,
                      )
                      .join('; ')
                  : 'Nenhum aniversário de empresa neste mês.'}
            </small>
          </span>
        </div>
      </div>
    </section>
  );
}
