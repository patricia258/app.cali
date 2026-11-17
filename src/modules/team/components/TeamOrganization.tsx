import { Button } from '../../../components/ds/Button';
import { Building2, ChevronRight, Users, X } from 'lucide-react';
import type { Change, Member } from '../../../domain/team';
import { dateLabel, monthLabel } from '../teamDateLabels';
import { statusLabels } from '../teamStatusLabels';
import { TeamOrganizationNode } from './TeamOrganizationNode';

type TeamOrganizationProps = {
  companyName: string;
  departments: string[];
  visibleMembers: Member[];
  members: Member[];
  changes: Change[];
  month: string;
  orgArea: string | null;
  showFormer: boolean;
  onSelectArea: (area: string | null) => void;
  onShowFormer: (show: boolean) => void;
  onOpenMember: (member: Member) => void;
};

export function TeamOrganization({
  companyName,
  departments,
  visibleMembers,
  members,
  changes,
  month,
  orgArea,
  showFormer,
  onSelectArea,
  onShowFormer,
  onOpenMember,
}: TeamOrganizationProps) {
  const active = visibleMembers.filter((item) => item.status !== 'terminated');
  const areas = departments
    .map((name) => {
      const people = active.filter((item) => item.department === name);
      return { name, people, leader: people.find((item) => item.is_leader) };
    })
    .filter((area) => area.people.length);
  const picked = areas.find((area) => area.name === orgArea);
  return (
    <div className="tw:min-h-112.5 tw:overflow-hidden tw:rounded-lg tw:border tw:border-solid tw:border-cali-sand-line tw:bg-cali-neutral-surface">
      <div className="tw:px-7 tw:py-6 tw:max-[37.5rem]:p-3.75 tw:[&_h2]:text-base tw:[&_p]:text-xs tw:[&_p]:text-cali-sand-text">
        <div className="tw:flex tw:items-center tw:justify-between tw:gap-3 tw:max-[37.5rem]:flex-col tw:max-[37.5rem]:items-start">
          <div>
            <h2>Estrutura organizacional</h2>
            <p>Explore áreas e pessoas por níveis, sem perder o contexto da empresa.</p>
          </div>
          <div className="tw:flex tw:gap-2">
            <Button variant="compactOutline" type="button" onClick={() => onSelectArea(null)}>
              Ver toda a estrutura
            </Button>
          </div>
        </div>
        <div className="tw:mx-1.25 tw:mt-8.25 tw:mb-3.75 tw:flex tw:flex-col tw:items-center">
          <TeamOrganizationNode root selected={!picked} onClick={() => onSelectArea(null)}>
            <Building2 size={19} />
            <strong>{companyName}</strong>
            <small>
              {active.length} {active.length === 1 ? 'colaborador' : 'colaboradores'} · {areas.length}{' '}
              {areas.length === 1 ? 'área' : 'áreas'}
            </small>
          </TeamOrganizationNode>
          <div className="tw:h-11 tw:w-px tw:bg-cali-sand-accent" />
          <div
            className="tw:relative tw:grid tw:w-full tw:grid-cols-[repeat(4,minmax(9.375rem,1fr))] tw:gap-3.5 tw:pt-6 tw:before:absolute tw:before:inset-x-[12%] tw:before:top-0 tw:before:h-px tw:before:bg-cali-sand-accent tw:data-[count=1]:before:hidden tw:data-[count=2]:before:inset-x-[37.5%] tw:data-[count=3]:before:inset-x-1/4 tw:min-[59.375rem]:data-[count=1]:grid-cols-[minmax(9.375rem,25%)] tw:min-[59.375rem]:data-[count=2]:grid-cols-[repeat(2,minmax(9.375rem,25%))] tw:min-[59.375rem]:data-[count=3]:grid-cols-[repeat(3,minmax(9.375rem,25%))] tw:data-[count=1]:justify-center tw:data-[count=2]:justify-center tw:data-[count=3]:justify-center tw:max-[59.375rem]:grid-cols-[repeat(2,minmax(8.75rem,1fr))] tw:max-[59.375rem]:gap-y-7 tw:max-[59.375rem]:before:hidden tw:max-[37.5rem]:gap-2.25"
            data-count={Math.min(areas.length, 4)}
          >
            {areas.map((area) => (
              <TeamOrganizationNode
                selected={orgArea === area.name}
                key={area.name}
                onClick={() => onSelectArea(area.name)}
              >
                <Users size={17} />
                <strong>{area.name}</strong>
                <small>
                  {area.people.length} {area.people.length === 1 ? 'pessoa' : 'pessoas'}
                </small>
                <span>{area.leader?.full_name || 'Liderança não informada'}</span>
                <span className="tw:mt-1.5 tw:flex tw:items-center tw:gap-0.75 tw:text-cali-red-strong!">
                  Explorar área <ChevronRight size={13} />
                </span>
              </TeamOrganizationNode>
            ))}
          </div>
        </div>
        {!areas.length && <div className="tw:p-7.5 tw:text-center tw:text-cali-sand-text">Nenhuma pessoa cadastrada nesta referência.</div>}
        {picked && (
          <section className="tw:mt-6 tw:rounded-cali-panel tw:border tw:border-solid tw:border-cali-sand-line tw:bg-cali-paper tw:p-4.5">
            <div className="tw:flex tw:items-center tw:justify-between tw:gap-3 tw:[&_small]:text-cali-micro tw:[&_small]:tracking-[0.0625rem] tw:[&_small]:text-cali-gold tw:[&_h3]:my-1.5 tw:[&_h3]:text-base tw:[&_p]:text-cali-micro tw:[&_p]:text-cali-sand-text">
              <div>
                <small>ÁREA SELECIONADA</small>
                <h3>{picked.name}</h3>
                <p>
                  {picked.people.length} {picked.people.length === 1 ? 'pessoa' : 'pessoas'} nesta referência
                </p>
              </div>
              <Button variant="compactOutline" type="button" onClick={() => onSelectArea(null)}>
                <X size={14} /> Fechar
              </Button>
            </div>
            {(() => {
              const inArea = (id: string) => members.find((item) => item.id === id)?.department === picked.name;
              const entries = changes.filter(
                (item) =>
                  item.change_type === 'admission' &&
                  inArea(item.member_id) &&
                  String(item.after_state?.admission_date || '').startsWith(month),
              ).length;
              const leaves = changes.filter(
                (item) =>
                  item.change_type === 'termination' &&
                  inArea(item.member_id) &&
                  String(item.after_state?.termination_date || '').startsWith(month),
              ).length;
              const working = picked.people.filter((item) => item.status === 'active');
              const months = working.map((item) => {
                const start = new Date(`${item.admission_date}T12:00:00`);
                const now = new Date();
                return Math.max(
                  0,
                  (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth(),
                );
              });
              const average = months.length
                ? Math.round(months.reduce((sum, value) => sum + value, 0) / months.length)
                : null;
              const former = visibleMembers.filter(
                (item) => item.department === picked.name && item.status === 'terminated',
              );
              return (
                <div className="tw:mt-4.5 tw:[&>p]:text-cali-micro tw:[&>p]:text-cali-sand-text">
                  <div className="tw:grid tw:grid-cols-4 tw:gap-2 tw:max-[40.625rem]:grid-cols-2 tw:[&_span]:flex tw:[&_span]:flex-col tw:[&_span]:gap-2 tw:[&_span]:rounded-md tw:[&_span]:border tw:[&_span]:border-solid tw:[&_span]:border-cali-line tw:[&_span]:bg-cali-sand-soft tw:[&_span]:p-3 tw:[&_strong]:text-lg tw:[&_strong]:text-cali-brand tw:[&_small]:text-cali-micro tw:[&_small]:text-cali-sand-text">
                    <span>
                      <strong>{working.length}</strong>
                      <small>quadros ativos · {monthLabel(month)}</small>
                    </span>
                    <span>
                      <strong>{entries}</strong>
                      <small>{entries === 1 ? 'entrada' : 'entradas'} no mês de referência</small>
                    </span>
                    <span>
                      <strong>{leaves}</strong>
                      <small>{leaves === 1 ? 'saída' : 'saídas'} no mês de referência</small>
                    </span>
                    <span>
                      <strong>{average == null ? '—' : `${Math.floor(average / 12)}a ${average % 12}m`}</strong>
                      <small>permanência média dos ativos</small>
                    </span>
                  </div>
                  <div className="tw:mt-3.25 tw:rounded-md tw:border tw:border-solid tw:border-cali-neutral-soft tw:[&>div]:grid tw:[&>div]:grid-cols-[1.2fr_1fr_0.7fr_1fr] tw:[&>div]:items-center tw:[&>div]:gap-2.5 tw:[&>div]:p-3 tw:[&>div]:text-cali-micro tw:[&>div:first-child]:bg-cali-sand-soft tw:[&>div:first-child]:text-cali-sand-text tw:[&>div:not(:first-child)]:border-t tw:[&>div:not(:first-child)]:border-solid tw:[&>div:not(:first-child)]:border-cali-sand-line tw:[&>div>span:nth-child(3)]:justify-self-start">
                    <div>
                      <span>Colaborador</span>
                      <span>Cargo</span>
                      <span>Status</span>
                      <span>Admissão</span>
                    </div>
                    {picked.people.map((member) => (
                      <div key={member.id}>
                        <span>{member.full_name}</span>
                        <span>{member.job_title}</span>
                        <span
                          className={`tw:inline-flex tw:w-max tw:rounded-sm tw:px-2 tw:py-1.25 tw:text-cali-micro ${member.status === 'active' ? 'tw:bg-cali-green-surface tw:text-cali-green-accent' : 'tw:bg-cali-red-surface tw:text-cali-red-accent'}`}
                        >
                          {statusLabels[member.status]}
                        </span>
                        <span>{dateLabel(member.admission_date)}</span>
                      </div>
                    ))}
                    {showFormer &&
                      former.map((member) => (
                        <div key={member.id}>
                          <span>{member.full_name}</span>
                          <span>{member.job_title}</span>
                          <span className="tw:inline-flex tw:w-max tw:rounded-sm tw:bg-cali-red-surface tw:px-2 tw:py-1.25 tw:text-cali-micro tw:text-cali-red-accent">
                            {statusLabels[member.status]}
                          </span>
                          <span>
                            {dateLabel(member.admission_date)}
                            {member.termination_date ? ` a ${dateLabel(member.termination_date)}` : ''}
                          </span>
                        </div>
                      ))}
                  </div>
                  <button
                    className="tw:flex tw:items-center tw:gap-1.25 tw:border-0 tw:bg-transparent tw:px-0 tw:py-3 tw:text-cali-micro tw:text-cali-brand"
                    onClick={() => onShowFormer(!showFormer)}
                  >
                    {showFormer ? 'Ocultar desligamentos' : 'Exibir desligamentos na estrutura'}{' '}
                    <ChevronRight size={14} />
                  </button>
                  {showFormer && !former.length && <p>Nenhum desligamento registrado nesta área.</p>}
                </div>
              );
            })()}
            <div className="tw:mt-4.25 tw:grid tw:grid-cols-2 tw:gap-2.25 tw:max-[59.375rem]:grid-cols-1 tw:[&_button]:flex tw:[&_button]:items-center tw:[&_button]:gap-3 tw:[&_button]:rounded-lg tw:[&_button]:border tw:[&_button]:border-solid tw:[&_button]:border-cali-sand-line tw:[&_button]:bg-cali-neutral-surface tw:[&_button]:p-3.25 tw:[&_button]:text-left tw:[&_button>span:first-child]:shrink-0 tw:[&_button>span:nth-child(2)]:flex tw:[&_button>span:nth-child(2)]:flex-1 tw:[&_button>span:nth-child(2)]:flex-col tw:[&_button>span:nth-child(2)]:gap-1.25 tw:[&_strong]:text-cali-label tw:[&_small]:text-cali-micro tw:[&_small]:text-cali-muted">
              {picked.people.map((member) => {
                const manager = members.find((item) => item.employee_code === member.manager_code);
                return (
                  <button onClick={() => onOpenMember(member)} key={member.id}>
                    <span className="avatar tw:overflow-hidden tw:rounded-lg tw:[&>*]:rounded-lg tw:[&_:is(img,video)]:block tw:[&_:is(img,video)]:size-full tw:[&_:is(img,video)]:object-cover">
                      {member.full_name
                        .split(' ')
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((part) => part[0]?.toUpperCase())
                        .join('')}
                    </span>
                    <span>
                      <strong>{member.full_name}</strong>
                      <small>
                        {member.job_title} · Gestão: {manager?.full_name || 'não informada'}
                      </small>
                    </span>
                    <ChevronRight size={14} />
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
