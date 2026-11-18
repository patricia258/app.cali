import { Search } from 'lucide-react';
import { Input } from '../../../components/ds/Input';
import { Select } from '../../../components/ds/Select';
import { projectPlanningLabels, type ProjectPlanningStatus, type WorkspaceProject } from '../../../domain/projects';

type StatusFilter = ProjectPlanningStatus | 'all';
const projectMonth = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' });

type Props = {
  projects: WorkspaceProject[];
  selectedProject: WorkspaceProject;
  status: StatusFilter;
  query: string;
  onCompanyChange: (companyId: string) => void;
  onProjectChange: (projectId: string) => void;
  onStatusChange: (status: StatusFilter) => void;
  onQueryChange: (query: string) => void;
};

function projectLabel({ name, startDate }: WorkspaceProject) {
  if (!startDate) return name;
  const date = new Date(`${String(startDate).slice(0, 10)}T12:00:00`);
  const month = projectMonth.format(date);
  return `${name} · ${month.replace('.', '').replace(' de ', '/')}`;
}

export function ProjectFilters({ projects, selectedProject, status, query, onCompanyChange, onProjectChange, onStatusChange, onQueryChange }: Props) {
  const companies = new Map(projects.map(({ companyId, company }) => [companyId, company]));
  const companyProjects = projects.filter(({ companyId }) => companyId === selectedProject.companyId);

  return (
    <div className="tw:mb-5 tw:flex tw:flex-wrap tw:items-center tw:gap-4.5">
      <label className="tw:m-0 tw:inline-flex tw:min-w-0 tw:max-w-full tw:items-center tw:gap-3 tw:text-sm tw:text-cali-muted">
        Empresa
        <Select variant="filter" className="tw:min-h-11 tw:max-w-86 tw:font-bold! tw:text-cali-brand!" aria-label="Empresa"
          value={selectedProject.companyId} onChange={(event) => onCompanyChange(event.target.value)}>
          {Array.from(companies, ([id, name]) => <option key={id} value={id}>{name}</option>)}
        </Select>
      </label>
      <label className="tw:m-0 tw:inline-flex tw:min-w-0 tw:max-w-full tw:items-center tw:gap-3 tw:text-sm tw:text-cali-muted">
        Projeto
        <Select variant="filter" className="tw:min-h-11 tw:max-w-86 tw:font-bold! tw:text-cali-brand!" aria-label="Projeto"
          value={selectedProject.id} onChange={(event) => onProjectChange(event.target.value)}>
          {companyProjects.map((project) => <option key={project.id} value={project.id}>{projectLabel(project)}</option>)}
        </Select>
      </label>
      <div className="tw:ml-auto tw:flex tw:min-w-0 tw:max-w-full tw:flex-wrap tw:items-center tw:justify-end tw:gap-2.5 tw:min-[65rem]:flex-nowrap">
        <Select variant="filter" className="tw:min-h-11" aria-label="Situação do cronograma" value={status} onChange={(event) => onStatusChange(event.target.value as StatusFilter)}>
          <option value="all">Todos os status</option>
          {Object.entries(projectPlanningLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </Select>
        <label className="tw:flex tw:min-h-11 tw:w-70 tw:min-w-0 tw:max-w-full tw:flex-none tw:items-center tw:gap-2 tw:rounded-lg tw:border tw:border-solid tw:border-cali-input-line tw:bg-cali-input tw:px-3 tw:text-cali-muted tw:focus-within:outline-2 tw:focus-within:outline-offset-2 tw:focus-within:outline-cali-gold-accent">
          <Search size={14} className="tw:shrink-0" aria-hidden="true" />
          <Input variant="bare" type="search" className="tw:flex-1 tw:self-stretch tw:text-sm! tw:focus:outline-none" aria-label="Buscar projeto ou protocolo"
            value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Buscar projeto ou protocolo" />
        </label>
      </div>
    </div>
  );
}
