import type { CSSProperties } from 'react';

export type ReportIdentityV55={
  user_id?:string|null;
  full_name?:string|null;
  job_title?:string|null;
  avatar_url?:string|null;
  avatar_position_x?:number|null;
  avatar_position_y?:number|null;
  avatar_zoom?:number|null;
  signature_mode?:'generated'|'uploaded'|string|null;
  signature_url?:string|null;
  signature_style?:'classic'|'fluid'|'delicate'|'formal'|string|null;
  signed_at?:string|null;
  protocol?:string|null;
};

function formatDateTime(value?:string|null){if(!value)return'—';const date=new Date(value);return Number.isNaN(date.getTime())?'—':new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(date).replace('.', '');}
function initials(name?:string|null){return String(name||'C').split(' ').filter(Boolean).slice(0,2).map((part)=>part[0]?.toUpperCase()).join('')||'C';}
function avatarStyle(identity?:ReportIdentityV55|null):CSSProperties{return{'--avatar-x':`${Number(identity?.avatar_position_x??50)}%`,'--avatar-y':`${Number(identity?.avatar_position_y??50)}%`,'--avatar-zoom':String(Number(identity?.avatar_zoom??1))} as CSSProperties;}
function styleName(value?:string|null){return ['classic','fluid','delicate','formal'].includes(String(value))?String(value):'classic';}

export function SignatureMarkV55({identity}:{identity?:ReportIdentityV55|null}){if(identity?.signature_mode==='uploaded'&&identity.signature_url)return <img className="report-signature-image-v55" src={identity.signature_url} alt={`Assinatura de ${identity.full_name||'responsável'}`}/>;return <span className={`report-signature-generated-v55 signature-style-${styleName(identity?.signature_style)}`}>{identity?.full_name||'Assinatura'}</span>;}
function IdentityCard({label,identity,date,protocol,pending}:{label:string;identity?:ReportIdentityV55|null;date?:string|null;protocol?:string|null;pending?:boolean}){return <article className={`report-validation-card-v55 ${pending?'pending':''}`}><span className="report-validation-label-v55">{label}</span>{pending?<div className="report-validation-pending-v55"><strong>Aguardando ciência</strong><p>O registro é opcional e confirma apenas a leitura deste fechamento.</p></div>:<><div className="report-validation-person-v55"><span className="report-validation-avatar-v55">{identity?.avatar_url?<img src={identity.avatar_url} alt="" style={avatarStyle(identity)}/>:<b>{initials(identity?.full_name)}</b>}</span><div><strong>{identity?.full_name||'Responsável'}</strong><span>{identity?.job_title||'—'}</span></div></div><div className="report-validation-signature-v55"><SignatureMarkV55 identity={identity}/></div><div className="report-validation-meta-v55"><span>{formatDateTime(date||identity?.signed_at)}</span>{protocol?<b>{protocol}</b>:null}</div></>}</article>;}
export function ReportValidationBlockV55({approvalIdentity,acknowledgementIdentity,approvedAt,acknowledgedAt,acknowledgementProtocol}:{approvalIdentity?:ReportIdentityV55|null;acknowledgementIdentity?:ReportIdentityV55|null;approvedAt?:string|null;acknowledgedAt?:string|null;acknowledgementProtocol?:string|null}){if(!approvalIdentity&&!acknowledgementIdentity)return null;return <section className="report-validation-v55"><div className="report-validation-head-v55"><span>REGISTRO DO DOCUMENTO</span><strong>Aprovação CALI e ciência do cliente</strong></div><div className="report-validation-grid-v55"><IdentityCard label="APROVADO PELA CALI" identity={approvalIdentity} date={approvedAt}/><IdentityCard label="CIÊNCIA DO CLIENTE" identity={acknowledgementIdentity} date={acknowledgedAt} protocol={acknowledgementProtocol} pending={!acknowledgementIdentity}/></div></section>;}
