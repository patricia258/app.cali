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
      <div className="toolbar">
        <label className="search-field">
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
          <button className="outline-button" aria-expanded={columnOpen} onClick={() => onColumnMenuToggle()}>
            <SlidersHorizontal size={15} /> Colunas
          </button>
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
        <button className="outline-button" onClick={onPrint} disabled={!filtered.length}>
          <Download size={15} /> Exportar
        </button>
      </div>
      <div className="tw:overflow-auto tw:rounded-[0.5625rem] tw:border tw:border-solid tw:border-[#e7dfd8] tw:bg-white">
        <table className="tw:w-full tw:border-collapse tw:text-[0.6875rem] tw:[&_th]:whitespace-nowrap tw:[&_th]:bg-[var(--v2-surface-f2eee9,#f2eee9)] tw:[&_th]:px-4 tw:[&_th]:py-3.25 tw:[&_th]:text-left tw:[&_th]:text-[0.625rem] tw:[&_th]:font-medium tw:[&_th]:text-[var(--v2-text-a49385,#a49385)] tw:[&_td]:whitespace-nowrap tw:[&_td]:border-0 tw:[&_td]:border-b tw:[&_td]:border-solid tw:[&_td]:border-[var(--v2-line-eee6dd,#eee6dd)] tw:[&_td]:px-4 tw:[&_td]:py-3.5 tw:[&_td]:text-[0.6875rem] tw:[&_td]:text-[var(--v2-text-7a6c60,#7a6c60)] tw:[&_tr:hover_td]:bg-[var(--v2-surface-fffaf5,#fffaf5)]">
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
                    className="tw:flex tw:min-w-[11.875rem] tw:items-center tw:gap-2.5 tw:border-0 tw:bg-transparent tw:p-0 tw:text-left tw:[&>span:last-child]:flex tw:[&>span:last-child]:flex-col tw:[&>span:last-child]:gap-1.5 tw:[&_strong]:text-xs tw:[&_strong]:text-[var(--v2-text-493f38,#493f38)] tw:[&_small]:text-[0.625rem] tw:[&_small]:text-[var(--v2-text-a68f7e,#a68f7e)]"
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
          <div className="empty">
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
