import type { Deliverable, TimeEntry } from '../domain/types';

export const demoCompany = {
  name: 'Grupo Aurora',
  service: 'Assessoria Estratégica Mensal',
  cycle: 'Ciclo · Agosto / Setembro',
  contractedHours: 30,
  alertThresholds: [70, 85, 100],
};

export const demoDeliverables: Deliverable[] = [
  {
    id: 'ent-001',
    code: 'ENT-2026-001',
    title: 'Estrutura de indicadores de People',
    description: 'Indicadores prioritários para orientar as decisões de pessoas e a rotina executiva do ciclo.',
    workstream: 'Gestão & Governança de RH',
    dueLabel: '03 set',
    hours: 4.33,
    progress: 100,
    status: 'client_review',
    isDocument: true,
  },
  {
    id: 'ent-002',
    code: 'ENT-2026-002',
    title: 'Ritual de gestão com lideranças',
    description: 'Estrutura de cadência, pauta e responsabilidade para os encontros recorrentes de liderança.',
    workstream: 'Liderança',
    dueLabel: '08 set',
    hours: 2.75,
    progress: 62,
    status: 'in_progress',
  },
  {
    id: 'ent-003',
    code: 'ENT-2026-003',
    title: 'Matriz de responsabilidades do RH',
    description: 'Clareza sobre decisões, responsabilidades e interfaces entre RH, lideranças e direção.',
    workstream: 'Gestão & Governança de RH',
    dueLabel: '12 set',
    hours: 1.5,
    progress: 35,
    status: 'in_progress',
    isDocument: true,
  },
  {
    id: 'ent-004',
    code: 'ENT-2026-004',
    title: 'Plano do próximo ciclo',
    description: 'Priorização do próximo ciclo a partir do que avançou, do que ficou pendente e das decisões do período.',
    workstream: 'Pessoas & Performance',
    dueLabel: '18 set',
    hours: 0,
    progress: 0,
    status: 'not_started',
  },
];

export const demoTimeEntries: TimeEntry[] = [
  { id: 'h1', date: '28 ago', project: 'Estruturação People · Ciclo 01', deliverable: 'Estrutura de indicadores de People', description: 'Consolidação dos indicadores e critérios de leitura', minutes: 125, type: 'timer' },
  { id: 'h2', date: '27 ago', project: 'Estruturação People · Ciclo 01', deliverable: 'Ritual de gestão com lideranças', description: 'Desenho do ritual e pauta de acompanhamento', minutes: 95, type: 'timer' },
  { id: 'h3', date: '26 ago', project: 'Estruturação People · Ciclo 01', deliverable: 'Matriz de responsabilidades do RH', description: 'Análise da estrutura e pontos de decisão', minutes: 80, type: 'manual' },
  { id: 'h4', date: '25 ago', project: 'Estruturação People · Ciclo 01', deliverable: 'Ritual de gestão com lideranças', description: 'Alinhamento com decisor sobre cadência de gestão', minutes: 55, type: 'interaction', channel: 'Reunião' },
];
