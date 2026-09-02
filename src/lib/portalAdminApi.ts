import { supabase } from './supabase';

const SUPABASE_URL = 'https://kqtbfeeqbcllwvlkbrkq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_rhIy864X0VSQ0B7m7gdmCQ_hX3sKFMg';

export type PortalSubmissionStatus = 'novo'|'analise'|'edicao'|'aprovada'|'enviada'|'negociacao'|'fechada'|'recusada'|'expirada';
export type PortalSubmission = {
  id:string; protocol:string; service_slug:string; status:PortalSubmissionStatus;
  contact_name:string; contact_role?:string|null; contact_email:string; contact_phone?:string|null;
  contact_preference?:string|null; company_name?:string|null; company_segment?:string|null;
  company_size?:number|null; company_units?:number|null; company_location?:string|null;
  answers:Record<string,unknown>; source_path?:string|null; lgpd_accepted:boolean;
  internal_notes?:string|null; archived_at?:string|null; created_at:string; updated_at:string;
};
export type PortalSubmissionPatch=Partial<Pick<PortalSubmission,'status'|'internal_notes'|'archived_at'|'contact_name'|'contact_role'|'contact_email'|'contact_phone'|'contact_preference'|'company_name'|'company_segment'|'company_size'|'company_units'|'company_location'>>;
export type PortalProposalStatus='rascunho'|'aprovada'|'enviada'|'aceita'|'recusada'|'expirada';
export type PortalProposal = {
  id:string; submission_id:string; service_slug:string; version:number; package_code:string;
  base_price:number; extras:number; discount_pct:number; contract_months:number; validity_days:number;
  subtotal:number; final_unit:number; total_value:number; calculator_data:Record<string,any>;
  scope_items:unknown[]; payment_terms?:string|null; public_notes?:string|null;
  status:PortalProposalStatus; pdf_path?:string|null; resend_email_id?:string|null; sent_at?:string|null;
  created_at:string; updated_at:string;
};
export type PortalProposalWrite = Omit<PortalProposal,'id'|'created_at'|'updated_at'|'pdf_path'|'resend_email_id'|'sent_at'> & Partial<Pick<PortalProposal,'pdf_path'|'resend_email_id'|'sent_at'>>;
export type PortalActivity = {id:number; submission_id?:string|null; proposal_id?:string|null; event_type:string; metadata:Record<string,unknown>; created_at:string};
export type PortalPricingRule = {id:string; service_slug:string; package_code:string; package_label:string; base_price:number; config:Record<string,any>; active:boolean; sort_order:number};
export type PortalMapaResponse={id:string;protocolo?:string|null;c_email?:string|null;created_at:string;diagnostico_v2?:Record<string,any>|null};

async function sessionToken(){
  if(!supabase) throw new Error('Supabase não configurado.');
  const {data,error}=await supabase.auth.getSession();
  if(error) throw error;
  if(!data.session?.access_token) throw new Error('Sessão administrativa não encontrada.');
  return data.session.access_token;
}

async function request<T>(path:string, init:RequestInit={}){
  const token=await sessionToken();
  const response=await fetch(`${SUPABASE_URL}/rest/v1/${path}`,{
    ...init,cache:'no-store',headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${token}`,'Content-Type':'application/json','Accept-Profile':'public','Content-Profile':'public',...(init.headers||{})},
  });
  const text=await response.text();let payload:any=null;if(text){try{payload=JSON.parse(text);}catch{payload=text;}}
  if(!response.ok)throw new Error(String(payload?.message||payload?.error||text||`Erro ${response.status}`));
  return payload as T;
}

export async function loadPortalAdminData(){
  const [submissions,proposals,pricing,activity]=await Promise.all([
    request<PortalSubmission[]>('cali_submissions?select=*&order=created_at.desc'),request<PortalProposal[]>('cali_proposals?select=*&order=created_at.desc'),request<PortalPricingRule[]>('cali_pricing_rules?select=*&active=eq.true&order=service_slug,sort_order'),request<PortalActivity[]>('cali_activity?select=*&order=created_at.desc&limit=500'),
  ]);return{submissions,proposals,pricing,activity};
}

export async function loadPortalOpportunity(id:string){
  const [submissions,proposals,pricing]=await Promise.all([
    request<PortalSubmission[]>(`cali_submissions?id=eq.${encodeURIComponent(id)}&select=*`),request<PortalProposal[]>(`cali_proposals?submission_id=eq.${encodeURIComponent(id)}&select=*&order=version.desc`),request<PortalPricingRule[]>('cali_pricing_rules?select=*&active=eq.true&order=service_slug,sort_order'),
  ]);
  const submission=submissions[0]||null;let mapa:PortalMapaResponse|null=null;
  if(submission?.contact_email){const email=encodeURIComponent(submission.contact_email.trim().toLowerCase());try{const rows=await request<PortalMapaResponse[]>(`mapa_respostas?c_email=ilike.${email}&select=id,protocolo,c_email,created_at,diagnostico_v2&order=created_at.desc&limit=1`);mapa=rows[0]||null;}catch{mapa=null;}}
  return{submission,proposals,pricing,mapa};
}

export async function loadPortalProposal(id:string){
  const rows=await request<Array<PortalProposal&{submission:PortalSubmission}>>(`cali_proposals?id=eq.${encodeURIComponent(id)}&select=*,submission:cali_submissions(*)`);
  return rows[0]||null;
}

export async function updatePortalSubmission(id:string,patch:PortalSubmissionPatch){
  const rows=await request<PortalSubmission[]>(`cali_submissions?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({...patch,updated_at:new Date().toISOString()})});return rows[0]||null;
}

export async function savePortalProposal(input:{proposalId?:string|null;payload:PortalProposalWrite}){
  const body={...input.payload,updated_at:new Date().toISOString()};
  if(input.proposalId){const rows=await request<PortalProposal[]>(`cali_proposals?id=eq.${encodeURIComponent(input.proposalId)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(body)});return rows[0]||null;}
  const rows=await request<PortalProposal[]>('cali_proposals',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(body)});return rows[0]||null;
}

export async function updatePortalProposal(id:string,patch:Partial<Pick<PortalProposal,'status'|'pdf_path'|'resend_email_id'|'sent_at'>>){
  const rows=await request<PortalProposal[]>(`cali_proposals?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({...patch,updated_at:new Date().toISOString()})});return rows[0]||null;
}

export async function sendPortalProposal(input:{proposal_id:string;pdf_base64:string;pdf_name:string;note:string;company_name:string;recipient_name:string;recipient_email:string}){
  const token=await sessionToken();const response=await fetch(`${SUPABASE_URL}/functions/v1/portal-send-proposal`,{method:'POST',headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(input)});const result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(result.error||'Não foi possível enviar a proposta.');return result as {ok:true;email_id?:string;to?:string;subject?:string};
}

export async function appendPortalActivity(input:{submission_id:string;proposal_id?:string|null;event_type:string;metadata?:Record<string,unknown>}){
  const rows=await request<PortalActivity[]>('cali_activity',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({...input,metadata:input.metadata||{}})});return rows[0]||null;
}

export function portalServiceLabel(slug:string){const labels:Record<string,string>={'assessoria-estrategica':'Assessoria Estratégica Mensal — HR as a Service','mentoria-rh':'Mentoria para Profissionais de RH','diagnostico-executivo':'Diagnóstico Executivo de Pessoas','cultura-direcao':'Projeto de Cultura e Direção','shadowing-lideranca':'Shadowing de Liderança',treinamentos:'Treinamentos & Palestras','marca-empregadora':'Marca Empregadora','solucao-personalizada':'Solução Personalizada'};return labels[slug]||slug;}
export const PORTAL_STATUS:Array<{value:PortalSubmissionStatus;label:string}>=[{value:'novo',label:'Nova resposta'},{value:'analise',label:'Em análise'},{value:'edicao',label:'Proposta em edição'},{value:'aprovada',label:'Aprovada internamente'},{value:'enviada',label:'Enviada'},{value:'negociacao',label:'Em negociação'},{value:'fechada',label:'Fechada'},{value:'recusada',label:'Recusada'},{value:'expirada',label:'Expirada'}];
export function portalStatusLabel(status:string){return PORTAL_STATUS.find(item=>item.value===status)?.label||status;}
