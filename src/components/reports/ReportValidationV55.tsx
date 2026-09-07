import type { CSSProperties } from 'react';

export type ReportSignatureStyleV59='executive'|'editorial'|'notarial'|'heritage'|'calligraphic'|'autograph'|'contemporary'|'italian'|'minimal'|'personal'|'classic'|'fluid'|'delicate'|'formal';
export type ReportIdentityV55={
  user_id?:string;full_name?:string;job_title?:string;avatar_url?:string;
  avatar_position_x?:number;avatar_position_y?:number;avatar_zoom?:number;
  signature_mode?:'generated'|'uploaded';signature_url?:string;signature_style?:ReportSignatureStyleV59;
  signed_at?:string;protocol?:string;
};

const allowedStyles=new Set<ReportSignatureStyleV59>(['executive','editorial','notarial','heritage','calligraphic','autograph','contemporary','italian','minimal','personal','classic','fluid','delicate','formal']);
function fmt(value?:string|null){
  if(!value)return'—';
  const date=new Date(value);
  return Number.isNaN(date.getTime())?'—':new Intl.DateTimeFormat('pt-BR',{
    day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'
  }).format(date).replace('.','');
}
function avatarVars(identity?:ReportIdentityV55|null):CSSProperties{
  return{
    '--avatar-x':`${Number(identity?.avatar_position_x??50)}%`,
    '--avatar-y':`${Number(identity?.avatar_position_y??50)}%`,
    '--avatar-zoom':String(Number(identity?.avatar_zoom??1))
  } as CSSProperties;
}
function initials(name?:string){return String(name||'C').split(' ').filter(Boolean).slice(0,2).map((part)=>part[0]?.toUpperCase()).join('')||'C';}
function styleClass(identity?:ReportIdentityV55|null){const raw=identity?.signature_style;const value=raw&&allowedStyles.has(raw)?raw:'executive';return `signature-style-${value}`;}

function SignatureMark({identity}:{identity:ReportIdentityV55}){
  if(identity.signature_mode==='uploaded'&&identity.signature_url){
    return <img className="report-signature-image-v55" src={identity.signature_url} alt={`Assinatura de ${identity.full_name||'responsável'}`}/>;
  }
  return <span className={`report-signature-generated-v55 ${styleClass(identity)}`}>{identity.full_name||'Assinatura'}</span>;
}

function Party({label,identity,date,protocol,pending}:{label:string;identity?:ReportIdentityV55|null;date?:string|null;protocol?:string|null;pending?:boolean}){
  if(pending||!identity){
    return <article className="report-signature-party-v57 pending">
      <span className="report-signature-label-v57">{label}</span>
      <div className="report-signature-line-v57"><span className="report-signature-pending-v57">Aguardando ciência</span></div>
      <p>Registro opcional de leitura.</p>
    </article>;
  }
  return <article className="report-signature-party-v57">
    <span className="report-signature-label-v57">{label}</span>
    <div className="report-signature-line-v57"><SignatureMark identity={identity}/></div>
    <div className="report-signature-person-v57">
      <span className="report-validation-avatar-v55" style={avatarVars(identity)}>
        {identity.avatar_url?<img src={identity.avatar_url} alt=""/>:<span>{initials(identity.full_name)}</span>}
      </span>
      <div><strong>{identity.full_name||'Responsável'}</strong><span>{identity.job_title||''}</span></div>
    </div>
    <div className="report-signature-meta-v57"><span>{fmt(date||identity.signed_at)}</span>{protocol?<b>{protocol}</b>:null}</div>
  </article>;
}

export function ReportValidationBlockV55({approvalIdentity,acknowledgementIdentity,approvedAt,acknowledgedAt,acknowledgementProtocol}:{approvalIdentity?:ReportIdentityV55|null;acknowledgementIdentity?:ReportIdentityV55|null;approvedAt?:string|null;acknowledgedAt?:string|null;acknowledgementProtocol?:string|null}){
  if(!approvalIdentity&&!acknowledgementIdentity)return null;
  return <section className="report-validation-v55 report-validation-document-v57">
    <div className="report-validation-head-v57"><span>REGISTRO DO DOCUMENTO</span><strong>Aprovação CALI e ciência do cliente</strong></div>
    <div className="report-signature-grid-v57">
      <Party label="APROVADO PELA CALI" identity={approvalIdentity} date={approvedAt}/>
      <Party label="CIÊNCIA DO CLIENTE" identity={acknowledgementIdentity} date={acknowledgedAt} protocol={acknowledgementProtocol} pending={!acknowledgementIdentity}/>
    </div>
  </section>;
}
