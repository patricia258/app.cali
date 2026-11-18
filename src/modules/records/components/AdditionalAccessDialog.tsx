import { Checkbox } from '../../../components/ds/Checkbox';
import { Input } from '../../../components/ds/Input';
import { Textarea } from '../../../components/ds/Textarea';
import { ArrowRight, X } from 'lucide-react';
import { Button } from '../../../components/ds/Button';
import {
  WorkflowDialogActions,
  WorkflowDialogForm,
  WorkflowDialogHeader,
  WorkflowDialogOverlay,
} from '../../../components/ds/WorkflowDialog';
import {
  WorkspaceFormDialogCheck,
  WorkspaceFormDialogField,
  WorkspaceFormDialogFields,
} from '../../../components/workspace/components/WorkspaceFormDialog';
import { isAdditionalAccessReady, useAdditionalAccessForm, type AdditionalAccessDraft } from '../hooks/useAdditionalAccessForm';

export type { AdditionalAccessDraft } from '../hooks/useAdditionalAccessForm';

export function AdditionalAccessDialog({ available, error, onClose, onRequest }: {
  available: boolean;
  error: string;
  onClose: () => void;
  onRequest: (draft: AdditionalAccessDraft) => Promise<void>;
}) {
  const form = useAdditionalAccessForm(available, onRequest);

  return (
    <WorkflowDialogOverlay>
      <WorkflowDialogForm
        create
        className="tw:[&_input:not([type=checkbox])]:min-h-[2.769rem]! tw:[&_textarea]:min-h-[4.923rem]!"
        onSubmit={(event) => { event.preventDefault(); void form.handleSubmit(); }}
        aria-label="Solicitar acesso adicional"
      >
        <WorkflowDialogHeader>
          <span>SOLICITAR ACESSO</span>
          <button type="button" data-dialog-close="" aria-label="Fechar" onClick={onClose}>
            <X size={17} />
          </button>
        </WorkflowDialogHeader>
        <h2>Incluir mais uma pessoa no Workspace</h2>
        <p>Indique quem deve receber acesso. A CALI confirma as condições nesta ocorrência e libera o convite.</p>
        <div className="tw:flex tw:flex-col tw:gap-4.5">
          <div className="tw:rounded-cali-panel tw:border tw:border-solid tw:border-cali-warning-line tw:bg-cali-warning-surface tw:px-5 tw:py-4.5 tw:text-sm tw:leading-[1.6] tw:text-cali-muted">
            <strong className="tw:mb-2 tw:block tw:text-cali-body tw:text-cali-brand">Antes de solicitar</strong>
            <ul className="tw:m-0 tw:flex tw:flex-col tw:gap-1 tw:pl-5">
                <li>Cada empresa pode ter até 4 acessos ao CALI Workspace.</li>
                <li>Todos os acessos veem as mesmas informações da empresa: projetos, entregáveis, horas, documentos, relatórios, ocorrências e equipe. Não há níveis de permissão diferentes.</li>
                <li>O acesso adicional é contratado à parte: R$ 59,90 por mês, por acesso. Inclui login individual, histórico de registros, acompanhamento das entregas e das informações da agenda de People, suporte ao uso da plataforma e manutenção contínua.</li>
                <li>A CALI confirma o valor e o início da cobrança nesta ocorrência antes de liberar o acesso; nada é cobrado sem a sua confirmação.</li>
                <li>A pessoa indicada recebe um convite por e-mail. A empresa responde por quem indica e avisa a CALI quando o acesso precisar ser encerrado.</li>
                <li>Os dados informados são usados somente para criar e administrar o acesso, conforme a Política de Privacidade.</li>
            </ul>
          </div>
          <WorkspaceFormDialogFields>
            <WorkspaceFormDialogField>Nome completo<form.Field name="name">{(field) => <Input autoComplete="name" value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} required />}</form.Field></WorkspaceFormDialogField>
            <WorkspaceFormDialogField>Cargo<form.Field name="job">{(field) => <Input autoComplete="organization-title" value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} />}</form.Field></WorkspaceFormDialogField>
            <WorkspaceFormDialogField>E-mail<form.Field name="email">{(field) => <Input type="email" autoComplete="email" value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} required />}</form.Field></WorkspaceFormDialogField>
            <WorkspaceFormDialogField>Telefone / WhatsApp<form.Field name="phone">{(field) => <Input type="tel" autoComplete="tel" value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} />}</form.Field></WorkspaceFormDialogField>
          </WorkspaceFormDialogFields>
          <WorkspaceFormDialogField>Observações<form.Field name="notes">{(field) => <Textarea value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} placeholder="Algo que a CALI precise saber sobre este acesso" />}</form.Field></WorkspaceFormDialogField>
          <WorkspaceFormDialogCheck><form.Field name="ack">{(field) => <Checkbox className="tw:m-0" checked={field.state.value} onChange={(event) => field.handleChange(event.target.checked)} />}</form.Field><span>Li e estou ciente das condições acima.</span></WorkspaceFormDialogCheck>
          {error && <p role="alert" className="tw:m-0 tw:text-sm tw:text-cali-danger">{error}</p>}
        </div>
        <WorkflowDialogActions>
          <button type="button" onClick={onClose}>Cancelar</button>
          <form.Subscribe selector={(state) => ({ busy: state.isSubmitting, ready: isAdditionalAccessReady(state.values) })}>
            {({ busy, ready }) => (
              <Button variant="workflowPrimary" type="submit" disabled={busy || !ready || !available}>
                {busy ? 'Enviando…' : <>Enviar solicitação <ArrowRight size={14} /></>}
              </Button>
            )}
          </form.Subscribe>
        </WorkflowDialogActions>
      </WorkflowDialogForm>
    </WorkflowDialogOverlay>
  );
}
