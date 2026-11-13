import { Button } from '../ds/Button';
import { DialogFrame } from '../ds/DialogFrame';
import { FieldLabel } from '../ds/FieldLabel';
import { ChangeEvent, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Building2, Camera, Check, ChevronDown, Download, Instagram, Linkedin, Loader2, Mail, MessageCircle, PenLine, Phone, ShieldCheck, UserRound, X } from 'lucide-react';
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
import { ProfileSignatureEditor } from './components/ProfileSignatureEditor';
import { ProfileInfoSection } from './components/ProfileInfoSection';
import { ProfilePrivacyButton } from './components/ProfilePrivacyButton';
import './components/profile-dialog-motion.css';
import { WorkspaceProfileAvatar } from './WorkspaceProfileAvatar';

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
function safeSignatureStyle(value: string | null | undefined):SignatureStyle{
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
    if(cached){try{const raw: Partial<ProfileData> | null = JSON.parse(cached);const parsed: ProfileData = {...fallback,...raw,signature_style:safeSignatureStyle(raw?.signature_style)};setProfile(parsed);setDraft(parsed);}catch{/* A leitura do servidor ainda atualiza o perfil. */}}
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

  const avatar = <WorkspaceProfileAvatar identity={profile} alt="" fallback={<span data-workspace-identity>{initials(profile.full_name)}</span>} />;
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

  const profileFieldClass = 'tw:min-w-0 tw:gap-[0.231rem]! tw:text-[0.923rem]/[inherit]! tw:text-[#493b3e] tw:[&>input]:min-h-[2.769rem] tw:[&>input]:rounded-[0.692rem]! tw:[&>input]:px-[0.769rem]! tw:[&>input]:py-[0.462rem]! tw:[&>input:disabled]:bg-[#f5f0ea]! tw:[&>input:disabled]:text-[#716766]! tw:workspace-night:text-[#fff8f1] tw:workspace-night:[&>input]:border-[#f7f3ee1c]! tw:workspace-night:[&>input]:bg-[#241a1e]! tw:workspace-night:[&>input]:text-[#fffaf7]! tw:workspace-night:[&>input:disabled]:bg-[#33272a]! tw:workspace-night:[&>input:disabled]:text-[#e0d3cc]!';
  const profileTabClass = 'tw:-mb-px tw:inline-flex tw:min-h-[3.231rem] tw:flex-none tw:items-center tw:gap-[0.615rem] tw:border-0 tw:border-b-2 tw:border-solid tw:border-transparent tw:bg-transparent tw:px-[1.154rem] tw:py-[0.538rem] tw:font-semibold tw:text-[#65575a] tw:aria-[current=page]:border-cali-gold tw:aria-[current=page]:text-cali-brand tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-cali-gold tw:workspace-night:text-[#d5c7c2] tw:workspace-night:aria-[current=page]:text-[#e6bf78] tw:[@media(max-width:43.75rem)]:min-h-[2.923rem] tw:[@media(max-width:43.75rem)]:basis-1/2 tw:[@media(max-width:43.75rem)]:shrink tw:[@media(max-width:43.75rem)]:justify-center tw:[@media(max-width:43.75rem)]:p-[0.462rem]';

  return <>
    {trigger ? trigger({ profile, avatar, companyName: companyName || '', openEditor }) : (
      <div className="profile-control profile-control-direct tw:grid tw:size-[3.25rem] tw:place-items-center
        tw:group-hover/document-sidebar:block tw:group-hover/document-sidebar:size-auto tw:max-[53.8125rem]:block tw:max-[53.8125rem]:size-auto">
        <Button
          className="profile-trigger profile-trigger-direct tw:group/document-profile tw:grid tw:size-[3.25rem] tw:cursor-pointer
            tw:place-items-center tw:overflow-hidden tw:rounded-[0.9375rem] tw:border tw:border-solid tw:border-[#f7f3ee38]
            tw:bg-[#f7f3ee14] tw:p-1 tw:text-left tw:text-[0.875rem]/[normal] tw:text-[#fffaf7e6]
            tw:shadow-[0_0.375rem_1.125rem_#2a11181a] tw:workspace-night:border-[#5a1e2d2e] tw:workspace-night:bg-[#5a1e2d11]
            tw:workspace-night:shadow-[0_0.375rem_1.125rem_#4b242f14]
            tw:min-[53.8125rem]:group-hover/document-sidebar:h-[3.875rem] tw:min-[53.8125rem]:group-hover/document-sidebar:w-full
            tw:min-[53.8125rem]:group-hover/document-sidebar:grid-cols-[2.75rem_minmax(0,1fr)_1.125rem]
            tw:min-[53.8125rem]:group-hover/document-sidebar:justify-items-start tw:min-[53.8125rem]:group-hover/document-sidebar:gap-3.5
            tw:min-[53.8125rem]:group-hover/document-sidebar:rounded-none tw:min-[53.8125rem]:group-hover/document-sidebar:border-0
            tw:min-[53.8125rem]:group-hover/document-sidebar:bg-transparent tw:min-[53.8125rem]:group-hover/document-sidebar:py-[0.3125rem]
            tw:min-[53.8125rem]:group-hover/document-sidebar:pr-5 tw:min-[53.8125rem]:group-hover/document-sidebar:pl-1
            tw:min-[53.8125rem]:group-hover/document-sidebar:shadow-none
            tw:max-[53.8125rem]:h-auto tw:max-[53.8125rem]:w-full tw:max-[53.8125rem]:grid-cols-[2.75rem_minmax(0,1fr)_1.125rem]
            tw:max-[53.8125rem]:justify-items-start tw:max-[53.8125rem]:gap-3.5 tw:max-[53.8125rem]:rounded-none
            tw:max-[53.8125rem]:border-0 tw:max-[53.8125rem]:bg-transparent tw:max-[53.8125rem]:py-1.5
            tw:max-[53.8125rem]:pr-1 tw:max-[53.8125rem]:pl-0.5 tw:max-[53.8125rem]:shadow-none"
          variant="unstyled"
          type="button"
          onClick={openEditor}
          aria-label="Minha conta"
          title="Minha conta"
        >
          <span className="profile-avatar tw:grid tw:size-[2.625rem] tw:shrink-0 tw:place-items-center tw:overflow-hidden
            tw:rounded-xl tw:border tw:border-solid tw:border-white/28 tw:bg-[#fffaf7] tw:font-[750] tw:text-cali-brand
            tw:min-[53.8125rem]:group-hover/document-sidebar:mr-0.5 tw:min-[53.8125rem]:group-hover/document-sidebar:size-[3.125rem]
            tw:min-[53.8125rem]:group-hover/document-sidebar:rounded-[0.875rem] tw:max-[53.8125rem]:mr-0.5
            tw:max-[53.8125rem]:size-[3.125rem] tw:max-[53.8125rem]:rounded-[0.875rem]">
            {avatar}
          </span>
          <span className="profile-copy tw:hidden tw:w-full tw:min-w-0 tw:group-hover/document-sidebar:block
            tw:min-[53.8125rem]:ml-0.5 tw:min-[53.8125rem]:w-auto tw:min-[53.8125rem]:justify-self-stretch tw:max-[53.8125rem]:block">
            <strong className="tw:block tw:truncate tw:text-[0.9rem] tw:text-[#fffaf7]">{profile.full_name}</strong>
            <small className="tw:mt-1 tw:block tw:truncate tw:text-[0.72rem] tw:text-[#fffaf7ad]
              tw:min-[53.8125rem]:text-[#fffaf7b8]">{role === 'admin' ? 'Administradora geral' : 'Perfil cliente'}</small>
          </span>
          <ChevronDown
            className="profile-edit-chevron tw:hidden tw:shrink-0 tw:text-white tw:transition-transform
              tw:group-hover/document-profile:translate-y-0.5 tw:motion-reduce:transition-none
              tw:min-[53.8125rem]:mr-[0.3125rem] tw:min-[53.8125rem]:text-[#fffaf7d1]
              tw:group-hover/document-sidebar:block tw:max-[53.8125rem]:block"
            size={16}
          />
        </Button>
      </div>
    )}
    {modalOpen?createPortal(<div className="modal-backdrop chrome-modal-backdrop full-screen-modal tw:fixed tw:inset-0 tw:z-110 tw:flex tw:items-center tw:justify-center tw:bg-[#1b12157a]! tw:p-[1.538rem] tw:backdrop-blur-[0.923rem] tw:backdrop-saturate-[.92] tw:[@media(max-width:45rem)]:p-[0.615rem]" role="presentation">
      <DialogFrame className="modal-card tw:animate-[profile-dialog-enter_.4s_cubic-bezier(.2,.78,.2,1)_both] tw:motion-reduce:animate-none tw:relative tw:flex! tw:max-h-[min(56.923rem,calc(100dvh-2.769rem))]! tw:w-[min(68.462rem,calc(100vw-2.769rem))]! tw:max-w-[68.462rem]! tw:flex-col tw:overflow-x-hidden! tw:overflow-y-auto! tw:overscroll-contain tw:rounded-[1.923rem]! tw:border tw:border-solid tw:border-[#5a1e2d1a] tw:bg-[#fbf8f4]! tw:px-[2.154rem]! tw:pt-[1.846rem]! tw:pb-0! tw:shadow-[0_38px_110px_#1e101552]! tw:[scrollbar-width:none] tw:workspace-night:border-[#f7f3ee1a] tw:workspace-night:bg-[#1c1518]! tw:[@media(max-width:43.75rem)]:max-h-[calc(100dvh-1.231rem)]! tw:[@media(max-width:43.75rem)]:w-[calc(100vw-1.231rem)]! tw:[@media(max-width:43.75rem)]:rounded-[1.462rem]! tw:[@media(max-width:43.75rem)]:px-[1.231rem]! tw:[@media(max-width:43.75rem)]:pt-[1.385rem]! tw:[@media(max-width:40rem)]:h-[calc(100dvh-0.923rem)]" aria-label="Minha conta">
        <Button variant="close" type="button" className="tw:sticky! tw:top-[1.077rem]! tw:z-3! tw:mt-[1.077rem]! tw:mr-[-.538rem]! tw:ml-auto! tw:self-end" onClick={()=>setModalOpen(false)} aria-label="Fechar"><X size={20}/></Button>
        <header className="tw:sticky tw:top-0 tw:z-2 tw:mx-[-1.923rem] tw:mb-[1.077rem] tw:flex-none tw:border-0 tw:border-b tw:border-solid tw:border-[#eee5df] tw:bg-white tw:py-[1.385rem] tw:pr-[5.385rem] tw:pl-[1.923rem] tw:workspace-night:border-[#f7f3ee17] tw:workspace-night:bg-[#1c1518] tw:max-[43.75rem]:mx-[-1.231rem] tw:max-[43.75rem]:pr-[3.4rem] tw:max-[43.75rem]:pl-[1.231rem]"><div className="tw:flex tw:flex-wrap tw:items-center tw:gap-x-[1.077rem] tw:gap-y-[0.615rem]"><h2 className="tw:my-[0.308rem]! tw:text-[2.077rem]/[1.2]! tw:text-[#51202f] tw:workspace-night:text-[#fff8f1] tw:[@media(max-width:43.75rem)]:text-[1.846rem]!">Minha conta</h2>{role==='admin'?<span className="tw:inline-flex tw:min-h-[1.923rem] tw:items-center tw:rounded-[0.538rem] tw:border tw:border-solid tw:border-[#b58c5266] tw:bg-[#f5ede1] tw:px-[0.692rem] tw:py-[0.231rem] tw:text-[0.846rem]/[inherit] tw:font-[750] tw:tracking-[0.02em] tw:text-cali-brand tw:workspace-night:border-[#dab9838c] tw:workspace-night:bg-[#35242a] tw:workspace-night:text-[#f8ead7]">Administradora geral</span>:null}</div><p className="tw:mt-[0.308rem]! tw:mb-[0.923rem]! tw:text-base/[1.5]! tw:text-[#635a56]! tw:workspace-night:text-[#d5c7c2]!">Seus dados e sua identidade nos registros da CALI.</p></header>
        {role==='client'&&companyName?<div className="tw:mb-[0.923rem] tw:flex tw:items-center tw:gap-[0.923rem] tw:rounded-[1rem] tw:border tw:border-solid tw:border-[#b58c5252] tw:bg-[linear-gradient(110deg,#f5ede1,#fbf8f3)] tw:px-[1.077rem] tw:py-[0.769rem] tw:text-base/[1.4] tw:text-[#512838] tw:workspace-night:bg-[linear-gradient(110deg,#35242a,#302428)]"><span className="tw:grid tw:size-[3.923rem] tw:shrink-0 tw:place-items-center tw:overflow-hidden tw:rounded-[0.769rem] tw:border tw:border-solid tw:border-[#5a1e2d26] tw:bg-white tw:text-[#9b713e]">{companyLogo?<img className="tw:size-full tw:object-contain tw:p-[0.231rem]" src={companyLogo} alt={`Logo ${companyName}`}/>:<Building2 size={22}/>}</span><span className="tw:grid tw:min-w-0 tw:gap-[0.077rem]"><small className="tw:text-[0.769rem]/[inherit] tw:font-extrabold tw:tracking-[0.13em] tw:text-[#9b713e]">PERFIL CLIENTE</small><strong className="tw:text-[1.308rem]/[1.2] tw:text-cali-brand tw:workspace-night:text-[#fff8f1]">{companyName}</strong><span className="tw:text-[0.923rem]/[inherit] tw:text-[#645651] tw:workspace-night:text-[#ddd0c8]">Seu acesso está vinculado a esta empresa.</span></span></div>:null}
        <nav className="tw:mb-[0.923rem] tw:flex tw:min-h-[3.231rem] tw:w-full tw:flex-none tw:items-center tw:gap-[0.308rem] tw:border-0 tw:border-b tw:border-solid tw:border-[#5a1e2d24] tw:text-[0.846rem]/[inherit] tw:text-[#90837c] tw:workspace-night:border-[#f7f3ee2b] tw:[@media(max-width:43.75rem)]:min-h-[2.923rem]" aria-label="Seções do perfil">
          <button type="button" className={profileTabClass} aria-current={activeSection==='details'?'page':undefined} onClick={()=>setActiveSection('details')}><UserRound size={17}/>Dados pessoais</button>
          <button type="button" className={profileTabClass} aria-current={activeSection==='signature'?'page':undefined} onClick={()=>setActiveSection('signature')}><PenLine size={17}/>Assinatura</button>
        </nav>
        {activeSection==='details'?<div className="tw:grid tw:flex-1 tw:grid-cols-[minmax(16.154rem,.32fr)_minmax(0,1fr)] tw:items-start tw:gap-[1.077rem] tw:[@media(max-width:43.75rem)]:grid-cols-1 tw:[@media(max-width:43.75rem)]:gap-[0.692rem]">
          <section className="tw:flex tw:min-w-0 tw:flex-col tw:items-center tw:gap-[0.385rem] tw:rounded-[1.231rem] tw:border tw:border-solid tw:border-[#5a1e2d1c] tw:bg-[#fffdfa] tw:px-[0.923rem] tw:py-[1.154rem] tw:text-center tw:shadow-[0_7px_24px_#361c2209] tw:workspace-night:border-[#f7f3ee21] tw:workspace-night:bg-[#271c21] tw:[@media(max-width:43.75rem)]:grid tw:[@media(max-width:43.75rem)]:grid-cols-[5.231rem_1fr] tw:[@media(max-width:43.75rem)]:gap-x-4 tw:[@media(max-width:43.75rem)]:gap-y-[0.308rem] tw:[@media(max-width:43.75rem)]:p-[0.769rem] tw:[@media(max-width:43.75rem)]:text-left" aria-label="Foto do perfil">
            <span className="tw:mb-[0.308rem] tw:grid tw:size-[7.308rem] tw:shrink-0 tw:place-items-center tw:overflow-hidden tw:rounded-[1.385rem] tw:border tw:border-solid tw:border-[#5a1e2d38] tw:bg-[#f7f3ee] tw:text-xl tw:font-bold tw:text-cali-brand tw:[@media(max-width:43.75rem)]:row-span-3 tw:[@media(max-width:43.75rem)]:size-[5.231rem]">
              <WorkspaceProfileAvatar identity={draft} alt="Prévia do perfil" fallback={<span data-workspace-identity>{initials(draft.full_name)}</span>} />
            </span>
            <strong className="tw:text-[1.154rem]/[inherit] tw:text-[#51202f] tw:workspace-night:text-[#fff8f1]">Foto do perfil</strong><p className="tw:mt-0 tw:mb-[0.462rem] tw:text-[0.923rem]/[1.4]! tw:text-[#706662]! tw:workspace-night:text-[#d5c7c2]! tw:[@media(max-width:43.75rem)]:hidden">Escolha a imagem que aparece para você e para a CALI.</p>
            <label className="tw:inline-flex tw:min-h-[2.923rem] tw:cursor-pointer tw:items-center tw:gap-[0.538rem] tw:rounded-[0.769rem] tw:border tw:border-solid tw:border-[#ded0c7] tw:bg-white tw:px-[0.923rem] tw:py-[0.538rem] tw:text-[0.923rem]/[inherit] tw:text-cali-brand tw:focus-within:outline-2 tw:focus-within:outline-offset-2 tw:focus-within:outline-cali-gold tw:[@media(max-width:43.75rem)]:w-max"><Camera size={16}/>Trocar foto<input className="tw:sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAvatar}/></label>
            {draft.avatar_url?<button type="button" className="tw:cursor-pointer tw:border-0 tw:bg-transparent tw:text-[0.923rem]/[inherit] tw:text-[#6d3246] tw:underline tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-cali-gold tw:workspace-night:text-[#ead1ae] tw:[@media(max-width:43.75rem)]:col-span-full" aria-expanded={cropOpen} onClick={()=>setCropOpen((open)=>!open)}>{cropOpen?'Fechar ajuste':'Ajustar enquadramento'}</button>:null}
            {cropOpen&&draft.avatar_url?<div className="tw:grid tw:w-full tw:gap-[0.692rem] tw:border-0 tw:border-t tw:border-solid tw:border-[#5a1e2d1f] tw:pt-[0.615rem] tw:text-left tw:[@media(max-width:43.75rem)]:col-span-full"><label className="tw:grid tw:gap-[0.154rem] tw:text-[0.846rem]/[inherit] tw:text-[#5b4c4f] tw:workspace-night:text-[#ead1ae]">Zoom<input className="tw:w-full tw:accent-cali-brand" type="range" min="1" max="3" step="0.05" value={draft.avatar_zoom} onChange={(event)=>setDraft((current)=>({...current,avatar_zoom:Number(event.target.value)}))}/></label><label className="tw:grid tw:gap-[0.154rem] tw:text-[0.846rem]/[inherit] tw:text-[#5b4c4f] tw:workspace-night:text-[#ead1ae]">Horizontal<input className="tw:w-full tw:accent-cali-brand" type="range" min="0" max="100" value={draft.avatar_position_x} onChange={(event)=>setDraft((current)=>({...current,avatar_position_x:Number(event.target.value)}))}/></label><label className="tw:grid tw:gap-[0.154rem] tw:text-[0.846rem]/[inherit] tw:text-[#5b4c4f] tw:workspace-night:text-[#ead1ae]">Vertical<input className="tw:w-full tw:accent-cali-brand" type="range" min="0" max="100" value={draft.avatar_position_y} onChange={(event)=>setDraft((current)=>({...current,avatar_position_y:Number(event.target.value)}))}/></label></div>:null}
          </section>
          <section className="tw:min-w-0 tw:rounded-[1.231rem] tw:border tw:border-solid tw:border-[#5a1e2d1c] tw:bg-[#fffdfa] tw:px-[1.308rem] tw:py-[1.154rem] tw:shadow-[0_7px_24px_#361c2209] tw:workspace-night:border-[#f7f3ee21] tw:workspace-night:bg-[#271c21] tw:[@media(max-width:43.75rem)]:p-[0.923rem]" aria-label="Dados pessoais e contato"><h3 className="tw:mt-0 tw:mb-[0.769rem]! tw:text-[1.308rem]/[inherit]! tw:text-[#51202f] tw:workspace-night:text-[#fff8f1]">Dados pessoais</h3><div className="tw:grid tw:grid-cols-2 tw:gap-x-[0.923rem] tw:gap-y-[0.615rem] tw:pt-[1.154rem] tw:pb-[1.538rem] tw:[@media(max-width:43.75rem)]:grid-cols-1 tw:[@media(max-width:43.75rem)]:gap-[0.538rem]"><FieldLabel className={`${profileFieldClass} tw:col-span-full`}>Nome completo<input value={draft.full_name} onChange={(event)=>setDraft((current)=>({...current,full_name:event.target.value}))} autoComplete="name"/></FieldLabel><FieldLabel className={profileFieldClass}>Cargo / função<input value={draft.job_title} onChange={(event)=>setDraft((current)=>({...current,job_title:event.target.value}))}/></FieldLabel><FieldLabel className={profileFieldClass}>Telefone<input value={draft.phone} onChange={(event)=>setDraft((current)=>({...current,phone:event.target.value}))} inputMode="tel"/></FieldLabel><FieldLabel className={profileFieldClass}><span className="tw:inline-flex tw:items-center tw:gap-[.462rem]"><MessageCircle size={15}/>WhatsApp</span><input value={draft.whatsapp} onChange={(event)=>setDraft((current)=>({...current,whatsapp:event.target.value}))} inputMode="tel"/></FieldLabel><FieldLabel className={profileFieldClass}><span className="tw:inline-flex tw:items-center tw:gap-[.462rem]"><Linkedin size={15}/>LinkedIn</span><input value={draft.linkedin_url} onChange={(event)=>setDraft((current)=>({...current,linkedin_url:event.target.value}))}/></FieldLabel><FieldLabel className={profileFieldClass}><span className="tw:inline-flex tw:items-center tw:gap-[.462rem]"><Instagram size={15}/>Instagram</span><input value={draft.instagram_url} onChange={(event)=>setDraft((current)=>({...current,instagram_url:event.target.value}))}/></FieldLabel><FieldLabel className={`${profileFieldClass} tw:col-span-full`}><span className="tw:inline-flex tw:items-center tw:gap-[.462rem]"><Mail size={15}/>E-mail de acesso</span><input value={draft.email} disabled/></FieldLabel></div></section>
        </div> : <ProfileSignatureEditor
          name={draft.full_name}
          uploadedSource={draft.signature_mode === 'uploaded' ? draft.signature_url : undefined}
          onNameChange={(name) => setDraft((current) => ({ ...current, full_name: name, signature_mode: 'generated', signature_style: 'calligraphic' }))}
          onUseName={() => setDraft((current) => ({ ...current, signature_mode: 'generated', signature_style: 'calligraphic' }))}
          onUpload={handleSignature}
        />}
        {activeSection==='details'?<div className="tw:flex tw:flex-wrap tw:gap-[.769rem] tw:pt-[.462rem] tw:[&_a]:inline-flex tw:[&_a]:items-center tw:[&_a]:gap-[.538rem] tw:[&_a]:rounded-[.538rem] tw:[&_a]:border tw:[&_a]:border-solid tw:[&_a]:border-[#ded0c7] tw:[&_a]:bg-white tw:[&_a]:px-[1.077rem] tw:[&_a]:py-[.769rem] tw:[&_a]:text-[.923rem] tw:[&_a]:text-cali-brand">{(draft.whatsapp||draft.phone)?<a className="secondary" href={whatsappUrl(draft.whatsapp||draft.phone)} target="_blank" rel="noreferrer"><MessageCircle size={16}/>Abrir WhatsApp</a>:null}{draft.phone?<a className="secondary" href={`tel:${draft.phone.replace(/[^+\d]/g,'')}`}><Phone size={16}/>Ligar</a>:null}</div>:null}
        <ProfileInfoSection aria-label="Ajuda e contato">
          <strong>Ajuda e contato</strong>
          <span className="tw:flex tw:flex-wrap tw:gap-[0.615rem]">
            {occurrencePath && <Link to={occurrencePath} onClick={() => setModalOpen(false)}>Acompanhar um assunto</Link>}
            <a href={accessSupportLink()}>Problemas de acesso</a>
            {role === 'client' ? <a href="#meus-pedidos-de-dados" onClick={(event) => {
              event.preventDefault();
              privacySection.current?.focus();
              privacySection.current?.scrollIntoView({ block: 'start' });
            }}>Pedidos sobre meus dados</a> : <a href={privacySupportLink}>Pedidos sobre meus dados</a>}
          </span>
        </ProfileInfoSection>
        <ProfileInfoSection ref={privacySection} id="meus-pedidos-de-dados" aria-label="Privacidade e meus dados" tabIndex={-1}>
          <div><strong><ShieldCheck size={16}/>Privacidade e meus dados</strong><p>Você pode baixar uma cópia dos seus dados. {legalEnabled()?<><a href="/privacidade" target="_blank" rel="noopener">Política de Privacidade</a> · <a href="/termos" target="_blank" rel="noopener">Termos de Uso</a></>:<a href="https://calirh.com/privacidade.html" target="_blank" rel="noopener noreferrer">Política de privacidade</a>}</p></div>
          {privacyForm?<div className="tw:flex tw:flex-col tw:gap-[0.615rem]"><label className="tw:flex tw:flex-col tw:gap-[0.308rem] tw:text-[0.885rem] tw:font-bold">Tipo de pedido<select className="tw:box-border tw:rounded-[0.615rem] tw:border tw:border-solid tw:border-[#dfd3ca] tw:bg-white tw:px-[0.769rem] tw:py-[0.615rem] tw:font-cali-body tw:text-[0.962rem] tw:font-normal" value={privacyForm.kind} onChange={(event)=>setPrivacyForm({...privacyForm,kind:event.target.value})}><option value="access">Acesso aos meus dados</option><option value="correction">Correção de dados</option><option value="deletion">Exclusão de dados</option><option value="other">Outro pedido</option></select></label><label className="tw:flex tw:flex-col tw:gap-[0.308rem] tw:text-[0.885rem] tw:font-bold">O que você precisa<textarea className="tw:box-border tw:rounded-[0.615rem] tw:border tw:border-solid tw:border-[#dfd3ca] tw:bg-white tw:px-[0.769rem] tw:py-[0.615rem] tw:font-cali-body tw:text-[0.962rem] tw:font-normal" rows={3} maxLength={2000} value={privacyForm.details} onChange={(event)=>setPrivacyForm({...privacyForm,details:event.target.value})} placeholder="Descreva o pedido."/></label><span className="tw:flex tw:flex-wrap tw:gap-[0.615rem]"><ProfilePrivacyButton onClick={()=>setPrivacyForm(null)}>Cancelar</ProfilePrivacyButton><ProfilePrivacyButton primary disabled={privacyBusy||privacyForm.details.trim().length<5} onClick={()=>void sendPrivacyRequest()}>{privacyBusy?'Enviando…':'Enviar pedido'}</ProfilePrivacyButton></span></div>
          :<span className="tw:flex tw:flex-wrap tw:gap-[0.615rem]"><ProfilePrivacyButton disabled={privacyBusy} onClick={()=>void downloadMyData()}><Download size={14}/>{privacyBusy?'Gerando…':'Baixar meus dados'}</ProfilePrivacyButton>{role === 'client' && <ProfilePrivacyButton onClick={()=>{setPrivacyMessage('');setPrivacyForm({kind:'access',details:''});}}>Pedir acesso, correção ou exclusão</ProfilePrivacyButton>}</span>}
          {privacyMessage&&<small role="status">{privacyMessage}</small>}
          {role === 'client' && (
            <details>
              <summary>Meus pedidos de dados</summary>
              {privacyLoadError ? (
                <p role="alert">Não foi possível consultar seus pedidos. <ProfilePrivacyButton onClick={() => setPrivacyRevision((revision) => revision + 1)}>Tentar novamente</ProfilePrivacyButton></p>
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
        </ProfileInfoSection>
        <ProfileInfoSection aria-label="Sobre a CALI">
          <strong>Sobre a CALI</strong>
          <span className="tw:flex tw:flex-wrap tw:gap-[0.615rem]">
            <a href={caliInstagram} target="_blank" rel="noreferrer">Instagram</a>
            <a href={caliLinkedIn} target="_blank" rel="noreferrer">LinkedIn</a>
          </span>
        </ProfileInfoSection>
        {message?<div className="form-message">{message}</div>:null}
        <div className="modal-actions tw:sticky tw:bottom-0 tw:z-2 tw:mx-[-2.154rem]! tw:my-0! tw:flex tw:min-h-[5.692rem] tw:flex-none tw:justify-end tw:gap-[0.692rem] tw:border-0 tw:border-t tw:border-solid tw:border-[#5a1e2d14] tw:bg-[#fbf8f4]! tw:px-[2.154rem]! tw:py-[0.846rem]! tw:shadow-[0_-14px_34px_#351f240e] tw:backdrop-blur-[1.385rem] tw:workspace-night:border-[#f7f3ee17] tw:workspace-night:bg-[#1c1518]! tw:[@media(max-width:43.75rem)]:mx-[-1.231rem]! tw:[@media(max-width:43.75rem)]:px-[1.231rem]!"><button type="button" className="tw:min-h-[3.308rem] tw:rounded-[0.846rem]! tw:px-[1.308rem]! tw:text-base/[inherit]! tw:border-[rgba(90,30,45,.35)]! tw:bg-transparent! tw:text-cali-brand! tw:shadow-none! tw:hover:bg-[#5a1e2d0f]! tw:workspace-night:border-[#e7c66f59]! tw:workspace-night:text-cali-day-canvas! tw:workspace-night:hover:bg-[#e7c66f14]!" onClick={()=>setModalOpen(false)}>Fechar</button><button type="button" className="tw:min-h-[3.308rem] tw:rounded-[0.846rem]! tw:border-cali-brand! tw:bg-cali-brand! tw:px-[1.308rem]! tw:text-base/[inherit]! tw:text-white! tw:shadow-none! tw:hover:border-[#481724]! tw:hover:bg-[#481724]!" onClick={saveProfile} disabled={saving}>{saving?<Loader2 size={17} className="spin"/>:<Check size={17}/>} {saving?'Salvando…':'Salvar alterações'}</button></div>
      </DialogFrame>
    </div>,document.body):null}
  </>;
}
