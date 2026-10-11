import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ExternalLink, FileText, Loader2, PencilLine } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Shell } from '../../components/WorkspaceShell';
import { markRuntimeV2 } from '../../v2/routes';
import { applyVisualSystem } from '../../v2/visualSystem';
import { loadPortalProposal, type PortalProposal, type PortalSubmission } from '../../lib/portalAdminApi';
import { createPortalProposalPdfUrl } from '../../lib/portalProposalPdf';
import { supabase } from '../../lib/supabase';
import { AdminProposalPreviewPageV2 } from './AdminProposalPreviewPageV2';

type FullProposal=PortalProposal&{submission:PortalSubmission};

export function AdminProposalPreviewPageV3(){
  const{proposalId=''}=useParams();const navigate=useNavigate();
  const legacyFrameRef=useRef<HTMLIFrameElement|null>(null);
  const[proposal,setProposal]=useState<FullProposal|null>(null),[pdfUrl,setPdfUrl]=useState(''),[loading,setLoading]=useState(true),[error,setError]=useState('');

  useEffect(()=>{void(async()=>{setLoading(true);setError('');try{const data=await loadPortalProposal(proposalId);if(!data)throw new Error('Proposta não encontrada.');setProposal(data);if(data.pdf_path)setPdfUrl(await createPortalProposalPdfUrl(data.pdf_path));}catch(e){setError(e instanceof Error?e.message:'Não foi possível abrir a proposta.');}finally{setLoading(false)}})()},[proposalId]);

  useEffect(()=>{
    const onMessage=async(event:MessageEvent)=>{
      if(event.origin!==window.location.origin)return;
      if(event.data?.type==='CALI_PORTAL_SESSION_REQUEST'){
        const {data}=await supabase!.auth.getSession();
        const session=data.session;
        const target=event.source as WindowProxy|null;
        target?.postMessage({
          type:'CALI_PORTAL_SESSION',
          session:session?{access_token:session.access_token,user:{email:session.user.email}}:null,
        },event.origin);
      }
      if(event.data?.type==='CALI_PORTAL_SIGN_OUT'){
        await supabase?.auth.signOut();
        window.location.assign('/');
      }
    };
    window.addEventListener('message',onMessage);
    return()=>window.removeEventListener('message',onMessage);
  },[]);

  const guardLegacyFrameNavigation=()=>{
    const frame=legacyFrameRef.current;
    if(!frame?.contentWindow)return;
    try{
      const {pathname,search,hash}=frame.contentWindow.location;
      if(!pathname||pathname==='about:blank'||pathname.startsWith('/portal-legacy/'))return;
      if(pathname.startsWith('/admin/')){
        navigate(`${pathname}${search}${hash}`,{replace:true});
      }
    }catch{
      // A prévia é same-origin; se algum recurso externo assumir a navegação,
      // não tentamos inspecionar o conteúdo do frame.
    }
  };

  if(loading)return <Shell role="admin"><section className="page"><div className="panel portal-admin-loading"><Loader2 className="spin"/>Carregando proposta…</div></section></Shell>;
  if(!proposal)return <Shell role="admin"><section className="page"><div className="inline-notice danger">{error||'Proposta não encontrada.'}</div></section></Shell>;

  if(!proposal.pdf_path)return <AdminProposalPreviewPageV2/>;

  // PDF oficial arquivado: só um visualizador em volta do arquivo — usa a moldura V2. A prévia do rascunho (acima) fica nas folhas antigas.
  markRuntimeV2(window.location.pathname);
  void applyVisualSystem(window.location.pathname);

  return <Shell role="admin"><div className="ap-app v2-admin-page v2-admin-proposals v2-admin-pdfview v2-client-module"><div className="ap-content"><div className="wf">
   <div className="wf-head"><div><small>PROPOSTAS / VERSÃO OFICIAL ARQUIVADA</small><h1>Proposta v{proposal.version} · {proposal.submission.company_name||proposal.submission.contact_name}</h1><p>Este é o PDF efetivamente salvo e enviado. O documento não é alterado pela plataforma.</p></div><div className="v2-head-actions"><button className="wf-secondary" type="button" onClick={()=>navigate('/admin/propostas')}><ArrowLeft size={15}/> Propostas</button><button className="wf-secondary" type="button" onClick={()=>navigate(`/admin/propostas/${proposal.submission_id}/editar`)}><PencilLine size={15}/> Criar nova versão</button>{pdfUrl&&<button className="wf-primary" type="button" onClick={()=>window.open(pdfUrl,'_blank','noopener,noreferrer')}><ExternalLink size={15}/> Abrir PDF original</button>}</div></div>
   {error&&<div className="inline-notice danger">{error}</div>}
   <div className="v2-pdf-frame">{pdfUrl?<iframe title={`Proposta v${proposal.version}`} src={pdfUrl}/>:<div className="wf-empty"><strong>O registro possui um PDF arquivado, mas ele não pôde ser aberto.</strong><p>Tente novamente em instantes.</p></div>}</div>
  </div></div></div></Shell>;
}
