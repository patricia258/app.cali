import { ClientHomeLink } from './ClientHomeCard';
import { ClientHomeEmpty } from './ClientHomeEmpty';
import { useClientHomeTeam } from '../hooks/useClientHomeTeam';
import { Link } from '../../../../components/navigation/Link';
import { ArrowRight, CalendarDays, Star } from 'lucide-react';
import type { ClientHomePerson } from '../../../../api/client/home/team';
import { useWorkspaceAuth } from '../../../../auth/hooks/useWorkspaceAuth';

const statusTone = {
  ok: 'tw:bg-[#e6f5ee] tw:text-[#2c8e67]',
  vacation: 'tw:bg-[#fff0d7] tw:text-[#996d2f]',
  away: 'tw:bg-[#fce9ed] tw:text-[#b34c67]',
};

function TeamStatus({ tone, children }: { tone: keyof typeof statusTone; children: React.ReactNode }) {
  return (
    <span
      className={`tw:rounded-[0.385rem] tw:px-[0.538rem] tw:py-[0.385rem] tw:text-[0.692rem] tw:whitespace-nowrap ${statusTone[tone]}`}
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
      className="tw:flex tw:min-w-0 tw:flex-col tw:rounded-[0.923rem] tw:border tw:border-solid tw:border-[#e9ded4] tw:bg-white tw:p-[1.385rem]"
      aria-labelledby="home-team-title"
    >
      <div className="tw:flex tw:items-start tw:justify-between tw:gap-[0.769rem] tw:[&_small]:text-[0.769rem] tw:[&_small]:font-extrabold tw:[&_small]:tracking-[0.092rem] tw:[&_small]:text-[#ab8151] tw:[&_h3]:my-[0.462rem] tw:[&_h3]:text-[1.308rem] tw:[&_p]:m-0 tw:[&_p]:text-[0.769rem] tw:[&_p]:text-[#95877d]">
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
      <div className="tw:mt-[0.615rem] tw:flex tw:flex-wrap tw:items-center tw:gap-[0.538rem] tw:border-0 tw:border-b tw:border-solid tw:border-[#f0e8e2] tw:pt-4 tw:pb-[0.923rem] tw:[&>div]:mr-auto tw:[&>div]:flex tw:[&>div]:items-baseline tw:[&>div]:gap-[0.385rem] tw:[&_b]:text-[1.769rem] tw:[&_b]:text-cali-brand tw:[&>div>span]:text-[0.769rem] tw:[&>div>span]:text-[#8d8177]">
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
      <div className="tw:[&_strong]:text-[0.846rem] tw:[&_small]:text-[0.692rem] tw:[&_small]:text-[#92857b]">
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
                className="tw:flex tw:w-full tw:items-center tw:gap-[0.692rem] tw:border-0 tw:border-b tw:border-solid tw:border-[#f3ece8] tw:py-[0.615rem] tw:text-[#302b2b]"
              >
                <span
                  className={`tw:grid tw:size-[2.385rem] tw:shrink-0 tw:place-items-center tw:rounded-[0.538rem] tw:text-[0.769rem] tw:font-extrabold ${index === 1 ? 'tw:bg-[#dce9f6] tw:text-[#466b93]' : index === 2 ? 'tw:bg-[#f6e0e8] tw:text-[#95556b]' : 'tw:bg-[#e9d7d4] tw:text-cali-brand'}`}
                >
                  {person.full_name
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((name) => name[0])
                    .join('')}
                </span>
                <span className="tw:flex tw:min-w-0 tw:flex-1 tw:flex-col tw:gap-[0.308rem]">
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
      <div className="tw:mt-4 tw:grid tw:grid-cols-2 tw:gap-[0.692rem] tw:max-[37.5rem]:grid-cols-1 tw:[&>div]:flex tw:[&>div]:min-w-0 tw:[&>div]:items-center tw:[&>div]:gap-[0.615rem] tw:[&>div]:rounded-[0.615rem] tw:[&>div]:bg-[#faf7f4] tw:[&>div]:p-[0.692rem] tw:[&>div>span:last-child]:flex tw:[&>div>span:last-child]:min-w-0 tw:[&>div>span:last-child]:flex-col tw:[&>div>span:last-child]:gap-[0.231rem] tw:[&_strong]:text-[0.769rem] tw:[&_small]:text-[0.692rem] tw:[&_small]:text-[#8c8076]">
        <div>
          <span className="tw:grid tw:size-[2.154rem] tw:shrink-0 tw:place-items-center tw:rounded-[0.538rem] tw:bg-[#efeaf7] tw:text-[#8764a4]">
            <CalendarDays size={15} />
          </span>
          <span>
            <strong>Aniversário do mês</strong>
            <small>Datas de aniversário ainda não disponíveis.</small>
          </span>
        </div>
        <div>
          <span className="tw:grid tw:size-[2.154rem] tw:shrink-0 tw:place-items-center tw:rounded-[0.538rem] tw:bg-[#fff0d5] tw:text-[#ba8b32]">
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
