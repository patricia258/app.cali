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
      <div className="toolbar tw:mb-[1.15rem] tw:flex tw:gap-[.77rem] tw:max-[53.125rem]:flex-wrap tw:[&>select]:min-w-[10rem] tw:[&>select]:rounded-[.54rem] tw:[&>select]:border tw:[&>select]:border-solid tw:[&>select]:border-[#e9e0d8] tw:[&>select]:bg-white tw:[&>select]:px-[.92rem] tw:[&>select]:py-[.77rem] tw:[&>select]:text-[.85rem]/[inherit] tw:[&>select]:text-[#695e57]">
        <label className="tw:flex tw:min-w-[20rem] tw:flex-1 tw:items-center tw:gap-[.69rem] tw:rounded-[.54rem] tw:border tw:border-solid tw:border-[#e9e0d8] tw:bg-white tw:px-[.92rem] tw:max-[53.125rem]:min-w-full tw:[&_svg]:text-[#a99d94] tw:[&_input]:w-full tw:[&_input]:border-0 tw:[&_input]:bg-transparent tw:[&_input]:py-[.85rem] tw:[&_input]:text-[.85rem]/[inherit]">
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
            <div className="tw:absolute tw:top-11.25 tw:right-0 tw:z-10 tw:max-h-100 tw:w-62.5 tw:overflow-auto tw:rounded-[0.5625rem] tw:border tw:border-solid tw:border-[var(--v2-line-e4d6ca,#e4d6ca)] tw:bg-[var(--v2-surface-fff,#fff)] tw:p-4.5 tw:shadow-[0_0.5rem_1.5625rem_#39283020] tw:[&_label]:mt-2.25 tw:[&_label]:flex tw:[&_label]:items-center tw:[&_label]:gap-2 tw:[&_label]:text-[0.6875rem] tw:[&_label]:text-[var(--v2-text-8c7462,#8c7462)]">
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
      <div className="tw:overflow-auto tw:rounded-[0.5625rem] tw:border tw:border-solid tw:border-[#e7dfd8] tw:bg-white">
        <table className="tw:w-full tw:border-collapse tw:text-[0.6875rem] tw:[&_th]:whitespace-nowrap tw:[&_th]:bg-[var(--v2-surface-f2eee9,#f2eee9)] tw:[&_th]:px-[1.23rem] tw:[&_th]:py-4 tw:[&_th]:text-left tw:[&_th]:text-[0.625rem] tw:[&_th]:font-medium tw:[&_th]:text-[var(--v2-text-a49385,#a49385)] tw:[&_td]:whitespace-nowrap tw:[&_td]:border-0 tw:[&_td]:border-b tw:[&_td]:border-solid tw:[&_td]:border-[var(--v2-line-eee6dd,#eee6dd)] tw:[&_td]:px-[1.23rem] tw:[&_td]:py-[1.08rem] tw:[&_td]:text-[0.6875rem] tw:[&_td]:text-[var(--v2-text-7a6c60,#7a6c60)] tw:[&_tr:hover_td]:bg-[var(--v2-surface-fffaf5,#fffaf5)]">
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
                    className="tw:flex tw:min-w-[14.615rem] tw:items-center tw:gap-[.77rem] tw:border-0 tw:bg-transparent tw:p-0 tw:text-left tw:[&>span:last-child]:flex tw:[&>span:last-child]:flex-col tw:[&>span:last-child]:gap-[.46rem] tw:[&_strong]:text-xs tw:[&_strong]:text-[var(--v2-text-493f38,#493f38)] tw:[&_small]:text-[0.625rem] tw:[&_small]:text-[var(--v2-text-a68f7e,#a68f7e)]"
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
                    className="tw:inline-flex tw:size-auto tw:items-center tw:justify-center tw:gap-1.5 tw:whitespace-nowrap tw:rounded-[0.4375rem] tw:border-0 tw:bg-transparent tw:p-0 tw:text-[0.6875rem] tw:text-[#8b7f77] tw:shadow-none"
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
          <div className="tw:p-[1.92rem] tw:text-center tw:text-[#9a8f88]">
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
