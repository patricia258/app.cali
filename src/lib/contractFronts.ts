import { supabase } from './supabase';

export type Plan = 'partner' | 'full' | 'build_essential' | 'build_complete';
export type Front = { code:string; title:string; description:string; category:'recurring'|'vacancy'|'addon'|'project'; partner_core:boolean; full_core:boolean; partner_slot:boolean; full_slot:boolean; build_allowed:boolean; display_order:number };
export type ContractedFront = { id:string; company_id:string; front_code:string; mode:'slot_included'|'slot_paid'|'addon'|'build_assisted'; scope_label:string|null; started_at:string; ends_at:string|null; status:'active'|'ended' };
export type CompanyPlan = { id:string; display_name:string; service_plan:Plan|null; service_type:string|null };

export const planName:Record<Plan,string> = {partner:'CALI Partner',full:'CALI Full',build_essential:'CALI Build Essencial',build_complete:'CALI Build Completo'};
export function activeFront(front:ContractedFront) { return front.status==='active' && (!front.ends_at || front.ends_at>=new Date().toISOString().slice(0,10)); }
export function coreFront(front:Front, plan:Plan|null) { return plan==='partner' ? front.partner_core : plan==='full' ? front.full_core : false; }
export function eligibleMode(front:Front, plan:Plan|null):ContractedFront['mode']|null {
  if (!plan || coreFront(front,plan)) return null;
  if (plan==='partner') return front.partner_slot?'slot_paid':front.category==='addon'||front.category==='project'?'addon':null;
  if (plan==='full') return front.full_slot?'slot_included':front.category==='addon'||front.category==='project'?'addon':null;
  return front.build_allowed?'build_assisted':null;
}
export async function loadContractFronts(companyId:string) {
  if (!supabase) throw new Error('Conexão indisponível.');
  const [catalog,contracts]=await Promise.all([
    supabase.from('front_catalog').select('code,title,description,category,partner_core,full_core,partner_slot,full_slot,build_allowed,display_order').eq('active',true).order('display_order'),
    supabase.from('company_fronts').select('id,company_id,front_code,mode,scope_label,started_at,ends_at,status').eq('company_id',companyId).order('created_at',{ascending:false}),
  ]);
  if (catalog.error || contracts.error) throw catalog.error||contracts.error;
  return { catalog:(catalog.data||[]) as Front[], contracts:(contracts.data||[]) as ContractedFront[] };
}
