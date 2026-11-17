import { Button } from '../../../components/ds/Button';
import { ArrowRight, Download, Search, SlidersHorizontal, UsersRound } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Member } from '../../../domain/team';
import { columnLabels, type ColumnKey } from '../teamDirectoryColumns';
import { TeamAvatar } from './TeamAvatar';

type TeamDirectoryProps = {
  search: string;
  department: string;
  status: string;
  departments: string[];
  columns: ColumnKey[];
  columnOpen: boolean;
  filtered: Member[];
  hasMembers: boolean;
  onSearch: (value: string) => void;
  onDepartment: (value: string) => void;
  onStatus: (value: string) => void;
  onColumnMenuToggle: () => void;
  onColumnToggle: (key: ColumnKey) => void;
  onOpenMember: (member: Member) => void;
  onPrint: () => void;
  renderCell: (member: Member, key: ColumnKey) => ReactNode;
};

export function TeamDirectory({
  search,
  department,
  status,
  departments,
  columns,
  columnOpen,
  filtered,
  hasMembers,
  onSearch,
  onDepartment,
  onStatus,
  onColumnMenuToggle,
  onColumnToggle,
  onOpenMember,
  onPrint,
  renderCell,
}: TeamDirectoryProps) {
  return (
    <>
      <div className="toolbar tw:mb-4.5 tw:flex tw:gap-3 tw:max-[53.125rem]:flex-wrap tw:[&>select]:min-w-40 tw:[&>select]:rounded-lg tw:[&>select]:border tw:[&>select]:border-solid tw:[&>select]:border-cali-line tw:[&>select]:bg-cali-neutral-surface tw:[&>select]:px-3.5 tw:[&>select]:py-3 tw:[&>select]:text-sm/[inherit] tw:[&>select]:text-cali-neutral-accent">
        <label className="tw:flex tw:min-w-80 tw:flex-1 tw:items-center tw:gap-3 tw:rounded-lg tw:border tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface tw:px-3.5 tw:max-[53.125rem]:min-w-full tw:[&_svg]:text-cali-sand-text tw:[&_input]:w-full tw:[&_input]:border-0 tw:[&_input]:bg-transparent tw:[&_input]:py-3.5 tw:[&_input]:text-sm/[inherit]">
          <Search size={16} />
          <input
            placeholder="Buscar pessoa, cargo ou área"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
          />
        </label>
        <select aria-label="Departamento" value={department} onChange={(e) => onDepartment(e.target.value)}>
          <option value="">Todas as áreas</option>
          {departments.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
        <select aria-label="Situação" value={status} onChange={(e) => onStatus(e.target.value)}>
          <option value="">Todas as situações</option>
          <option value="active">Ativa</option>
          <option value="leave">Afastada</option>
          <option value="terminated">Desligada</option>
        </select>
        <div className="tw:relative">
          <Button variant="compactOutline" type="button" aria-expanded={columnOpen} onClick={() => onColumnMenuToggle()}>
            <SlidersHorizontal size={15} /> Colunas
          </Button>
          {columnOpen && (
            <div className="tw:absolute tw:top-11.25 tw:right-0 tw:z-10 tw:max-h-100 tw:w-62.5 tw:overflow-auto tw:rounded-lg tw:border tw:border-solid tw:border-[var(--v2-line-e4d6ca,var(--cali-color-sand-line))] tw:bg-[var(--v2-surface-fff,var(--cali-color-neutral-surface))] tw:p-4.5 tw:shadow-[0_0.5rem_1.5625rem_rgb(var(--cali-rgb-burgundy-strong)/0.1255)] tw:[&_label]:mt-2.25 tw:[&_label]:flex tw:[&_label]:items-center tw:[&_label]:gap-2 tw:[&_label]:text-cali-label tw:[&_label]:text-[var(--v2-text-8c7462,var(--cali-color-sand-strong))]">
              <strong>Mostrar na tabela</strong>
              <label>
                <input type="checkbox" checked readOnly /> Pessoa
              </label>
              {(Object.keys(columnLabels) as ColumnKey[]).map((key) => (
                <label key={key}>
                  <input type="checkbox" checked={columns.includes(key)} onChange={() => onColumnToggle(key)} />
                  {columnLabels[key]}
                </label>
              ))}
            </div>
          )}
        </div>
        <Button variant="compactOutline" type="button" onClick={onPrint} disabled={!filtered.length}>
          <Download size={15} /> Exportar
        </Button>
      </div>
      <div className="tw:overflow-auto tw:rounded-lg tw:border tw:border-solid tw:border-cali-sand-line tw:bg-cali-neutral-surface">
        <table className="tw:w-full tw:border-collapse tw:text-cali-label tw:[&_th]:whitespace-nowrap tw:[&_th]:bg-[var(--v2-surface-f2eee9,var(--cali-color-neutral-soft))] tw:[&_th]:px-5 tw:[&_th]:py-4 tw:[&_th]:text-left tw:[&_th]:text-cali-micro tw:[&_th]:font-medium tw:[&_th]:text-[var(--v2-text-a49385,var(--cali-color-sand-text))] tw:[&_td]:whitespace-nowrap tw:[&_td]:border-0 tw:[&_td]:border-b tw:[&_td]:border-solid tw:[&_td]:border-[var(--v2-line-eee6dd,var(--cali-color-sand-line))] tw:[&_td]:px-5 tw:[&_td]:py-4.5 tw:[&_td]:text-cali-label tw:[&_td]:text-[var(--v2-text-7a6c60,var(--cali-color-neutral-accent))] tw:[&_tr:hover_td]:bg-[var(--v2-surface-fffaf5,var(--cali-color-sand-surface))]">
          <thead>
            <tr>
              <th>Pessoa</th>
              {columns.map((key) => (
                <th key={key}>{columnLabels[key]}</th>
              ))}
              <th>Ficha</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((member) => (
              <tr key={member.id}>
                <td>
                  <button
                    className="tw:flex tw:min-w-[14.615rem] tw:items-center tw:gap-3 tw:border-0 tw:bg-transparent tw:p-0 tw:text-left tw:[&>span:last-child]:flex tw:[&>span:last-child]:flex-col tw:[&>span:last-child]:gap-2 tw:[&_strong]:text-xs tw:[&_strong]:text-[var(--v2-text-493f38,var(--cali-color-neutral-text))] tw:[&_small]:text-cali-micro tw:[&_small]:text-[var(--v2-text-a68f7e,var(--cali-color-sand-text))]"
                    onClick={() => onOpenMember(member)}
                  >
                    <TeamAvatar name={member.full_name} style={member.avatar_style} leader={member.is_leader} />
                    <span>
                      <strong>{member.full_name}</strong>
                      <small>
                        {member.job_title}
                        {member.seniority ? ` · ${member.seniority}` : ''}
                      </small>
                    </span>
                  </button>
                </td>
                {columns.map((key) => (
                  <td key={key}>{renderCell(member, key)}</td>
                ))}
                <td>
                  <button
                    className="tw:inline-flex tw:size-auto tw:items-center tw:justify-center tw:gap-1.5 tw:whitespace-nowrap tw:rounded-md tw:border-0 tw:bg-transparent tw:p-0 tw:text-cali-label tw:text-cali-muted tw:shadow-none"
                    onClick={() => onOpenMember(member)}
                    aria-label={`Abrir ficha de ${member.full_name}`}
                  >
                    <ArrowRight size={17} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && (
          <div className="tw:p-7.5 tw:text-center tw:text-cali-sand-text">
            <UsersRound size={29} />
            <h2>{hasMembers ? 'Nenhuma pessoa neste filtro.' : 'A equipe ainda não foi cadastrada.'}</h2>
            <p>
              {hasMembers
                ? 'Ajuste a busca ou selecione outro mês.'
                : 'Cadastre um colaborador ou envie uma planilha para cadastrar todos de uma vez.'}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
