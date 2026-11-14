import type { ProjectLifecycleAction } from '../../api/projects/lifecycle';

export type LifecycleInterruption = Exclude<ProjectLifecycleAction, 'resume'>;

export const lifecycleOptions: Record<LifecycleInterruption, { label: string; description: string }> = {
  pause: { label: 'Pausar', description: 'Interrupção temporária. O trabalho volta quando a condição for resolvida.' },
  suspend: { label: 'Suspender', description: 'Bloqueio formal por impedimento contratual, financeiro ou operacional.' },
  cancel: { label: 'Cancelar', description: 'Encerramento definitivo do escopo escolhido.' },
};

export const lifecycleReasons: Record<LifecycleInterruption, string[]> = {
  pause: [
    'Solicitação temporária do cliente',
    'Aguardando resposta ou materiais do cliente',
    'Aguardando decisão de prioridade ou escopo',
    'Indisponibilidade temporária do decisor ou da equipe do cliente',
    'Dependência externa temporária',
    'Indisponibilidade operacional temporária da CALI',
    'Outro motivo',
  ],
  suspend: [
    'Atraso ou inadimplência de pagamento',
    'Ausência prolongada de resposta ou insumos do cliente',
    'Pendência contratual ou documental',
    'Escopo ou prioridade aguardando decisão formal',
    'Dependência externa impeditiva',
    'Solicitação formal do cliente',
    'Impedimento operacional ou força maior',
    'Outro motivo',
  ],
  cancel: [
    'Encerramento solicitado pelo cliente',
    'Encerramento contratual',
    'Descontinuidade do escopo',
    'Mudança de estratégia ou prioridade',
    'Impossibilidade de continuidade',
    'Outro motivo',
  ],
};
