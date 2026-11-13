export type ColumnKey =
  | 'job_title'
  | 'seniority'
  | 'department'
  | 'team_area'
  | 'manager_code'
  | 'is_leader'
  | 'employment_type'
  | 'weekly_hours'
  | 'work_model'
  | 'location'
  | 'work_email'
  | 'work_phone'
  | 'admission_date'
  | 'status'
  | 'leave_reason'
  | 'leave_start_date'
  | 'expected_return_date'
  | 'termination_date'
  | 'termination_initiative'
  | 'termination_reason'
  | 'notice_type';
export const columnLabels: Record<ColumnKey, string> = {
  job_title: 'Cargo',
  seniority: 'Senioridade',
  department: 'Departamento',
  team_area: 'Setor',
  manager_code: 'Gestor direto',
  is_leader: 'Liderança',
  employment_type: 'Contrato',
  weekly_hours: 'Jornada semanal',
  work_model: 'Modelo de trabalho',
  location: 'Unidade / localidade',
  work_email: 'E-mail corporativo',
  work_phone: 'Telefone profissional',
  admission_date: 'Admissão',
  status: 'Situação',
  leave_reason: 'Motivo do afastamento',
  leave_start_date: 'Início do afastamento',
  expected_return_date: 'Previsão de retorno',
  termination_date: 'Desligamento',
  termination_initiative: 'Iniciativa do desligamento',
  termination_reason: 'Motivo do desligamento',
  notice_type: 'Aviso prévio',
};
// Colunas iniciais do diretório do cliente, na ordem aprovada; as demais seguem disponíveis em "Colunas".
export const clientDirectoryColumns: ColumnKey[] = ['department', 'manager_code', 'admission_date', 'status'];
export const defaultColumns: ColumnKey[] = [
  'job_title',
  'seniority',
  'department',
  'manager_code',
  'status',
  'employment_type',
  'weekly_hours',
  'admission_date',
];
