import { useForm } from '@tanstack/react-form';
import { ArrowRight, X } from 'lucide-react';
import { z } from 'zod';
import { Button } from '../../../components/ds/Button';
import { DialogForm } from '../../../components/ds/DialogForm';

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

  return <div className="wf-overlay"><DialogForm className="wf-modal wf-create" onSubmit={(event) => { event.preventDefault(); void form.handleSubmit(); }} aria-label="Solicitar acesso adicional">
      <div className="wf-modal-header"><span>SOLICITAR ACESSO</span><button type="button" onClick={onClose} aria-label="Fechar"><X size={17} /></button></div>
      <h2>Incluir mais uma pessoa no Workspace</h2>
      <p>Indique quem deve receber acesso. A CALI confirma as condições nesta ocorrência e libera o convite.</p>
      <div className="wf-form">
        <div className="wf-access-terms"><strong>Antes de solicitar</strong><ul>
          <li>Cada empresa pode ter até 4 acessos ao CALI Workspace.</li>
          <li>Todos os acessos veem as mesmas informações da empresa: projetos, entregáveis, horas, documentos, relatórios, ocorrências e equipe. Não há níveis de permissão diferentes.</li>
          <li>O acesso adicional é contratado à parte: R$ 59,90 por mês, por acesso. Inclui login individual, histórico de registros, acompanhamento das entregas e das informações da agenda de People, suporte ao uso da plataforma e manutenção contínua.</li>
          <li>A CALI confirma o valor e o início da cobrança nesta ocorrência antes de liberar o acesso; nada é cobrado sem a sua confirmação.</li>
          <li>A pessoa indicada recebe um convite por e-mail. A empresa responde por quem indica e avisa a CALI quando o acesso precisar ser encerrado.</li>
          <li>Os dados informados são usados somente para criar e administrar o acesso, conforme a Política de Privacidade.</li>
        </ul></div>
        <div className="wf-form-grid">
          <label>Nome completo<form.Field name="name">{(field) => <input value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} required />}</form.Field></label>
          <label>Cargo<form.Field name="job">{(field) => <input value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} />}</form.Field></label>
          <label>E-mail<form.Field name="email">{(field) => <input type="email" value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} required />}</form.Field></label>
          <label>Telefone / WhatsApp<form.Field name="phone">{(field) => <input value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} />}</form.Field></label>
        </div>
        <label>Observações<form.Field name="notes">{(field) => <textarea value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} placeholder="Algo que a CALI precise saber sobre este acesso" />}</form.Field></label>
        <label className="wf-access-ack"><form.Field name="ack">{(field) => <input type="checkbox" checked={field.state.value} onChange={(event) => field.handleChange(event.target.checked)} />}</form.Field><span>Li e estou ciente das condições acima.</span></label>
        {error && <p className="wf-access-error">{error}</p>}
      </div>
      <div className="wf-modal-actions"><button type="button" onClick={onClose}>Cancelar</button><form.Subscribe selector={(state) => ({ busy: state.isSubmitting, ready: accessSchema.safeParse(state.values).success })}>
          {({ busy, ready }) => <Button variant="workflowPrimary" type="submit" disabled={busy || !ready || !available}>
            {busy ? 'Enviando…' : <>Enviar solicitação <ArrowRight size={14} /></>}
          </Button>}
        </form.Subscribe></div>
    </DialogForm></div>;
}
