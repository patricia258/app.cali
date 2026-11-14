import type { ContractedFront, Front, Plan } from '../api/fronts/contracts';

export const planName:Record<Plan,string> = {partner:'CALI Partner',full:'CALI Full',build_essential:'CALI Build Essencial',build_complete:'CALI Build Completo'};
export function activeFront(front:ContractedFront) { return front.status==='active' && (!front.ends_at || front.ends_at>=new Date().toISOString().slice(0,10)); }
export function coreFront(front:Front, plan:Plan|null) { return plan==='partner' ? front.partner_core : plan==='full' ? front.full_core : false; }
export function eligibleMode(front:Front, plan:Plan|null):ContractedFront['mode']|null {
  if (!plan || coreFront(front,plan)) return null;
  if (plan==='partner') return front.partner_slot?'slot_paid':front.category==='addon'||front.category==='project'?'addon':null;
  if (plan==='full') return front.full_slot?'slot_included':front.category==='addon'||front.category==='project'?'addon':null;
  return front.build_allowed?'build_assisted':null;
}
