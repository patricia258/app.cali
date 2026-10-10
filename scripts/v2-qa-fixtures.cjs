/* Synthetic, clearly labelled QA data. Never real companies, people or contracts. */
const companyId = '11111111-1111-4111-8111-111111111111';
const userId = '22222222-2222-4222-8222-222222222222';
const projectId = '33333333-3333-4333-8333-333333333333';
const now = '2026-10-09T12:00:00Z';
const role = process.env.QA_ROLE || 'client';
const user = { id: userId, aud: 'authenticated', role: 'authenticated', email: 'qa@example.invalid', app_metadata: {}, user_metadata: {}, created_at: now };
const part = v => Buffer.from(JSON.stringify(v)).toString('base64url');
const token = `${part({ alg: 'HS256', typ: 'JWT' })}.${part({ sub: userId, exp: 4070908800, role: 'authenticated' })}.qa`;
const company = { id: companyId, display_name: 'Empresa QA fictícia', legal_name: 'Empresa QA', service_plan: 'partner', service_type: 'CALI Partner', status: 'active', monthly_hours_contracted: 20, show_hours_to_client: true, start_date: '2026-06-01', end_date: '2027-02-01', logo_url: null, logo_workspace_url: null };
const project = { id: projectId, company_id: companyId, name: 'Projeto QA fictício', status: 'active', planning_status: 'approved', execution_status: 'normal', start_date: '2026-06-01', target_end_date: '2027-02-01', client_visible: true, contract_hours: 160 };
const deliverables = [{ id: '44444444-4444-4444-8444-444444444444', company_id: companyId, project_id: projectId, title: 'Entrega QA fictícia', status: 'client_review', client_visible: true, workstream: 'Governança', due_at: '2026-10-20T12:00:00Z', roadmap_month_start: 1, roadmap_month_end: 2, description: 'Descrição de teste', protocol: 'CALI-DEL-20261009-001' }];
const tables = {
  companies: [company], projects: [project], deliverables,
  profiles: [{ ...user, full_name: 'Pessoa QA', company_id: companyId, role, active: true }],
  project_workstreams: [], deliverable_tasks: [],
  hour_entries: [{ id: 'qa-hour', company_id: companyId, project_id: projectId, deliverable_id: deliverables[0].id, work_date: '2026-10-08', minutes: 90, description: 'Atividade QA fictícia', category: 'Consultoria', source_type: 'manual', started_at: '2026-10-08T12:00:00Z', ended_at: '2026-10-08T13:30:00Z', client_visible: true }],
  events: [{ id: 'qa-event', company_id: companyId, title: 'Encontro QA fictício', starts_at: '2026-10-20T12:00:00Z', ends_at: '2026-10-20T13:00:00Z', event_type: 'meeting', mode: 'online', visibility: 'client', status: 'confirmed', cancelled_at: null }],
  files: [{ id: 'qa-file', company_id: companyId, title: 'Documento QA fictício', document_kind: 'Entregável', category: 'other', status: 'published', client_visible: true, updated_at: now, version_label: '1', protocol: 'QA-DOC-001', requires_acknowledgement: true, valid_until: '2026-11-20' }],
  reports: [{ id: 'qa-report', company_id: companyId, title: 'Leitura QA fictícia', status: 'published', report_type: 'monthly', period_start: '2026-09-01', period_end: '2026-09-30', reference_month: '2026-09-01', version: 1, protocol: 'QA-REL-001', executive_summary: 'Resumo fictício para teste', source_snapshot: {}, published_at: now }],
  account_records: [{ id: 'qa-record', company_id: companyId, title: 'Solicitação QA fictícia', summary: 'Contexto fictício', record_type: 'request', workflow_status: 'open', visibility: 'client', protocol: 'CALI-REG-20261009-001', occurred_at: now, created_at: now, updated_at: now }],
  team_members: [{ id: 'qa-person', company_id: companyId, employee_code: 'QA01', full_name: 'Pessoa QA fictícia', job_title: 'Analista', department: 'Operações', admission_date: '2025-01-01', status: 'active', employment_type: 'clt', avatar_style: 'neutral', is_leader: false }],
  team_months: [{ reference_month: '2026-10-01', confirmed_at: now, revision: 1 }],
  team_month_snapshots: [{ reference_month: '2026-10-01', member_id: 'qa-person', status: 'active', department: 'Operações', job_title: 'Analista', admission_date: '2025-01-01' }],
  team_month_reviews: [{ reference_month: '2026-09-01' }],
};
// QA_RICH: fictitious richer scenario to review layouts with several rows
const svg = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900"><rect width="900" height="900" fill="#eee"/><text x="450" y="480" font-size="120" text-anchor="middle">QA LOGO</text></svg>');
company.logo_url = svg; company.logo_workspace_url = svg;
const mk=(i,name,dept,job,leader,manager,adm)=>({ id:'qa-p'+i, company_id: companyId, employee_code:'QA0'+i, full_name:name, job_title:job, department:dept, admission_date:adm, status:'active', employment_type:'clt', avatar_style:'neutral', is_leader:leader, manager_code:manager });
tables.team_members = [mk(1,'Pessoa Um QA','Operações','Gerente de Operações',true,null,'2022-03-01'),mk(2,'Pessoa Dois QA','Operações','Analista de Processos',false,'QA01','2024-01-15'),mk(3,'Pessoa Três QA','Operações','Assistente',false,'QA01','2025-06-01'),mk(4,'Pessoa Quatro QA','Pessoas','Coordenadora de Pessoas',true,null,'2021-11-04'),mk(5,'Pessoa Cinco QA','Pessoas','Analista de People',false,'QA04','2025-09-09')];
tables.team_month_snapshots = tables.team_members.map(m=>({ reference_month:'2026-10-01', member_id:m.id, status:'active', department:m.department, job_title:m.job_title, admission_date:m.admission_date }));
const dl=(i,title,status,due)=>({ ...deliverables[0], id:'4444444'+i+'-4444-4444-8444-444444444444', title, status, due_at: due , protocol:'CALI-DEL-20261009-00'+i });
tables.deliverables = [dl(1,'Entrega QA A','in_progress','2026-10-03T12:00:00Z'),dl(2,'Entrega QA B','not_started','2026-10-12T12:00:00Z'),dl(3,'Entrega QA C','client_review','2026-10-20T12:00:00Z'),dl(4,'Entrega QA D','approved','2026-10-27T12:00:00Z')];
tables.team_changes = [{ id:'qa-c1', company_id: companyId, member_id:'qa-p1', change_type:'admission', after_state:{ admission_date:'2022-03-01' }, before_state:null, created_at:'2022-03-01T12:00:00Z', reference_month:'2022-03-01' },{ id:'qa-c2', company_id: companyId, member_id:'qa-p1', change_type:'promotion', after_state:{ job_title:'Gerente de Operações' }, before_state:{ job_title:'Coordenador' }, created_at:'2025-04-10T12:00:00Z', reference_month:'2025-04-01' }];
// QA_AVATAR: profile photo to exercise the frame standard
tables.profiles[0].avatar_url = svg; tables.profiles[0].avatar_zoom = 1; tables.profiles[0].avatar_position_x = 50; tables.profiles[0].avatar_position_y = 50;
// QA_MSG: fictitious conversation
tables.account_record_messages = [{ id:'qa-m1', record_id:'qa-record', account_record_id:'qa-record', company_id: companyId, body:'Mensagem QA do cliente para a CALI, com texto suficiente para quebrar em duas linhas no balão.', source_actor:'client', author_role:'client', author_user_id:userId, author_name:'Pessoa QA', created_at:'2026-10-07T12:45:00Z' },{ id:'qa-m2', record_id:'qa-record', account_record_id:'qa-record', company_id: companyId, body:'Resposta QA da CALI.', source_actor:'admin', author_role:'admin', author_user_id:'admin-qa', author_name:'Consultora QA', created_at:'2026-10-07T13:15:00Z' }];
// QA_REPORT: minimal valid snapshot so the official report paper renders
tables.reports[0].source_snapshot = { generatedAt: now, companyId, companyName:'Empresa QA fictícia', period:{ start:'2026-09-01', end:'2026-09-30', months:1 }, contract:{ serviceType:'CALI Partner', servicePlan:'partner', monthlyHours:20, contractedHoursPeriod:20 }, projects:[], workstreams:[], deliverables:{ approvedCount:1, approved:[], inProgressCount:1, clientReviewCount:1, delayedCount:0, delayBusinessDays:0, adjustmentCount:0 }, hours:{ contractedHours:20, consumedMinutes:540, entries:[], byCategory:[] } };
tables.reports[0].movements=['Movimento QA']; tables.reports[0].decisions=['Decisão QA']; tables.reports[0].risks=['Ponto de atenção QA']; tables.reports[0].next_steps=['Próximo passo QA']; tables.reports[0].client_open_count=0;
// QA_FRONTS / QA_LONGREPORT: fictitious catalogue and a long report to exercise page breaks
const fr=(i,title,core)=>({ code:'qa-front-'+i, title, description:'Descrição QA da frente '+title+'.', category: core?'recurring':'addon', partner_core:core, full_core:core, partner_slot:!core, full_slot:!core, build_allowed:true, display_order:i, active:true });
tables.front_catalog=[fr(1,'Frente QA incluída um',true),fr(2,'Frente QA incluída dois',true),fr(3,'Frente QA incluída três',true),fr(4,'Frente QA incluída quatro',true),fr(5,'Frente QA incluída cinco',true),fr(6,'Frente QA incluída seis',true),fr(7,'Possibilidade QA um',false),fr(8,'Possibilidade QA dois',false),fr(9,'Possibilidade QA três',false),fr(10,'Possibilidade QA quatro',false)];
tables.company_fronts=[];
const lorem='Texto QA longo para forçar a quebra de página no documento impresso. '.repeat(26);
tables.reports[0].executive_summary=lorem; tables.reports[0].movements=[lorem]; tables.reports[0].risks=[lorem]; tables.reports[0].next_steps=[lorem];
// QA_WS: two fronts to see the alternating marks
tables.project_workstreams=[{ id:'qa-ws1', company_id: companyId, project_id: projectId, name:'Governança', protocol:'CALI-FRT-QA-01', status:'active', display_order:1 },{ id:'qa-ws2', company_id: companyId, project_id: projectId, name:'Pessoas e Performance', protocol:'CALI-FRT-QA-02', status:'active', display_order:2 }];
tables.deliverables[2].workstream='Pessoas e Performance'; tables.deliverables[3].workstream='Pessoas e Performance';
// QA_DV: fictitious steps, history, file and conversation for the deliverable dialog
const dvId=tables.deliverables[2].id;
Object.assign(tables.deliverables[2],{ complexity:'MC2', is_document:true, updated_at:'2026-10-08T13:25:00Z', client_response_due_at:'2026-10-15T21:00:00Z' });
tables.deliverable_tasks=[['Preparação QA','done'],['Revisão com a CALI QA','done'],['Validação do cliente QA','in_progress'],['Publicação final QA','not_started']].map(([title,status],i)=>({ id:'qa-t'+i, deliverable_id:dvId, company_id:companyId, protocol:'CALI-TSK-QA-0'+(i+1), title, status, due_at:'2026-10-1'+i+'T12:00:00Z', sort_order:i, client_visible:true }));
tables.deliverable_status_history=[{ id:'qa-h1', deliverable_id:dvId, company_id:companyId, from_status:'internal_review', to_status:'client_review', created_at:'2026-10-08T13:25:00Z' },{ id:'qa-h2', deliverable_id:dvId, company_id:companyId, from_status:'in_progress', to_status:'internal_review', created_at:'2026-10-06T19:40:00Z' },{ id:'qa-h3', deliverable_id:dvId, company_id:companyId, from_status:'not_started', to_status:'in_progress', created_at:'2026-10-02T12:15:00Z' }];
tables.deliverable_adjustments=[];
tables.files.push({ id:'qa-file-dv', company_id:companyId, deliverable_id:dvId, title:'Arquivo QA da entrega · PDF', storage_path:'qa/x.pdf', drive_url:null, version_label:'1.0', published_at:'2026-10-08T13:00:00Z', updated_at:'2026-10-08T13:00:00Z', status:'published', client_visible:true });
tables.comments=[{ id:'qa-c-1', company_id:companyId, target_id:dvId, target_type:'deliverable', author_user_id:userId, body:'Mensagem QA do cliente pedindo uma revisão na atribuição.', client_visible:true, source_actor:'client', created_at:'2026-10-08T13:12:00Z' },{ id:'qa-c-2', company_id:companyId, target_id:dvId, target_type:'deliverable', author_user_id:'admin-qa', body:'Resposta QA da CALI: vamos revisar e registrar na próxima versão.', client_visible:true, source_actor:'admin', created_at:'2026-10-08T13:25:00Z' }];
const readRpcs = {
  get_client_hours_summary: { visible: true, contractedHours: 20, consumedMinutes: 90, remainingMinutes: 1110, overMinutes: 0, usagePercent: 7.5 },
  client_meeting_records_v1: [],
  get_client_home_work_metrics: { ratings: { average: 4.5, count: 2 }, work: { total: 1, completed: 0, notStarted: 0, inProgress: 0, internalReview: 0, withClient: 1 } },
  record_report_client_event_v55: { open_count: 1, first_opened_at: now, last_opened_at: now },
  get_client_account_contact: [{ full_name: 'Consultora QA', job_title: 'People Advisory' }],
};
module.exports = { user, token, tables, readRpcs, companyId };
