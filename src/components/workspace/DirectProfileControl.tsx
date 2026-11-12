import { Button } from '../ds/Button';
import { DialogFrame } from '../ds/DialogFrame';
import { FieldLabel } from '../ds/FieldLabel';
import { ChangeEvent, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Building2, Camera, Check, ChevronDown, Download, Instagram, Linkedin, Loader2, Mail, MessageCircle, PenLine, Phone, ShieldCheck, Upload, UserRound, X } from 'lucide-react';
import { exportOwnWorkspaceData, listOwnPrivacyRequests, requestWorkspaceDataRights } from '../../api/workspace/privacy';
import {
  readOwnWorkspaceProfile,
  readProfileCompany,
  updateOwnWorkspaceProfile,
  uploadWorkspaceProfileImage,
  workspaceProfileAvailable,
} from '../../api/workspace/profile';
import { useWorkspaceAuth } from '../../auth/hooks/useWorkspaceAuth';
import { accessSupportLink, caliInstagram, caliLinkedIn, privacySupportLink } from '../../domain/caliContacts';
import { legalEnabled } from '../../domain/legalTexts';
import { optimizeImageForUpload } from '../../lib/imageUpload';
import { resolveWorkspaceMedia } from '../../lib/workspaceMedia';
import { Link } from '../navigation/Link';

type Role='admin'|'client'|'partner';
type SignatureMode='generated'|'uploaded';
type SignatureStyle='executive'|'editorial'|'notarial'|'heritage'|'calligraphic'|'autograph'|'contemporary'|'italian'|'minimal'|'personal';
type ProfileData={
  full_name:string;email:string;job_title:string;phone:string;whatsapp:string;linkedin_url:string;instagram_url:string;
  avatar_url:string;avatar_position_x:number;avatar_position_y:number;avatar_zoom:number;
  signature_mode:SignatureMode;signature_url:string;signature_style:SignatureStyle;
};
type SignatureOption={value:SignatureStyle;label:string;hint:string};

const signatureStyles:SignatureOption[]=[
  {value:'executive',label:'Executiva',hint:'Sóbria e institucional'},
  {value:'editorial',label:'Editorial',hint:'Elegante e de alto contraste'},
  {value:'notarial',label:'Notarial',hint:'Clássica, firme e discreta'},
  {value:'heritage',label:'Heritage',hint:'Caligrafia refinada'},
  {value:'calligraphic',label:'Caligráfica',hint:'Traço longo e leve'},
  {value:'autograph',label:'Autógrafo',hint:'Natural e contínua'},
  {value:'contemporary',label:'Contemporânea',hint:'Limpa e atual'},
  {value:'italian',label:'Italiana',hint:'Fina e inclinada'},
  {value:'minimal',label:'Minimal',hint:'Discreta e elegante'},
  {value:'personal',label:'Personal',hint:'Marcante sem exagero'},
];

const legacyStyleMap:Record<string,SignatureStyle>={classic:'heritage',fluid:'calligraphic',delicate:'contemporary',formal:'executive'};
const profileFallback:Record<Exclude<Role,'partner'>,ProfileData>={
  admin:{full_name:'Patrícia Lima',email:'patricia@calirh.com',job_title:'People Advisory Executive',phone:'',whatsapp:'',linkedin_url:'',instagram_url:'',avatar_url:'',avatar_position_x:50,avatar_position_y:50,avatar_zoom:1,signature_mode:'generated',signature_url:'',signature_style:'executive'},
  client:{full_name:'',email:'',job_title:'',phone:'',whatsapp:'',linkedin_url:'',instagram_url:'',avatar_url:'',avatar_position_x:50,avatar_position_y:50,avatar_zoom:1,signature_mode:'generated',signature_url:'',signature_style:'calligraphic'},
};
const occurrencePaths = {
  admin: '/admin/registros',
  client: '/cliente/registros',
};
const privacyKindLabels = {
  access: 'Acesso aos meus dados',
  correction: 'Correção de dados',
  deletion: 'Exclusão de dados',
  other: 'Outro pedido',
};
const privacyStatusLabels = {
  open: 'Aguardando resposta',
  answered: 'Respondido',
  closed: 'Encerrado',
};
type PrivacyRequest = {
  id: string;
  kind: keyof typeof privacyKindLabels;
  status: keyof typeof privacyStatusLabels;
  answer: string | null;
  created_at: string;
};

function initials(name:string){return name.split(' ').filter(Boolean).slice(0,2).map((part)=>part[0]?.toUpperCase()).join('')||'C';}
function normalizeExternalUrl(value:string){const trimmed=value.trim();if(!trimmed)return'';return/^https?:\/\//i.test(trimmed)?trimmed:`https://${trimmed}`;}
function whatsappUrl(value:string){const digits=value.replace(/\D/g,'');if(!digits)return'';return`https://wa.me/${digits.startsWith('55')?digits:`55${digits}`}`;}
function avatarStyle(profile:Pick<ProfileData,'avatar_position_x'|'avatar_position_y'|'avatar_zoom'>):CSSProperties{return{'--avatar-x':`${profile.avatar_position_x}%`,'--avatar-y':`${profile.avatar_position_y}%`,'--avatar-zoom':String(profile.avatar_zoom)} as CSSProperties;}
function safeSignatureStyle(value:unknown):SignatureStyle{
  const raw=String(value||'');
  const legacy=legacyStyleMap[raw];
  if(legacy)return legacy;
  return signatureStyles.some((item)=>item.value===raw)?raw as SignatureStyle:'executive';
}

type ProfileTrigger=(context:{profile:ProfileData;avatar:ReactNode;companyName:string;openEditor:()=>void})=>ReactNode;
export function DirectProfileControl({role,trigger,partnerHasOccurrences = false}:{role:Role;trigger?:ProfileTrigger;partnerHasOccurrences?:boolean}){
  const { user } = useWorkspaceAuth();
  const fallback = profileFallback[role === 'admin' ? 'admin' : 'client'];
  const occurrencePath = role === 'partner' ? (partnerHasOccurrences ? '/equipe/ocorrencias' : null) : occurrencePaths[role];
  const privacySection = useRef<HTMLElement>(null);
  const[profile,setProfile]=useState<ProfileData>(fallback),[draft,setDraft]=useState<ProfileData>(fallback);
  const[modalOpen,setModalOpen]=useState(false),[saving,setSaving]=useState(false),[message,setMessage]=useState('');
  const[companyName,setCompanyName]=useState('');
  // Direitos do titular (LGPD, art. 18): baixar os próprios dados e pedir acesso, correção ou exclusão.
  const[privacyBusy,setPrivacyBusy]=useState(false),[privacyForm,setPrivacyForm]=useState<{kind:string;details:string}|null>(null),[privacyMessage,setPrivacyMessage]=useState('');
  async function downloadMyData(){if(!workspaceProfileAvailable||privacyBusy)return;setPrivacyBusy(true);setPrivacyMessage('');const result=await exportOwnWorkspaceData();setPrivacyBusy(false);if(!result||result.error){setPrivacyMessage('Não foi possível gerar o arquivo agora. Tente de novo.');return;}const blob=new Blob([JSON.stringify(result.data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`meus-dados-cali-workspace-${new Date().toISOString().slice(0,10)}.json`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);setPrivacyMessage('Arquivo com os seus dados baixado.');}
  const [loadedPrivacy, setLoadedPrivacy] = useState<{ owner: string; requests: PrivacyRequest[] } | null>(null);
  const privacyRequests = loadedPrivacy?.owner === user?.id ? loadedPrivacy?.requests : null;
  const [privacyLoadError, setPrivacyLoadError] = useState(false);
  const [privacyRevision, setPrivacyRevision] = useState(0);
  async function sendPrivacyRequest(){if(!workspaceProfileAvailable||!privacyForm||privacyBusy||privacyForm.details.trim().length<5)return;setPrivacyBusy(true);const result=await requestWorkspaceDataRights(privacyForm.kind,privacyForm.details.trim());setPrivacyBusy(false);if(!result||result.error){setPrivacyMessage('Não foi possível enviar o pedido. Tente de novo.');return;}setPrivacyForm(null);setPrivacyMessage('Pedido enviado à CALI. A resposta chega em até 15 dias.');setPrivacyRevision((revision)=>revision+1);}
  const[companyLogo,setCompanyLogo]=useState('');
  const[activeSection,setActiveSection]=useState<'details'|'signature'>('details');
  const[cropOpen,setCropOpen]=useState(false);

  useEffect(()=>{
    setProfile(fallback);setDraft(fallback);setCompanyName('');setCompanyLogo('');
    const cached=user?window.localStorage.getItem(`cali-workspace-profile-${user.id}`):null;
    if(cached){try{const raw=JSON.parse(cached);const parsed={...fallback,...raw,signature_style:safeSignatureStyle(raw?.signature_style)} as ProfileData;setProfile(parsed);setDraft(parsed);}catch{}}
    let mounted=true;
    async function load(){
      if(!user||!mounted)return;
      const data = await readOwnWorkspaceProfile(user.id);
      if (!mounted || !data) return;
      if (role === 'client' && data.company_id) {
        const company = await readProfileCompany(data.company_id);
        if (!mounted) return;
        setCompanyName(company?.display_name || '');
        const logo = await resolveWorkspaceMedia(company?.logo_url || company?.logo_workspace_url);
        if (!mounted) return;
        setCompanyLogo(logo);
      }
      const next:ProfileData={
        full_name:data.full_name||fallback.full_name,
        email:data.email||user.email||fallback.email,
        job_title:data.job_title||fallback.job_title,
        phone:data.phone||'',whatsapp:data.whatsapp||'',linkedin_url:data.linkedin_url||'',instagram_url:data.instagram_url||'',avatar_url:data.avatar_url||'',
        avatar_position_x:Number(data.avatar_position_x??50),avatar_position_y:Number(data.avatar_position_y??50),avatar_zoom:Number(data.avatar_zoom??1),
        signature_mode:data.signature_mode==='uploaded'?'uploaded':'generated',signature_url:data.signature_url||'',signature_style:safeSignatureStyle(data.signature_style),
      };
      setProfile(next);setDraft(next);
    }
    void load();
    return()=>{mounted=false;};
  },[fallback,role,user?.id]);

  useEffect(() => {
    setLoadedPrivacy(null);
    setPrivacyLoadError(false);
    if (!modalOpen || role !== 'client' || !user || !workspaceProfileAvailable) return;
    let current = true;
    void listOwnPrivacyRequests(user.id).then((result) => {
      if (!current) return;
      if (!result || result.error) setPrivacyLoadError(true);
      else setLoadedPrivacy({ owner: user.id, requests: result.data as PrivacyRequest[] });
    });
    return () => { current = false; };
  }, [modalOpen, privacyRevision, role, user?.id]);

  useEffect(()=>{if(!modalOpen)return;document.body.classList.add('workspace-modal-open');return()=>document.body.classList.remove('workspace-modal-open');},[modalOpen]);

  const avatar=useMemo(()=>profile.avatar_url?<img src={profile.avatar_url} alt="" style={avatarStyle(profile)}/>:<span>{initials(profile.full_name)}</span>,[profile]);
  function openEditor(){setDraft(profile);setMessage('');setActiveSection('details');setCropOpen(false);setPrivacyForm(null);setPrivacyMessage('');setModalOpen(true);}
  async function uploadImage(file:File,kind:'avatar'|'signature'){
    if (!workspaceProfileAvailable || !user) return '';
    const prepared = await optimizeImageForUpload(file, kind);
    return uploadWorkspaceProfileImage(user.id, kind, prepared);
  }
  async function handleAvatar(event:ChangeEvent<HTMLInputElement>){
    const file=event.target.files?.[0];if(!file)return;setMessage('');
    try{const url=await uploadImage(file,'avatar');if(url)setDraft((current)=>({...current,avatar_url:url,avatar_position_x:50,avatar_position_y:50,avatar_zoom:1}));}
    catch(error){setMessage(error instanceof Error?error.message:'Não consegui enviar essa imagem.');}
    event.target.value='';
  }
  async function handleSignature(event:ChangeEvent<HTMLInputElement>){
    const file=event.target.files?.[0];if(!file)return;setMessage('');
    try{const url=await uploadImage(file,'signature');if(url)setDraft((current)=>({...current,signature_mode:'uploaded',signature_url:url}));}
    catch(error){setMessage(error instanceof Error?error.message:'Não consegui enviar a assinatura.');}
    event.target.value='';
  }
  async function saveProfile(){
    if(!draft.full_name.trim())return;
    setSaving(true);setMessage('');
    const next={...draft,full_name:draft.full_name.trim(),signature_style:draft.signature_mode==='generated'?'calligraphic' as const:draft.signature_style,linkedin_url:normalizeExternalUrl(draft.linkedin_url),instagram_url:normalizeExternalUrl(draft.instagram_url)};
    try{
      const savedUserId = await updateOwnWorkspaceProfile(user?.id, next);
      if (savedUserId) window.localStorage.setItem(`cali-workspace-profile-${savedUserId}`, JSON.stringify(next));
      setProfile(next);setDraft(next);setModalOpen(false);
    }catch(error){setMessage(error instanceof Error?error.message:'Não foi possível salvar o perfil.');}
    finally{setSaving(false);}
  }

  return <>
    {trigger?trigger({profile,avatar,companyName:companyName||'',openEditor}):<div className="profile-control profile-control-direct">
      <button className="profile-trigger profile-trigger-direct" type="button" onClick={openEditor} aria-label="Minha conta" title="Minha conta">
        <span className="profile-avatar">{avatar}</span>
        <span className="profile-copy"><strong>{profile.full_name}</strong><small>{role==='admin'?'Administradora geral':'Perfil cliente'}</small></span>
        <ChevronDown className="profile-edit-chevron" size={16}/>
      </button>
    </div>}
    {modalOpen?createPortal(<div className="modal-backdrop chrome-modal-backdrop full-screen-modal" role="presentation">
      <DialogFrame className="modal-card profile-modal profile-modal-v2 profile-modal-v55 profile-account-v66" aria-label="Minha conta">
        <Button variant="close" type="button" onClick={()=>setModalOpen(false)} aria-label="Fechar"><X size={20}/></Button>
        <header className="profile-account-header"><div className="profile-account-title-row"><h2>Minha conta</h2>{role==='admin'?<span className="profile-role-label">Administradora geral</span>:null}</div><p>Seus dados e sua identidade nos registros da CALI.</p></header>
        {role==='client'&&companyName?<div className="profile-company-affiliation"><span className="profile-company-mark">{companyLogo?<img src={companyLogo} alt={`Logo ${companyName}`}/>:<Building2 size={22}/>}</span><span><small>PERFIL CLIENTE</small><strong>{companyName}</strong><span>Seu acesso está vinculado a esta empresa.</span></span></div>:null}
        <nav className="profile-account-tabs" aria-label="Seções do perfil">
          <button type="button" className={activeSection==='details'?'active':''} aria-current={activeSection==='details'?'page':undefined} onClick={()=>setActiveSection('details')}><UserRound size={17}/>Dados pessoais</button>
          <button type="button" className={activeSection==='signature'?'active':''} aria-current={activeSection==='signature'?'page':undefined} onClick={()=>setActiveSection('signature')}><PenLine size={17}/>Assinatura</button>
        </nav>
        {activeSection==='details'?<div className="profile-account-details">
          <section className="profile-account-photo" aria-label="Foto do perfil">
            <span className="profile-avatar profile-avatar-editor large-editor-avatar">{draft.avatar_url?<img src={draft.avatar_url} alt="Prévia do perfil" style={avatarStyle(draft)}/>:<span>{initials(draft.full_name)}</span>}</span>
            <strong>Foto do perfil</strong><p>Escolha a imagem que aparece para você e para a CALI.</p>
            <label className="photo-upload-button"><Camera size={16}/>Trocar foto<input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAvatar}/></label>
            {draft.avatar_url?<button type="button" className="profile-account-crop-toggle" aria-expanded={cropOpen} onClick={()=>setCropOpen((open)=>!open)}>{cropOpen?'Fechar ajuste':'Ajustar enquadramento'}</button>:null}
            {cropOpen&&draft.avatar_url?<div className="profile-account-crop"><label>Zoom<input type="range" min="1" max="3" step="0.05" value={draft.avatar_zoom} onChange={(event)=>setDraft((current)=>({...current,avatar_zoom:Number(event.target.value)}))}/></label><label>Horizontal<input type="range" min="0" max="100" value={draft.avatar_position_x} onChange={(event)=>setDraft((current)=>({...current,avatar_position_x:Number(event.target.value)}))}/></label><label>Vertical<input type="range" min="0" max="100" value={draft.avatar_position_y} onChange={(event)=>setDraft((current)=>({...current,avatar_position_y:Number(event.target.value)}))}/></label></div>:null}
          </section>
          <section className="profile-account-fields" aria-label="Dados pessoais e contato"><h3>Dados pessoais</h3><div className="form-grid profile-form-grid"><FieldLabel className="wide">Nome completo<input value={draft.full_name} onChange={(event)=>setDraft((current)=>({...current,full_name:event.target.value}))} autoComplete="name"/></FieldLabel><FieldLabel>Cargo / função<input value={draft.job_title} onChange={(event)=>setDraft((current)=>({...current,job_title:event.target.value}))}/></FieldLabel><FieldLabel>Telefone<input value={draft.phone} onChange={(event)=>setDraft((current)=>({...current,phone:event.target.value}))} inputMode="tel"/></FieldLabel><FieldLabel><span className="label-with-icon"><MessageCircle size={15}/>WhatsApp</span><input value={draft.whatsapp} onChange={(event)=>setDraft((current)=>({...current,whatsapp:event.target.value}))} inputMode="tel"/></FieldLabel><FieldLabel><span className="label-with-icon"><Linkedin size={15}/>LinkedIn</span><input value={draft.linkedin_url} onChange={(event)=>setDraft((current)=>({...current,linkedin_url:event.target.value}))}/></FieldLabel><FieldLabel><span className="label-with-icon"><Instagram size={15}/>Instagram</span><input value={draft.instagram_url} onChange={(event)=>setDraft((current)=>({...current,instagram_url:event.target.value}))}/></FieldLabel><FieldLabel className="wide"><span className="label-with-icon"><Mail size={15}/>E-mail de acesso</span><input value={draft.email} disabled/></FieldLabel></div></section>
        </div>:<section className="profile-signature-v55 profile-signature-v56 profile-signature-v59 profile-signature-clean">
          <div className="profile-signature-heading-v55"><div><span>ASSINATURA</span><h3>Sua assinatura</h3><p>Digite seu nome. Ele aparece abaixo com o mesmo traço de assinatura em todo o Workspace.</p></div></div>
          {draft.signature_mode==='uploaded'&&draft.signature_url?<div className="profile-signature-uploaded"><img src={draft.signature_url} alt="Sua assinatura atual"/><button type="button" onClick={()=>setDraft((current)=>({...current,signature_mode:'generated',signature_style:'calligraphic'}))}>Usar meu nome digitado</button></div>:<label className="profile-signature-single-field"><span>Nome para assinatura</span><input className="signature-style-calligraphic" value={draft.full_name} onChange={(event)=>setDraft((current)=>({...current,full_name:event.target.value,signature_mode:'generated',signature_style:'calligraphic'}))} placeholder="Digite seu nome" autoComplete="name"/></label>}
          <label className="profile-signature-upload-link"><Upload size={14}/>Prefiro enviar uma assinatura em imagem<input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleSignature}/></label>
          <small>Esta é sua identidade visual. A ciência de documentos e relatórios é confirmada separadamente.</small>
        </section>}
        {activeSection==='details'?<div className="profile-live-actions">{(draft.whatsapp||draft.phone)?<a className="secondary" href={whatsappUrl(draft.whatsapp||draft.phone)} target="_blank" rel="noreferrer"><MessageCircle size={16}/>Abrir WhatsApp</a>:null}{draft.phone?<a className="secondary" href={`tel:${draft.phone.replace(/[^+\d]/g,'')}`}><Phone size={16}/>Ligar</a>:null}</div>:null}
        <section className="profile-privacy-v2" aria-label="Ajuda e contato">
          <strong>Ajuda e contato</strong>
          <span className="profile-privacy-actions">
            {occurrencePath && <Link to={occurrencePath} onClick={() => setModalOpen(false)}>Acompanhar um assunto</Link>}
            <a href={accessSupportLink()}>Problemas de acesso</a>
            {role === 'client' ? <a href="#meus-pedidos-de-dados" onClick={(event) => {
              event.preventDefault();
              privacySection.current?.focus();
              privacySection.current?.scrollIntoView({ block: 'start' });
            }}>Pedidos sobre meus dados</a> : <a href={privacySupportLink}>Pedidos sobre meus dados</a>}
          </span>
        </section>
        <section ref={privacySection} id="meus-pedidos-de-dados" className="profile-privacy-v2" aria-label="Privacidade e meus dados" tabIndex={-1}>
          <div><strong><ShieldCheck size={16}/>Privacidade e meus dados</strong><p>Você pode baixar uma cópia dos seus dados. {legalEnabled()?<><a href="/privacidade" target="_blank" rel="noopener">Política de Privacidade</a> · <a href="/termos" target="_blank" rel="noopener">Termos de Uso</a></>:<a href="https://calirh.com/privacidade.html" target="_blank" rel="noopener noreferrer">Política de privacidade</a>}</p></div>
          {privacyForm?<div className="profile-privacy-form"><label>Tipo de pedido<select value={privacyForm.kind} onChange={(event)=>setPrivacyForm({...privacyForm,kind:event.target.value})}><option value="access">Acesso aos meus dados</option><option value="correction">Correção de dados</option><option value="deletion">Exclusão de dados</option><option value="other">Outro pedido</option></select></label><label>O que você precisa<textarea rows={3} maxLength={2000} value={privacyForm.details} onChange={(event)=>setPrivacyForm({...privacyForm,details:event.target.value})} placeholder="Descreva o pedido."/></label><span><button type="button" onClick={()=>setPrivacyForm(null)}>Cancelar</button><Button type="button" variant="primary" disabled={privacyBusy||privacyForm.details.trim().length<5} onClick={()=>void sendPrivacyRequest()}>{privacyBusy?'Enviando…':'Enviar pedido'}</Button></span></div>
          :<span className="profile-privacy-actions"><button type="button" disabled={privacyBusy} onClick={()=>void downloadMyData()}><Download size={14}/>{privacyBusy?'Gerando…':'Baixar meus dados'}</button>{role === 'client' && <button type="button" onClick={()=>{setPrivacyMessage('');setPrivacyForm({kind:'access',details:''});}}>Pedir acesso, correção ou exclusão</button>}</span>}
          {privacyMessage&&<small role="status">{privacyMessage}</small>}
          {role === 'client' && (
            <details>
              <summary>Meus pedidos de dados</summary>
              {privacyLoadError ? (
                <p role="alert">Não foi possível consultar seus pedidos. <button type="button" onClick={() => setPrivacyRevision((revision) => revision + 1)}>Tentar novamente</button></p>
              ) : !privacyRequests ? (
                <p role="status">Carregando pedidos…</p>
              ) : privacyRequests.length ? (
                <ul>
                  {privacyRequests.map((request) => (
                    <li key={request.id}>
                      <strong>{privacyKindLabels[request.kind]}</strong>
                      <p>{new Date(request.created_at).toLocaleDateString('pt-BR')} · {privacyStatusLabels[request.status]}</p>
                      {request.answer && <p>{request.answer}</p>}
                    </li>
                  ))}
                </ul>
              ) : <p>Você ainda não fez pedidos.</p>}
            </details>
          )}
        </section>
        <section className="profile-privacy-v2" aria-label="Sobre a CALI">
          <strong>Sobre a CALI</strong>
          <span className="profile-privacy-actions">
            <a href={caliInstagram} target="_blank" rel="noreferrer">Instagram</a>
            <a href={caliLinkedIn} target="_blank" rel="noreferrer">LinkedIn</a>
          </span>
        </section>
        {message?<div className="form-message">{message}</div>:null}
        <div className="modal-actions"><button type="button" className="profile-secondary-v56" onClick={()=>setModalOpen(false)}>Fechar</button><button type="button" className="profile-primary-v56" onClick={saveProfile} disabled={saving}>{saving?<Loader2 size={17} className="spin"/>:<Check size={17}/>} {saving?'Salvando…':'Salvar alterações'}</button></div>
      </DialogFrame>
    </div>,document.body):null}
  </>;
}
