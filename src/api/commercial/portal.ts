import axios from 'axios';
import { supabase } from '../supabase';

import { supabaseEnvironment } from '../client-environment';

const portalHttp = supabaseEnvironment ? axios.create({
  baseURL: supabaseEnvironment.url,
  adapter: 'fetch',
  responseType: 'text',
  validateStatus: () => true,
  withXSRFToken: false,
  headers: {
    Accept: null,
    'User-Agent': false,
    apikey: supabaseEnvironment.key,
    'Content-Type': 'application/json',
  },
}) : null;

export type PortalSubmissionStatus = 'novo'|'analise'|'edicao'|'aprovada'|'enviada'|'negociacao'|'fechada'|'recusada'|'expirada';
export type PortalSubmission = {
  id:string; protocol:string; service_slug:string; status:PortalSubmissionStatus;
  contact_name:string; contact_role?:string|null; contact_email:string; contact_phone?:string|null;
  contact_preference?:string|null; company_name?:string|null; company_segment?:string|null;
  company_size?:number|null; company_units?:number|null; company_location?:string|null;
  answers:Record<string,any>; source_path?:string|null; lgpd_accepted:boolean;
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

type PortalRequestOptions = {
  method?: 'POST' | 'PATCH';
  headers?: Record<string, string>;
  body?: string;
  cache?: RequestCache;
};

async function portalResponse(path: string, options: PortalRequestOptions = {}) {
  if (!portalHttp) throw new Error('Supabase não configurado.');
  const token = await sessionToken();
  try {
    const response = await portalHttp.request<string>({
      url: path,
      method: options.method ?? 'GET',
      headers: { Authorization: `Bearer ${token}`, ...options.headers },
      data: options.body,
      fetchOptions: { cache: options.cache },
    });
    return {
      text: response.data,
      status: response.status,
      ok: response.status >= 200 && response.status < 300,
    };
  } catch (error) {
    // Axios wraps fetch failures. Keep the original message shown by the Portal.
    if (axios.isAxiosError(error) && error.cause instanceof Error) throw error.cause;
    throw error;
  }
}

function parsePortalJson(text: string, fallback: unknown): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

async function request<T>(path: string, options: PortalRequestOptions = {}) {
  const { text, status, ok } = await portalResponse(`/rest/v1/${path}`, {
    ...options,
    cache: 'no-store',
    headers: { 'Accept-Profile': 'public', 'Content-Profile': 'public', ...options.headers },
  });
  const payload = parsePortalJson(text, text || null);
  if (!ok) {
    const failure = payload as { message?: unknown; error?: unknown } | null;
    throw new Error(String(failure?.message || failure?.error || text || `Erro ${status}`));
  }
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

export async function sendPortalProposal(input:{proposal_id:string;request_id:string;version:number;pdf_base64?:string;pdf_name?:string;note?:string;recipient_email:string}){
  const { text, ok } = await portalResponse('/functions/v1/portal-send-proposal', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  const result = parsePortalJson(text, {});
  const response = result as { ok?: unknown; email_id?: unknown; error?: unknown } | null;
  if (!ok || response?.ok !== true || typeof response.email_id !== 'string' || !response.email_id.trim()) {
    const failure = response;
    throw new Error(String(failure?.error || 'Não foi possível enviar a proposta.'));
  }
  return result as { ok: true; email_id?: string; to?: string; subject?: string };
}

export async function appendPortalActivity(input:{submission_id:string;proposal_id?:string|null;event_type:string;metadata?:Record<string,unknown>}){
  const rows=await request<PortalActivity[]>('cali_activity',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({...input,metadata:input.metadata||{}})});return rows[0]||null;
}

export function portalServiceLabel(slug:string){const labels:Record<string,string>={
  'assessoria-estrategica':'Assessoria Estratégica Mensal — HR as a Service',
  'cali-build':'CALI Build — Estruturação Assistida de RH',
  'mentoria-rh':'Programa de Desenvolvimento para Profissionais de RH',
  'diagnostico-executivo':'Diagnóstico Executivo de People',
  'cultura-direcao':'Projeto de Cultura e Direção',
  'shadowing-lideranca':'Shadowing de Liderança',
  treinamentos:'Treinamentos & Palestras',
  'marca-empregadora':'Marca Empregadora',
  'solucao-personalizada':'Solução Personalizada',
};return labels[slug]||slug;}
export const PORTAL_STATUS:Array<{value:PortalSubmissionStatus;label:string}>=[{value:'novo',label:'Nova resposta'},{value:'analise',label:'Em análise'},{value:'edicao',label:'Proposta em edição'},{value:'aprovada',label:'Aprovada internamente'},{value:'enviada',label:'Enviada'},{value:'negociacao',label:'Em negociação'},{value:'fechada',label:'Fechada'},{value:'recusada',label:'Recusada'},{value:'expirada',label:'Expirada'}];
export function portalStatusLabel(status:string){return PORTAL_STATUS.find(item=>item.value===status)?.label||status;}
