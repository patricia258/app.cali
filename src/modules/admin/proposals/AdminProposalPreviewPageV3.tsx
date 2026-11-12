import { Button } from '../../../components/ds/Button';
import { EmptyState } from '../../../components/ds/EmptyState';
import { InlineNotice } from '../../../components/ds/InlineNotice';
import { useMaterialDeliveryConfirmation } from '../../../hooks/useMaterialDeliveryConfirmation';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ExternalLink, FileText, Loader2, PencilLine } from 'lucide-react';
import { useNavigate } from '../../../hooks/useNavigate';
import { useParams } from '../../../hooks/useParams';
import { Shell } from '../../../components/workspace/WorkspaceShell';
import { markRuntimeV2 } from '../../../app/visualRoutes';
import { applyVisualSystem } from '../../../components/workspace/visualSystem';
import { loadPortalProposal, sendPortalProposal, type PortalProposal, type PortalSubmission } from '../../../api/commercial/portal';
import { createPortalProposalPdfUrl } from '../../../lib/portalProposalPdf';
import { supabase } from '../../../api/supabase';
import { AdminProposalPreviewPageV2 } from './AdminProposalPreviewPageV2';

type FullProposal=PortalProposal&{submission:PortalSubmission};

export function AdminProposalPreviewPageV3(){
  const { confirmDelivery, completeDelivery } = useMaterialDeliveryConfirmation();
  const [sending, setSending] = useState(false);
  const [sentMessage, setSentMessage] = useState('');
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

  const archivedPdf=Boolean(proposal?.pdf_path);
  useEffect(()=>{if(!archivedPdf)return;markRuntimeV2(window.location.pathname);void applyVisualSystem(window.location.pathname);},[archivedPdf]);

  async function send() {
    if (!proposal || sending || !['aprovada', 'enviada'].includes(proposal.status)) return;
    const recipient = proposal.submission.contact_email.trim();
    if (!recipient.includes('@')) { setError('Confira o e-mail do contato no briefing.'); return; }
    const requestId = confirmDelivery([recipient], [proposal.id, proposal.version, proposal.pdf_path]);
    if (!requestId) return;
    setSending(true);
    setError('');
    setSentMessage('');
    try {
      const result = await sendPortalProposal({ proposal_id: proposal.id, request_id: requestId, version: proposal.version, recipient_email: recipient });
      completeDelivery();
      setSentMessage(`Proposta ${proposal.status === 'enviada' ? 'reenviada' : 'enviada'} para ${result.to || recipient}.`);
      setProposal((current) => current?.id === proposal.id ? {
        ...current, status: 'enviada', sent_at: current.sent_at ?? new Date().toISOString(),
      } : current);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível reenviar a proposta.');
    } finally { setSending(false); }
  }

  if(loading)return <Shell role="admin"><section className="page"><div className="panel portal-admin-loading"><Loader2 className="spin"/>Carregando proposta…</div></section></Shell>;
  if(!proposal)return <Shell role="admin"><section className="page"><InlineNotice tone="danger">{error||'Proposta não encontrada.'}</InlineNotice></section></Shell>;

  if(!proposal.pdf_path)return <AdminProposalPreviewPageV2/>;

  // PDF oficial arquivado: só um visualizador em volta do arquivo — usa a moldura V2. A prévia do rascunho (acima) fica nas folhas antigas.

  return <Shell role="admin"><div className="ap-app v2-admin-page v2-admin-proposals v2-admin-pdfview v2-client-module"><div className="ap-content"><div className="wf">
   <div className="wf-head"><div><small>PROPOSTAS / VERSÃO OFICIAL ARQUIVADA</small><h1>Proposta v{proposal.version} · {proposal.submission.company_name||proposal.submission.contact_name}</h1><p>Este é o PDF efetivamente salvo e enviado. O documento não é alterado pela plataforma.</p></div><div className="v2-head-actions"><Button variant="workflowSecondary" type="button" onClick={()=>navigate('/admin/propostas')}><ArrowLeft size={15}/> Propostas</Button><Button variant="workflowSecondary" type="button" onClick={()=>navigate(`/admin/propostas/${proposal.submission_id}/editar`)}><PencilLine size={15}/> Criar nova versão</Button>{pdfUrl&&<Button variant="workflowPrimary" type="button" onClick={()=>window.open(pdfUrl,'_blank','noopener,noreferrer')}><ExternalLink size={15}/> Abrir PDF original</Button>}</div></div>
   {['aprovada', 'enviada'].includes(proposal.status)&&<Button type="button" variant="workflowSecondary" disabled={sending} onClick={()=>void send()}>{sending ? 'Enviando…' : proposal.status === 'enviada' ? 'Reenviar proposta' : 'Enviar proposta'}</Button>}
   {sentMessage&&<InlineNotice as="p" tone="success" role="status">{sentMessage}</InlineNotice>}
   {error&&<InlineNotice tone="danger">{error}</InlineNotice>}
   <div className="v2-pdf-frame">{pdfUrl?<iframe title={`Proposta v${proposal.version}`} src={pdfUrl}/>:<EmptyState variant="workflow"><strong>O registro possui um PDF arquivado, mas ele não pôde ser aberto.</strong><p>Tente novamente em instantes.</p></EmptyState>}</div>
  </div></div></div></Shell>;
}
