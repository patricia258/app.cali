import { InlineNotice } from '../ds/InlineNotice';
import { Input } from '../ds/Input';
import { Select } from '../ds/Select';
import { Textarea } from '../ds/Textarea';
import { Button } from '../ds/Button';
import { DialogFrame } from '../ds/DialogFrame';
import { FieldLabel } from '../ds/FieldLabel';
import { ChangeEvent, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Building2, Camera, Check, ChevronDown, Download, Instagram, Linkedin, Loader2, Mail, MessageCircle, PenLine, Phone, ShieldCheck, UserRound, X } from 'lucide-react';
import { exportOwnWorkspaceData, listOwnPrivacyRequests, requestWorkspaceDataRights } from '../../api/workspace/privacy';
import {
  readProfileCompany,
  uploadWorkspaceProfileImage,
  workspaceProfileAvailable,
} from '../../api/workspace/profile';
import { useOwnWorkspaceProfile } from './hooks/useOwnWorkspaceProfile';
import { useUpdateOwnWorkspaceProfile } from './hooks/useUpdateOwnWorkspaceProfile';
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
  admin:{full_name:'',email:'',job_title:'',phone:'',whatsapp:'',linkedin_url:'',instagram_url:'',avatar_url:'',avatar_position_x:50,avatar_position_y:50,avatar_zoom:1,signature_mode:'generated',signature_url:'',signature_style:'executive'},
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
  const ownProfile = useOwnWorkspaceProfile();
  const updateProfile = useUpdateOwnWorkspaceProfile();
  const fallback = profileFallback[role === 'admin' ? 'admin' : 'client'];
  const occurrencePath = role === 'partner' ? (partnerHasOccurrences ? '/equipe/ocorrencias' : null) : occurrencePaths[role];
  const privacySection = useRef<HTMLElement>(null);
  const profile = useMemo<ProfileData>(() => {
    const data = ownProfile.data;
    return {
      ...fallback,
      full_name: data?.full_name?.trim() || '',
      email: data?.email || user?.email || '',
      job_title: data?.job_title || '',
      phone: data?.phone || '', whatsapp: data?.whatsapp || '',
      linkedin_url: data?.linkedin_url || '', instagram_url: data?.instagram_url || '',
      avatar_url: data?.avatar_url || '',
      avatar_position_x: Number(data?.avatar_position_x ?? 50),
      avatar_position_y: Number(data?.avatar_position_y ?? 50),
      avatar_zoom: Number(data?.avatar_zoom ?? 1),
      signature_mode: data?.signature_mode === 'uploaded' ? 'uploaded' : 'generated',
      signature_url: data?.signature_url || '',
      signature_style: data?.signature_style ? safeSignatureStyle(data.signature_style) : fallback.signature_style,
    };
  }, [fallback, ownProfile.data, user?.email]);
  const [draft,setDraft]=useState<ProfileData>(profile);
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

  useEffect(() => {
    setDraft(profile);
  }, [profile]);

  useEffect(() => {
    setCompanyName('');setCompanyLogo('');
    let current = true;
    const companyId = ownProfile.data?.company_id;
    if (role === 'client' && companyId) {
      void readProfileCompany(companyId).then(async (company) => {
        if (!current) return;
        setCompanyName(company?.display_name || '');
        const logo = await resolveWorkspaceMedia(company?.logo_url || company?.logo_workspace_url);
        if (current) setCompanyLogo(logo);
      });
    }
    return () => { current = false; };
  }, [role, ownProfile.data?.company_id, user?.id]);

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
    if(!draft.full_name.trim() || !ownProfile.data || !ownProfile.isSuccess || ownProfile.isFetching)return;
    setSaving(true);setMessage('');
    const next={...draft,full_name:draft.full_name.trim(),signature_style:draft.signature_mode==='generated'?'calligraphic' as const:draft.signature_style,linkedin_url:normalizeExternalUrl(draft.linkedin_url),instagram_url:normalizeExternalUrl(draft.instagram_url)};
    try{
      const receipt = await updateProfile.mutateAsync(next);
      if (!receipt?.isCurrent()) return;
      setDraft(next);setModalOpen(false);
    }catch(error){setMessage(error instanceof Error?error.message:'Não foi possível salvar o perfil.');}
    finally{setSaving(false);}
  }

  const profileFieldClass = `tw:workspace-documents:grid tw:workspace-documents:font-bold
    tw:workspace-documents:[&>input]:w-full tw:workspace-documents:[&>input]:border tw:workspace-documents:[&>input]:border-solid
    tw:workspace-documents:[&>input]:border-[var(--line)] tw:workspace-documents:[&>input]:bg-[var(--paper)]
    tw:workspace-documents:[&>input]:text-[var(--graphite)] tw:workspace-documents:[&>input]:leading-tight
    tw:min-w-0 tw:gap-1! tw:text-cali-body/[inherit]! tw:text-cali-neutral-text tw:[&>input]:min-h-[2.769rem] tw:[&>input]:rounded-cali-panel! tw:[&>input]:px-3! tw:[&>input]:py-2! tw:[&>input:disabled]:bg-cali-sand-soft! tw:[&>input:disabled]:text-cali-neutral-accent! tw:workspace-night:text-cali-paper tw:workspace-night:[&>input]:border-cali-sand-soft/11! tw:workspace-night:[&>input]:bg-cali-surface! tw:workspace-night:[&>input]:text-cali-paper! tw:workspace-night:[&>input:disabled]:bg-cali-burgundy-strong! tw:workspace-night:[&>input:disabled]:text-cali-neutral-line!`;
  const profileTabClass = 'tw:-mb-px tw:inline-flex tw:min-h-[3.231rem] tw:flex-none tw:items-center tw:gap-2.5 tw:border-0 tw:border-b-2 tw:border-solid tw:border-transparent tw:bg-transparent tw:px-4.5 tw:py-2 tw:font-semibold tw:text-cali-neutral-text tw:aria-[current=page]:border-cali-gold tw:aria-[current=page]:text-cali-brand tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-cali-gold tw:workspace-night:text-cali-neutral-line tw:workspace-night:aria-[current=page]:text-cali-orange-line tw:[@media(max-width:43.75rem)]:min-h-[2.923rem] tw:[@media(max-width:43.75rem)]:basis-1/2 tw:[@media(max-width:43.75rem)]:shrink tw:[@media(max-width:43.75rem)]:justify-center tw:[@media(max-width:43.75rem)]:p-2';

  return <>
    {trigger ? trigger({ profile, avatar, companyName: companyName || '', openEditor }) : (
      <div className="profile-control profile-control-direct tw:grid tw:size-13 tw:place-items-center
        tw:group-hover/document-sidebar:block tw:group-hover/document-sidebar:size-auto tw:max-[53.8125rem]:block tw:max-[53.8125rem]:size-auto">
        <Button
          className="profile-trigger profile-trigger-direct tw:group/document-profile tw:grid tw:size-13 tw:cursor-pointer
            tw:place-items-center tw:overflow-hidden tw:rounded-2xl tw:border tw:border-solid tw:border-cali-sand-soft/22
            tw:bg-cali-sand-soft/8 tw:p-1 tw:text-left tw:text-sm/[normal] tw:text-cali-sand-surface/90
            tw:shadow-[0_0.375rem_1.125rem_rgb(var(--cali-rgb-red-inverse)/0.102)] tw:workspace-night:border-cali-brand/18 tw:workspace-night:bg-cali-brand/7
            tw:workspace-night:shadow-[0_0.375rem_1.125rem_rgb(var(--cali-rgb-burgundy-text)/0.07843)]
            tw:min-[53.8125rem]:group-hover/document-sidebar:h-15.5 tw:min-[53.8125rem]:group-hover/document-sidebar:w-full
            tw:min-[53.8125rem]:group-hover/document-sidebar:grid-cols-[2.75rem_minmax(0,1fr)_1.125rem]
            tw:min-[53.8125rem]:group-hover/document-sidebar:justify-items-start tw:min-[53.8125rem]:group-hover/document-sidebar:gap-3.5
            tw:min-[53.8125rem]:group-hover/document-sidebar:rounded-none tw:min-[53.8125rem]:group-hover/document-sidebar:border-0
            tw:min-[53.8125rem]:group-hover/document-sidebar:bg-transparent tw:min-[53.8125rem]:group-hover/document-sidebar:py-1
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
          <span className="profile-avatar tw:workspace-compact:rounded-lg! tw:workspace-compact:[&_img]:rounded-lg tw:grid tw:size-10.5 tw:shrink-0 tw:place-items-center tw:overflow-hidden
            tw:rounded-xl tw:border tw:border-solid tw:border-cali-neutral-surface/28 tw:bg-cali-paper tw:font-[750] tw:text-cali-brand
            tw:min-[53.8125rem]:group-hover/document-sidebar:mr-0.5 tw:min-[53.8125rem]:group-hover/document-sidebar:size-12.5
            tw:min-[53.8125rem]:group-hover/document-sidebar:rounded-[0.875rem] tw:max-[53.8125rem]:mr-0.5
            tw:max-[53.8125rem]:size-12.5 tw:max-[53.8125rem]:rounded-[0.875rem]">
            {avatar}
          </span>
          <span className="profile-copy tw:hidden tw:w-full tw:min-w-0 tw:group-hover/document-sidebar:block
            tw:min-[53.8125rem]:ml-0.5 tw:min-[53.8125rem]:w-auto tw:min-[53.8125rem]:justify-self-stretch tw:max-[53.8125rem]:block">
            <strong className="tw:block tw:truncate tw:text-sm tw:text-cali-paper">{profile.full_name}</strong>
            <small className="tw:mt-1 tw:block tw:truncate tw:text-xs tw:text-cali-sand-surface/68
              tw:min-[53.8125rem]:text-cali-sand-surface/72">{role === 'admin' ? 'Administradora geral' : 'Perfil cliente'}</small>
          </span>
          <ChevronDown
            className="profile-edit-chevron tw:hidden tw:shrink-0 tw:text-cali-neutral-surface tw:transition-transform
              tw:group-hover/document-profile:translate-y-0.5 tw:motion-reduce:transition-none
              tw:min-[53.8125rem]:mr-1 tw:min-[53.8125rem]:text-cali-sand-surface/82
              tw:group-hover/document-sidebar:block tw:max-[53.8125rem]:block"
            size={16}
          />
        </Button>
      </div>
    )}
    {modalOpen?createPortal(<div className="modal-backdrop chrome-modal-backdrop full-screen-modal tw:fixed tw:inset-0 tw:z-110 tw:flex tw:items-center tw:justify-center tw:bg-cali-neutral-inverse/48! tw:p-6 tw:backdrop-blur-[0.923rem] tw:backdrop-saturate-[.92] tw:[@media(max-width:45rem)]:p-2.5
      tw:workspace-documents:z-2147483000! tw:workspace-documents:grid tw:workspace-documents:h-dvh tw:workspace-documents:w-screen
      tw:workspace-documents:touch-none tw:workspace-documents:place-items-center tw:workspace-documents:overflow-hidden
      tw:workspace-documents:backdrop-blur-[0.5rem] tw:workspace-documents:backdrop-saturate-[.94]
      tw:workspace-documents:[@media(max-width:40rem)]:p-1.5" role="presentation">
      <DialogFrame className="modal-card tw:animate-[profile-dialog-enter_.4s_cubic-bezier(.2,.78,.2,1)_both] tw:motion-reduce:animate-none tw:relative tw:flex! tw:max-h-[min(56.923rem,calc(100dvh-2.769rem))]! tw:w-[min(68.462rem,calc(100vw-2.769rem))]! tw:max-w-[68.462rem]! tw:flex-col tw:overflow-x-hidden! tw:overflow-y-auto! tw:overscroll-contain tw:rounded-[1.923rem]! tw:border tw:border-solid tw:border-cali-brand/10 tw:bg-cali-surface-soft! tw:px-8.5! tw:pt-7.5! tw:pb-0! tw:shadow-[0_38px_110px_rgb(var(--cali-rgb-neutral-inverse)/0.3216)]! tw:[scrollbar-width:none] tw:workspace-night:border-cali-sand-soft/10 tw:workspace-night:bg-cali-neutral-inverse! tw:[@media(max-width:43.75rem)]:max-h-[calc(100dvh-1.231rem)]! tw:[@media(max-width:43.75rem)]:w-[calc(100vw-1.231rem)]! tw:[@media(max-width:43.75rem)]:rounded-3xl! tw:[@media(max-width:43.75rem)]:px-5! tw:[@media(max-width:43.75rem)]:pt-5.5! tw:[@media(max-width:40rem)]:h-[calc(100dvh-0.923rem)]
        tw:workspace-documents:z-2147483001 tw:workspace-documents:m-0 tw:workspace-documents:touch-auto
        tw:workspace-documents:py-[clamp(1.625rem,5vw,2.5rem)] tw:workspace-documents:font-cali-body
        tw:workspace-documents:[&_:is(h2,h3)]:font-cali-body! tw:workspace-documents:[&_h2]:tracking-[-0.02em]
        tw:workspace-documents:[&_h3]:tracking-[-0.015em] tw:workspace-documents:[&_h3]:font-[650]
        tw:workspace-documents:[@media(max-width:38.75rem)]:pb-5.5
        tw:workspace-documents:[&_p]:text-cali-small tw:workspace-documents:[&_p]:leading-[1.55]
        tw:workspace-documents:[&_small]:text-cali-caption! tw:workspace-documents:[&_small]:leading-[1.4]
        tw:workspace-documents:[&_:is(input,select,textarea):focus]:outline-2 tw:workspace-documents:[&_:is(input,select,textarea):focus]:outline-offset-1
        tw:workspace-documents:[&_:is(input,select,textarea):focus]:outline-cali-brand/13
        tw:workspace-documents:workspace-night:[&_strong]:text-cali-text
        " aria-label="Minha conta">
        <Button variant="close" type="button" className="tw:sticky! tw:top-4.5! tw:z-3! tw:mt-4.5! tw:-mr-2! tw:ml-auto! tw:self-end" onClick={()=>setModalOpen(false)} aria-label="Fechar"><X size={20}/></Button>
        <header className="tw:sticky tw:top-0 tw:z-2 tw:-mx-7.5 tw:mb-4.5 tw:flex-none tw:border-0 tw:border-b tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface tw:py-5.5 tw:pr-21.5 tw:pl-7.5 tw:workspace-night:border-cali-sand-soft/9 tw:workspace-night:bg-cali-neutral-inverse tw:max-[43.75rem]:-mx-5 tw:max-[43.75rem]:pr-13.5 tw:max-[43.75rem]:pl-5"><div className="tw:flex tw:flex-wrap tw:items-center tw:gap-x-4.5 tw:gap-y-2.5"><h2 className="tw:my-1! tw:text-cali-display/[1.2]! tw:text-cali-burgundy-accent tw:workspace-night:text-cali-paper tw:[@media(max-width:43.75rem)]:text-3xl!">Minha conta</h2>{role==='admin'?<span className="tw:inline-flex tw:min-h-[1.923rem] tw:items-center tw:rounded-lg tw:border tw:border-solid tw:border-cali-gold/40 tw:bg-cali-orange-surface tw:px-3 tw:py-1 tw:text-sm/[inherit] tw:font-[750] tw:tracking-[0.02em] tw:text-cali-brand tw:workspace-night:border-cali-orange-soft/55 tw:workspace-night:bg-cali-burgundy-strong tw:workspace-night:text-cali-orange-surface">Administradora geral</span>:null}</div><p className="tw:mt-1! tw:mb-3.5! tw:text-base/[1.5]! tw:text-cali-neutral-accent! tw:workspace-night:text-cali-neutral-line!">Seus dados e sua identidade nos registros da CALI.</p></header>
        {role==='client'&&companyName?<div className="tw:mb-3.5 tw:flex tw:items-center tw:gap-3.5 tw:rounded-2xl tw:border tw:border-solid tw:border-cali-gold/32 tw:bg-[linear-gradient(110deg,var(--cali-color-orange-surface),var(--cali-color-sand-soft))] tw:px-4.5 tw:py-3 tw:text-base/[1.4] tw:text-cali-burgundy-accent tw:workspace-night:bg-[linear-gradient(110deg,var(--cali-color-burgundy-strong),var(--cali-color-burgundy-strong))]"><span className="tw:grid tw:size-15.5 tw:shrink-0 tw:place-items-center tw:overflow-hidden tw:rounded-xl tw:border tw:border-solid tw:border-cali-brand/15 tw:bg-cali-neutral-surface tw:text-cali-gold-text">{companyLogo?<img className="tw:size-full tw:object-contain tw:p-1" src={companyLogo} alt={`Logo ${companyName}`}/>:<Building2 size={22}/>}</span><span className="tw:grid tw:min-w-0 tw:gap-0.5"><small className="tw:text-xs/[inherit] tw:font-extrabold tw:tracking-[0.13em] tw:text-cali-gold-text">PERFIL CLIENTE</small><strong className="tw:text-xl/[1.2] tw:text-cali-brand tw:workspace-night:text-cali-paper">{companyName}</strong><span className="tw:text-cali-body/[inherit] tw:text-cali-neutral-text tw:workspace-night:text-cali-neutral-line">Seu acesso está vinculado a esta empresa.</span></span></div>:null}
        <nav className="tw:mb-3.5 tw:flex tw:min-h-[3.231rem] tw:w-full tw:flex-none tw:items-center tw:gap-1 tw:border-0 tw:border-b tw:border-solid tw:border-cali-brand/14 tw:text-sm/[inherit] tw:text-cali-sand-text tw:workspace-night:border-cali-sand-soft/17 tw:[@media(max-width:43.75rem)]:min-h-[2.923rem]" aria-label="Seções do perfil">
          <button type="button" className={profileTabClass} aria-current={activeSection==='details'?'page':undefined} onClick={()=>setActiveSection('details')}><UserRound size={17}/>Dados pessoais</button>
          <button type="button" className={profileTabClass} aria-current={activeSection==='signature'?'page':undefined} onClick={()=>setActiveSection('signature')}><PenLine size={17}/>Assinatura</button>
        </nav>
        {activeSection==='details'?<div className="tw:grid tw:flex-1 tw:grid-cols-[minmax(16.154rem,.32fr)_minmax(0,1fr)] tw:items-start tw:gap-4.5 tw:[@media(max-width:43.75rem)]:grid-cols-1 tw:[@media(max-width:43.75rem)]:gap-3">
          <section className="tw:flex tw:min-w-0 tw:flex-col tw:items-center tw:gap-1.5 tw:rounded-[1.231rem] tw:border tw:border-solid tw:border-cali-brand/11 tw:bg-cali-paper tw:px-3.5 tw:py-4.5 tw:text-center tw:shadow-[0_7px_24px_rgb(var(--cali-rgb-red-inverse)/0.03529)] tw:workspace-night:border-cali-sand-soft/13 tw:workspace-night:bg-cali-burgundy-strong tw:[@media(max-width:43.75rem)]:grid tw:[@media(max-width:43.75rem)]:grid-cols-[5.231rem_1fr] tw:[@media(max-width:43.75rem)]:gap-x-4 tw:[@media(max-width:43.75rem)]:gap-y-1 tw:[@media(max-width:43.75rem)]:p-3 tw:[@media(max-width:43.75rem)]:text-left" aria-label="Foto do perfil">
            <span className="tw:mb-1 tw:grid tw:size-29 tw:shrink-0 tw:place-items-center tw:overflow-hidden tw:rounded-[1.385rem] tw:border tw:border-solid tw:border-cali-brand/22 tw:bg-cali-day-canvas tw:text-xl tw:font-bold tw:text-cali-brand tw:[@media(max-width:43.75rem)]:row-span-3 tw:[@media(max-width:43.75rem)]:size-21">
              <WorkspaceProfileAvatar identity={draft} alt="Prévia do perfil" fallback={<span data-workspace-identity>{initials(draft.full_name)}</span>} />
            </span>
            <strong className="tw:text-lg/[inherit] tw:text-cali-burgundy-accent tw:workspace-night:text-cali-paper">Foto do perfil</strong><p className="tw:mt-0 tw:mb-2 tw:text-cali-body/[1.4]! tw:text-cali-neutral-accent! tw:workspace-night:text-cali-neutral-line! tw:[@media(max-width:43.75rem)]:hidden">Escolha a imagem que aparece para você e para a CALI.</p>
            <label className="tw:inline-flex tw:min-h-[2.923rem] tw:cursor-pointer tw:items-center tw:gap-2 tw:rounded-xl tw:border tw:border-solid tw:border-cali-line-strong tw:bg-cali-neutral-surface tw:px-3.5 tw:py-2 tw:text-cali-body/[inherit] tw:text-cali-brand tw:focus-within:outline-2 tw:focus-within:outline-offset-2 tw:focus-within:outline-cali-gold tw:[@media(max-width:43.75rem)]:w-max"><Camera size={16}/>Trocar foto<input className="tw:sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAvatar}/></label>
            {draft.avatar_url?<button type="button" className="tw:cursor-pointer tw:border-0 tw:bg-transparent tw:text-cali-body/[inherit] tw:text-cali-red-strong tw:underline tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-cali-gold tw:workspace-night:text-cali-gold-line tw:[@media(max-width:43.75rem)]:col-span-full" aria-expanded={cropOpen} onClick={()=>setCropOpen((open)=>!open)}>{cropOpen?'Fechar ajuste':'Ajustar enquadramento'}</button>:null}
            {cropOpen&&draft.avatar_url?<div className="tw:grid tw:w-full tw:gap-3 tw:border-0 tw:border-t tw:border-solid tw:border-cali-brand/12 tw:pt-2.5 tw:text-left tw:[@media(max-width:43.75rem)]:col-span-full"><label className="tw:grid tw:gap-0.5 tw:text-sm/[inherit] tw:text-cali-neutral-text tw:workspace-night:text-cali-gold-line">Zoom<input className="tw:w-full tw:accent-cali-brand" type="range" min="1" max="3" step="0.05" value={draft.avatar_zoom} onChange={(event)=>setDraft((current)=>({...current,avatar_zoom:Number(event.target.value)}))}/></label><label className="tw:grid tw:gap-0.5 tw:text-sm/[inherit] tw:text-cali-neutral-text tw:workspace-night:text-cali-gold-line">Horizontal<input className="tw:w-full tw:accent-cali-brand" type="range" min="0" max="100" value={draft.avatar_position_x} onChange={(event)=>setDraft((current)=>({...current,avatar_position_x:Number(event.target.value)}))}/></label><label className="tw:grid tw:gap-0.5 tw:text-sm/[inherit] tw:text-cali-neutral-text tw:workspace-night:text-cali-gold-line">Vertical<input className="tw:w-full tw:accent-cali-brand" type="range" min="0" max="100" value={draft.avatar_position_y} onChange={(event)=>setDraft((current)=>({...current,avatar_position_y:Number(event.target.value)}))}/></label></div>:null}
          </section>
          <section className="tw:min-w-0 tw:rounded-[1.231rem] tw:border tw:border-solid tw:border-cali-brand/11 tw:bg-cali-paper tw:px-5 tw:py-4.5 tw:shadow-[0_7px_24px_rgb(var(--cali-rgb-red-inverse)/0.03529)] tw:workspace-night:border-cali-sand-soft/13 tw:workspace-night:bg-cali-burgundy-strong tw:[@media(max-width:43.75rem)]:p-3.5" aria-label="Dados pessoais e contato"><h3 className="tw:mt-0 tw:mb-3! tw:text-xl/[inherit]! tw:text-cali-burgundy-accent tw:workspace-night:text-cali-paper">Dados pessoais</h3><div className="tw:grid tw:grid-cols-2 tw:gap-x-3.5 tw:gap-y-2.5 tw:pt-4.5 tw:pb-6 tw:[@media(max-width:43.75rem)]:grid-cols-1 tw:[@media(max-width:43.75rem)]:gap-2"><FieldLabel className={`${profileFieldClass} tw:col-span-full`}>Nome completo<Input variant="embedded" value={draft.full_name} onChange={(event)=>setDraft((current)=>({...current,full_name:event.target.value}))} autoComplete="name"/></FieldLabel><FieldLabel className={profileFieldClass}>Cargo / função<Input variant="embedded" value={draft.job_title} onChange={(event)=>setDraft((current)=>({...current,job_title:event.target.value}))}/></FieldLabel><FieldLabel className={profileFieldClass}>Telefone<Input variant="embedded" value={draft.phone} onChange={(event)=>setDraft((current)=>({...current,phone:event.target.value}))} inputMode="tel"/></FieldLabel><FieldLabel className={profileFieldClass}><span className="tw:inline-flex tw:items-center tw:gap-2"><MessageCircle size={15}/>WhatsApp</span><Input variant="embedded" value={draft.whatsapp} onChange={(event)=>setDraft((current)=>({...current,whatsapp:event.target.value}))} inputMode="tel"/></FieldLabel><FieldLabel className={profileFieldClass}><span className="tw:inline-flex tw:items-center tw:gap-2"><Linkedin size={15}/>LinkedIn</span><Input variant="embedded" value={draft.linkedin_url} onChange={(event)=>setDraft((current)=>({...current,linkedin_url:event.target.value}))}/></FieldLabel><FieldLabel className={profileFieldClass}><span className="tw:inline-flex tw:items-center tw:gap-2"><Instagram size={15}/>Instagram</span><Input variant="embedded" value={draft.instagram_url} onChange={(event)=>setDraft((current)=>({...current,instagram_url:event.target.value}))}/></FieldLabel><FieldLabel className={`${profileFieldClass} tw:col-span-full`}><span className="tw:inline-flex tw:items-center tw:gap-2"><Mail size={15}/>E-mail de acesso</span><Input variant="embedded" value={draft.email} disabled/></FieldLabel></div></section>
        </div> : <ProfileSignatureEditor
          name={draft.full_name}
          uploadedSource={draft.signature_mode === 'uploaded' ? draft.signature_url : undefined}
          onNameChange={(name) => setDraft((current) => ({ ...current, full_name: name, signature_mode: 'generated', signature_style: 'calligraphic' }))}
          onUseName={() => setDraft((current) => ({ ...current, signature_mode: 'generated', signature_style: 'calligraphic' }))}
          onUpload={handleSignature}
        />}
        {activeSection==='details'?<div className="tw:flex tw:flex-wrap tw:gap-3 tw:pt-2 tw:[&_a]:inline-flex tw:[&_a]:items-center tw:[&_a]:gap-2 tw:[&_a]:rounded-lg tw:[&_a]:border tw:[&_a]:border-solid tw:[&_a]:border-cali-line-strong tw:[&_a]:bg-cali-neutral-surface tw:[&_a]:px-4.5 tw:[&_a]:py-3 tw:[&_a]:text-cali-body tw:[&_a]:text-cali-brand">{(draft.whatsapp||draft.phone)?<a className="tw:min-h-cali-control tw:justify-center tw:font-bold" href={whatsappUrl(draft.whatsapp||draft.phone)} target="_blank" rel="noreferrer"><MessageCircle size={16}/>Abrir WhatsApp</a>:null}{draft.phone?<a className="tw:min-h-cali-control tw:justify-center tw:font-bold" href={`tel:${draft.phone.replace(/[^+\d]/g,'')}`}><Phone size={16}/>Ligar</a>:null}</div>:null}
        <ProfileInfoSection aria-label="Ajuda e contato">
          <strong>Ajuda e contato</strong>
          <span className="tw:flex tw:flex-wrap tw:gap-2.5">
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
          {privacyForm?<div className="tw:flex tw:flex-col tw:gap-2.5"><label className="tw:flex tw:flex-col tw:gap-1 tw:text-sm tw:font-bold">Tipo de pedido<Select variant="embedded" className="tw:box-border tw:rounded-cali-compact-control tw:border tw:border-solid tw:border-cali-input-line tw:bg-cali-neutral-surface tw:py-2.5 tw:font-cali-body tw:text-cali-body tw:font-normal" value={privacyForm.kind} onChange={(event)=>setPrivacyForm({...privacyForm,kind:event.target.value})}><option value="access">Acesso aos meus dados</option><option value="correction">Correção de dados</option><option value="deletion">Exclusão de dados</option><option value="other">Outro pedido</option></Select></label><label className="tw:flex tw:flex-col tw:gap-1 tw:text-sm tw:font-bold">O que você precisa<Textarea variant="embedded" className="tw:box-border tw:rounded-cali-compact-control tw:border tw:border-solid tw:border-cali-input-line tw:bg-cali-neutral-surface tw:px-3 tw:py-2.5 tw:font-cali-body tw:text-cali-body tw:font-normal" rows={3} maxLength={2000} value={privacyForm.details} onChange={(event)=>setPrivacyForm({...privacyForm,details:event.target.value})} placeholder="Descreva o pedido."/></label><span className="tw:flex tw:flex-wrap tw:gap-2.5"><ProfilePrivacyButton onClick={()=>setPrivacyForm(null)}>Cancelar</ProfilePrivacyButton><ProfilePrivacyButton primary disabled={privacyBusy||privacyForm.details.trim().length<5} onClick={()=>void sendPrivacyRequest()}>{privacyBusy?'Enviando…':'Enviar pedido'}</ProfilePrivacyButton></span></div>
          :<span className="tw:flex tw:flex-wrap tw:gap-2.5"><ProfilePrivacyButton disabled={privacyBusy} onClick={()=>void downloadMyData()}><Download size={14}/>{privacyBusy?'Gerando…':'Baixar meus dados'}</ProfilePrivacyButton>{role === 'client' && <ProfilePrivacyButton onClick={()=>{setPrivacyMessage('');setPrivacyForm({kind:'access',details:''});}}>Pedir acesso, correção ou exclusão</ProfilePrivacyButton>}</span>}
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
          <span className="tw:flex tw:flex-wrap tw:gap-2.5">
            <a href={caliInstagram} target="_blank" rel="noreferrer">Instagram</a>
            <a href={caliLinkedIn} target="_blank" rel="noreferrer">LinkedIn</a>
          </span>
        </ProfileInfoSection>
        {ownProfile.isError && <InlineNotice role="alert" tone="danger">
          Não foi possível carregar seu perfil.{' '}
          <button type="button" className="tw:cursor-pointer tw:border-0 tw:bg-transparent tw:text-inherit tw:underline" onClick={() => void ownProfile.refetch()}>Tentar novamente</button>
        </InlineNotice>}
        {ownProfile.isPending && <p role="status">Carregando seu perfil…</p>}
        {message?<div className="tw:mt-3.5 tw:rounded-cali-compact-control tw:bg-cali-sand-soft tw:px-4 tw:py-3.5 tw:text-sm/[inherit] tw:text-cali-sand-strong">{message}</div>:null}
        <div className="modal-actions tw:sticky tw:bottom-0 tw:z-2 tw:-mx-8.5! tw:my-0! tw:flex tw:min-h-[5.692rem] tw:flex-none tw:justify-end tw:gap-3 tw:border-0 tw:border-t tw:border-solid tw:border-cali-brand/8 tw:bg-cali-surface-soft! tw:px-8.5! tw:py-3.5! tw:shadow-[0_-14px_34px_rgb(var(--cali-rgb-red-inverse)/0.0549)] tw:backdrop-blur-[1.385rem] tw:workspace-night:border-cali-sand-soft/9 tw:workspace-night:bg-cali-neutral-inverse! tw:[@media(max-width:43.75rem)]:-mx-5! tw:[@media(max-width:43.75rem)]:px-5!
          tw:workspace-documents:[@media(max-width:38.75rem)]:flex-col tw:workspace-documents:[@media(max-width:38.75rem)]:items-stretch
          tw:workspace-documents:[@media(max-width:38.75rem)]:[&>button]:w-full
          tw:workspace-documents:[&>button]:h-10.5 tw:workspace-documents:[&>button]:font-[750]
          tw:workspace-documents:[&>button]:whitespace-nowrap tw:[&>button]:inline-flex tw:[&>button]:items-center tw:[&>button]:gap-2 tw:[&>button]:border tw:[&>button]:border-solid tw:[&>button]:font-normal tw:[&>button:disabled]:opacity-40"><button type="button" className="tw:min-h-[3.308rem] tw:rounded-[0.846rem]! tw:px-5! tw:text-base/[inherit]! tw:border-cali-burgundy-accent/35! tw:bg-transparent! tw:text-cali-brand! tw:shadow-none! tw:hover:bg-cali-brand/6! tw:workspace-night:border-cali-orange-line/35! tw:workspace-night:text-cali-day-canvas! tw:workspace-night:hover:bg-cali-orange-line/8!" onClick={()=>setModalOpen(false)}>Fechar</button><button type="button" className="tw:min-h-[3.308rem] tw:rounded-[0.846rem]! tw:border-cali-brand! tw:bg-cali-brand! tw:px-5! tw:text-base/[inherit]! tw:text-cali-neutral-surface! tw:shadow-none! tw:hover:border-cali-burgundy-text! tw:hover:bg-cali-burgundy-text!" onClick={saveProfile} disabled={saving || !ownProfile.data || !ownProfile.isSuccess || ownProfile.isFetching}>{saving?<Loader2 size={17} className="tw:motion-safe:animate-[spin_.8s_linear_infinite]"/>:<Check size={17}/>} {saving?'Salvando…':'Salvar alterações'}</button></div>
      </DialogFrame>
    </div>,document.body):null}
  </>;
}
