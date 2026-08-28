export type WorkspaceRole = 'admin' | 'client';

export type DeliverableStatus =
  | 'not_started'
  | 'in_progress'
  | 'internal_review'
  | 'client_review'
  | 'adjustment_requested'
  | 'approved'
  | 'cancelled';

export type Deliverable = {
  id: string;
  code: string;
  title: string;
  description: string;
  workstream: string;
  dueLabel: string;
  hours: number;
  progress: number;
  status: DeliverableStatus;
  isDocument?: boolean;
};

export type TimeEntry = {
  id: string;
  date: string;
  project: string;
  deliverable: string;
  description: string;
  minutes: number;
  type: 'timer' | 'manual' | 'interaction';
  channel?: 'WhatsApp' | 'E-mail' | 'Ligação' | 'Reunião';
};
