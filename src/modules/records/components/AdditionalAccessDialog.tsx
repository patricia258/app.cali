import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
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

const accessSchema = z.object({
  name: z.string().trim().min(1),
  job: z.string().trim(),
  email: z.string().trim().min(1),
  phone: z.string().trim(),
  notes: z.string().trim(),
  ack: z.boolean().refine(Boolean),
});

export type AdditionalAccessDraft = z.infer<typeof accessSchema>;

export function AdditionalAccessDialog({ available, error, onClose, onRequest }: {
  available: boolean;
  error: string;
  onClose: () => void;
  onRequest: (draft: AdditionalAccessDraft) => Promise<void>;
}) {
  const form = useForm({
    defaultValues: { name: '', job: '', email: '', phone: '', notes: '', ack: false },
    onSubmit: async ({ value }) => {
      const draft = accessSchema.safeParse(value);
      if (available && draft.success) await onRequest(draft.data);
    },
  });

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
        <div className="tw:flex tw:flex-col tw:gap-[1.15rem]">
          <div className="tw:rounded-[.69rem] tw:border tw:border-solid tw:border-[#f0dfc0] tw:bg-[#fffaf1] tw:px-[1.23rem] tw:py-[1.08rem] tw:text-[.85rem] tw:leading-[1.6] tw:text-[#665751]">
            <strong className="tw:mb-[.46rem] tw:block tw:text-[.92rem] tw:text-cali-brand">Antes de solicitar</strong>
            <ul className="tw:m-0 tw:flex tw:flex-col tw:gap-[.31rem] tw:pl-[1.23rem]">
                <li>Cada empresa pode ter até 4 acessos ao CALI Workspace.</li>
                <li>Todos os acessos veem as mesmas informações da empresa: projetos, entregáveis, horas, documentos, relatórios, ocorrências e equipe. Não há níveis de permissão diferentes.</li>
                <li>O acesso adicional é contratado à parte: R$ 59,90 por mês, por acesso. Inclui login individual, histórico de registros, acompanhamento das entregas e das informações da agenda de People, suporte ao uso da plataforma e manutenção contínua.</li>
                <li>A CALI confirma o valor e o início da cobrança nesta ocorrência antes de liberar o acesso; nada é cobrado sem a sua confirmação.</li>
                <li>A pessoa indicada recebe um convite por e-mail. A empresa responde por quem indica e avisa a CALI quando o acesso precisar ser encerrado.</li>
                <li>Os dados informados são usados somente para criar e administrar o acesso, conforme a Política de Privacidade.</li>
            </ul>
          </div>
          <WorkspaceFormDialogFields>
            <WorkspaceFormDialogField>Nome completo<form.Field name="name">{(field) => <input autoComplete="name" value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} required />}</form.Field></WorkspaceFormDialogField>
            <WorkspaceFormDialogField>Cargo<form.Field name="job">{(field) => <input autoComplete="organization-title" value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} />}</form.Field></WorkspaceFormDialogField>
            <WorkspaceFormDialogField>E-mail<form.Field name="email">{(field) => <input type="email" autoComplete="email" value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} required />}</form.Field></WorkspaceFormDialogField>
            <WorkspaceFormDialogField>Telefone / WhatsApp<form.Field name="phone">{(field) => <input type="tel" autoComplete="tel" value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} />}</form.Field></WorkspaceFormDialogField>
          </WorkspaceFormDialogFields>
          <WorkspaceFormDialogField>Observações<form.Field name="notes">{(field) => <textarea value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} placeholder="Algo que a CALI precise saber sobre este acesso" />}</form.Field></WorkspaceFormDialogField>
          <WorkspaceFormDialogCheck><form.Field name="ack">{(field) => <input className="tw:m-0 tw:shrink-0 tw:accent-cali-brand" type="checkbox" checked={field.state.value} onChange={(event) => field.handleChange(event.target.checked)} />}</form.Field><span>Li e estou ciente das condições acima.</span></WorkspaceFormDialogCheck>
          {error && <p role="alert" className="tw:m-0 tw:text-[.85rem] tw:text-[#b7495d]">{error}</p>}
        </div>
        <WorkflowDialogActions>
          <button type="button" onClick={onClose}>Cancelar</button>
          <form.Subscribe selector={(state) => ({ busy: state.isSubmitting, ready: accessSchema.safeParse(state.values).success })}>
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
