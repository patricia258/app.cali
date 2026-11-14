import { WorkspaceDialogOverlay } from '../../../components/workspace/components/WorkspaceDialogOverlay';
import type { FormEvent } from 'react';
import { Plus, X } from 'lucide-react';
import { WorkspaceFormDialog, WorkspaceFormDialogBody, WorkspaceFormDialogField, WorkspaceFormDialogFields, WorkspaceFormDialogFooter, WorkspaceFormDialogHeader } from '../../../components/workspace/components/WorkspaceFormDialog';
import { FrontCatalogField } from './FrontCatalogField';
import { FrontWindowHint } from './FrontWindowHint';
import type { FrontDraft, ProjectForm } from '../projectForms';

const frontFieldClass = 'tw:box-border tw:min-h-[3.38rem] tw:w-full tw:rounded-[.85rem]! tw:border tw:border-solid tw:border-cali-input-line! tw:bg-cali-surface! tw:px-[1rem]! tw:py-0! tw:text-cali-text! tw:shadow-none! tw:outline-none! tw:focus:border-cali-gold! tw:focus:shadow-[0_0_0_.23rem_#b58c5226]! tw:placeholder:text-cali-muted! tw:placeholder:opacity-[.82] tw:workspace-night:border-[#4a343b]! tw:workspace-night:bg-[#2a1d21]! tw:workspace-night:text-cali-day-canvas! tw:workspace-night:[color-scheme:dark]';
const monthLabelClass = 'tw:inline-flex tw:items-center tw:gap-[.38rem] tw:whitespace-nowrap tw:text-[.77rem] tw:text-[#857870]';

type Props = {
  staff: boolean;
  projectForm: ProjectForm;
  frontDrafts: FrontDraft[];
  creationAccounts: ReadonlyArray<readonly [string, string]>;
  duplicateInitialFronts: boolean;
  saving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onChange: (patch: Partial<ProjectForm>) => void;
  addFrontDraft: () => void;
  patchFrontDraft: (id: string, patch: Partial<FrontDraft>) => void;
  removeFrontDraft: (id: string) => void;
};

export function CreateProjectDialog({
  staff, projectForm, frontDrafts, creationAccounts, duplicateInitialFronts, saving,
  onClose, onSubmit, onChange, addFrontDraft, patchFrontDraft, removeFrontDraft,
}: Props) {
  return (
    <WorkspaceDialogOverlay>
      <WorkspaceFormDialog aria-label="Novo projeto" onSubmit={onSubmit}>
        <WorkspaceFormDialogHeader kicker="OPERAÇÃO / PROJETOS" title="Estruturar cronograma e frentes" description="Cadastre o projeto e já deixe as frentes iniciais organizadas. Depois cada frente recebe seus entregáveis e subtarefas." onClose={onClose} />
        <WorkspaceFormDialogBody>
          <WorkspaceFormDialogFields className="tw:pb-[1.231rem] tw:pt-[1.154rem]">
            <WorkspaceFormDialogField>
              <span>Cliente</span>
              <select value={projectForm.companyId} onChange={(e) => onChange({ companyId: e.target.value })}>
                {creationAccounts.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
            </WorkspaceFormDialogField>
            <WorkspaceFormDialogField>
              <span>Nome do projeto</span>
              <input value={projectForm.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="Roadmap People · ciclo estratégico"/>
            </WorkspaceFormDialogField>
            <WorkspaceFormDialogField>
              <span>Início</span>
              <input type="date" value={projectForm.startDate} onChange={(e) => onChange({ startDate: e.target.value })}/>
            </WorkspaceFormDialogField>
            <WorkspaceFormDialogField>
              <span>{staff ? 'Previsão final' : 'Meta desejada (opcional)'}</span>
              <input type="date" value={projectForm.endDate} onChange={(e) => onChange({ endDate: e.target.value })}/>
              {!staff && <small className="tw:block tw:mt-[.6154rem] tw:mb-[.9231rem] tw:text-[.8462rem] tw:leading-[1.6] tw:font-medium tw:text-[#857870]">Não trava o projeto. A Previsão CALI será recalculada conforme os entregáveis e suas complexidades forem inseridos.</small>}
            </WorkspaceFormDialogField>
          </WorkspaceFormDialogFields>
          <div className="front-drafts-v2 tw:my-[1.08rem]">
            <div className="tw:mt-[1.923rem] tw:mb-[0.923rem] tw:flex tw:items-center tw:justify-between tw:gap-3 tw:border-0 tw:border-b tw:border-solid tw:border-[#eee4dd] tw:pb-[0.923rem]">
              <div className="tw:flex tw:flex-col tw:gap-[.23rem]"><h3 className="tw:m-0 tw:text-[1.077rem]/[inherit]">Frentes iniciais</h3><span className="tw:text-[.77rem] tw:text-[#978980]">{staff ? 'Ex.: Cultura & Clima, Processos, Comunicação Interna.' : 'Escolha uma frente CALI. Use “Outro” apenas quando a frente não estiver no catálogo.'}</span></div>
              <button type="button" className="tw:inline-flex tw:cursor-pointer tw:items-center tw:gap-[0.462rem] tw:rounded-[0.538rem] tw:border tw:border-solid tw:border-[#e5d9d1] tw:bg-white tw:p-[0.769rem] tw:text-cali-brand" onClick={addFrontDraft}><Plus size={14}/> Frente</button>
            </div>
            {frontDrafts.map((front, index) => (
              <div className="front-draft-row tw:flex tw:flex-wrap tw:items-center tw:gap-[0.769rem] tw:py-[0.692rem] tw:[&>input]:min-w-[min(100%,13rem)] tw:[&>input]:flex-[1_1_13rem] tw:[&>select]:max-w-full" key={front.id}>
                <span className="tw:font-extrabold tw:text-cali-gold">{String(index + 1).padStart(2, '0')}</span>
                {staff
                  ? <input className={frontFieldClass} value={front.name} onChange={(e) => patchFrontDraft(front.id, { name: e.target.value })} placeholder="Nome da frente"/>
                  : <FrontCatalogField draft inputClassName={frontFieldClass} name={front.name} taken={frontDrafts.filter((item) => item.id !== front.id).map((item) => item.name)}
                    onChange={(name) => patchFrontDraft(front.id, { name })} />}
                <input className={frontFieldClass} value={front.objective} onChange={(e) => patchFrontDraft(front.id, { objective: e.target.value })} placeholder="Objetivo / contexto"/>
                {staff && <><label className={monthLabelClass}>M<input className={`${frontFieldClass} tw:w-[4.31rem]!`} type="number" min={1} value={front.monthStart} onChange={(e) => patchFrontDraft(front.id, { monthStart: Number(e.target.value) })}/></label>
                <label className={monthLabelClass}>até M<input className={`${frontFieldClass} tw:w-[4.31rem]!`} type="number" min={front.monthStart} value={front.monthEnd} onChange={(e) => patchFrontDraft(front.id, { monthEnd: Number(e.target.value) })}/></label></>}
                <button type="button" className="tw:cursor-pointer tw:border-0 tw:bg-transparent tw:text-[#a25e66]" onClick={() => removeFrontDraft(front.id)} aria-label="Remover frente"><X size={15}/></button>
              </div>
            ))}
            {!staff && <FrontWindowHint initial />}
          </div>
          <WorkspaceFormDialogField>
            <span>Prazo esperado de resposta do cliente (dias corridos; 3 = 72 horas)</span>
            <input type="number" min={1} max={30} value={projectForm.clientResponseBusinessDays} onChange={(e) => onChange({ clientResponseBusinessDays: Number(e.target.value) })}/>
          </WorkspaceFormDialogField>
          <p className="tw:rounded-[0.615rem] tw:border tw:border-solid tw:border-[#ead8c7] tw:bg-[#faf4ed] tw:p-[1.077rem] tw:leading-[1.6] tw:text-[#8c755f]">A falta de resposta gera aviso e impacto de prazo, nunca aprovação automática.</p>
        </WorkspaceFormDialogBody>
        <WorkspaceFormDialogFooter onCancel={onClose} submitLabel={saving ? 'Salvando…' : 'Criar cronograma'} disabled={saving || !projectForm.name.trim() || duplicateInitialFronts} />
      </WorkspaceFormDialog>
    </WorkspaceDialogOverlay>
  );
}
