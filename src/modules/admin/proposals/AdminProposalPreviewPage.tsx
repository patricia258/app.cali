import { Button } from '../../../components/ds/Button';
import { EmptyState } from '../../../components/ds/EmptyState';
import { InlineNotice } from '../../../components/ds/InlineNotice';
import { useMaterialDeliveryConfirmation } from '../../../hooks/useMaterialDeliveryConfirmation';
import { useEffect, useState } from 'react';
import { ArrowLeft, ExternalLink, Loader2, PencilLine } from 'lucide-react';
import { useNavigate } from '../../../hooks/useNavigate';
import { useParams } from '../../../hooks/useParams';
import { DocumentShell } from '../../../components/workspace/DocumentShell';
import { markRuntimeV2 } from '../../../app/visualRoutes';
import { applyVisualSystem } from '../../../components/workspace/visualSystem';
import { loadPortalProposal, sendPortalProposal, type PortalProposal, type PortalSubmission } from '../../../api/commercial/portal';
import { createPortalProposalPdfUrl } from '../../../api/commercial/proposal-pdf';
import { endWorkspaceSession, readWorkspaceSession } from '../../../api/access/session';
import { GeneratedProposalPreview } from './GeneratedProposalPreview';

type FullProposal=PortalProposal&{submission:PortalSubmission};

export function AdminProposalPreviewPage(){
  const { confirmDelivery, completeDelivery } = useMaterialDeliveryConfirmation();
  const [sending, setSending] = useState(false);
  const [sentMessage, setSentMessage] = useState('');
  const{proposalId=''}=useParams();const navigate=useNavigate();
  const[proposal,setProposal]=useState<FullProposal|null>(null),[pdfUrl,setPdfUrl]=useState(''),[loading,setLoading]=useState(true),[error,setError]=useState('');

  useEffect(()=>{void(async()=>{setLoading(true);setError('');try{const data=await loadPortalProposal(proposalId);if(!data)throw new Error('Proposta não encontrada.');setProposal(data);if(data.pdf_path)setPdfUrl(await createPortalProposalPdfUrl(data.pdf_path));}catch(e){setError(e instanceof Error?e.message:'Não foi possível abrir a proposta.');}finally{setLoading(false)}})()},[proposalId]);

  useEffect(()=>{
    const onMessage=async(event:MessageEvent)=>{
      if(event.origin!==window.location.origin)return;
      if(event.data?.type==='CALI_PORTAL_SESSION_REQUEST'){
        const session = await readWorkspaceSession();
        const target=event.source as WindowProxy|null;
        target?.postMessage({
          type:'CALI_PORTAL_SESSION',
          session:session?{access_token:session.access_token,user:{email:session.user.email}}:null,
        },event.origin);
      }
      if(event.data?.type==='CALI_PORTAL_SIGN_OUT'){
        await endWorkspaceSession();
        window.location.assign('/');
      }
    };
    window.addEventListener('message',onMessage);
    return()=>window.removeEventListener('message',onMessage);
  },[]);

  const archivedPdf=Boolean(proposal?.pdf_path);
  useEffect(()=>{if(!archivedPdf)return;markRuntimeV2(window.location.pathname);applyVisualSystem(window.location.pathname);},[archivedPdf]);

  async function send() {
    if (!proposal || sending || !['aprovada', 'enviada'].includes(proposal.status)) return;
    const recipient = proposal.submission.contact_email.trim();
    if (!recipient.includes('@')) { setError('Confira o e-mail do contato no briefing.'); return; }
    const requestId = await confirmDelivery([recipient], [proposal.id, proposal.version, proposal.pdf_path]);
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

  if(loading)return <DocumentShell><section className="page"><div className="panel portal-admin-loading tw:flex tw:items-center tw:justify-center tw:gap-2.5 tw:p-10.5! tw:text-center! tw:text-[color:var(--muted,#756b6d)]"><Loader2 className="spin"/>Carregando proposta…</div></section></DocumentShell>;
  if(!proposal)return <DocumentShell><section className="page"><InlineNotice tone="danger">{error||'Proposta não encontrada.'}</InlineNotice></section></DocumentShell>;

  if(!proposal.pdf_path)return <GeneratedProposalPreview/>;

  // O PDF oficial arquivado abre no visualizador da moldura compacta.

  return <DocumentShell><div className="ap-app v2-admin-page v2-admin-proposals v2-client-module"><div className="ap-content"><div className="wf">
   <div className="wf-head tw:items-start!"><div><small>PROPOSTAS / VERSÃO OFICIAL ARQUIVADA</small><h1>Proposta v{proposal.version} · {proposal.submission.company_name||proposal.submission.contact_name}</h1><p>Este é o PDF efetivamente salvo e enviado. O documento não é alterado pela plataforma.</p></div><div className="v2-head-actions"><Button variant="workflowSecondary" type="button" onClick={()=>navigate('/admin/propostas')}><ArrowLeft size={15}/> Propostas</Button><Button variant="workflowSecondary" type="button" onClick={()=>navigate(`/admin/propostas/${proposal.submission_id}/editar`)}><PencilLine size={15}/> Criar nova versão</Button>{pdfUrl&&<Button variant="workflowPrimary" type="button" onClick={()=>window.open(pdfUrl,'_blank','noopener,noreferrer')}><ExternalLink size={15}/> Abrir PDF original</Button>}</div></div>
   {['aprovada', 'enviada'].includes(proposal.status)&&<Button type="button" variant="workflowSecondary" disabled={sending} onClick={()=>void send()}>{sending ? 'Enviando…' : proposal.status === 'enviada' ? 'Reenviar proposta' : 'Enviar proposta'}</Button>}
   {sentMessage&&<InlineNotice as="p" tone="success" role="status">{sentMessage}</InlineNotice>}
   {error&&<InlineNotice tone="danger">{error}</InlineNotice>}
   <div className="tw:h-[calc(100dvh-16.154rem)] tw:min-h-[40rem] tw:overflow-hidden tw:rounded-[0.769rem] tw:border tw:border-solid tw:border-[#e9dbd0] tw:bg-white">
     {pdfUrl
       ? <iframe className="tw:block tw:size-full tw:border-0" title={`Proposta v${proposal.version}`} src={pdfUrl} />
       : <EmptyState variant="workflow"><strong>O registro possui um PDF arquivado, mas ele não pôde ser aberto.</strong><p>Tente novamente em instantes.</p></EmptyState>}
   </div>
  </div></div></div></DocumentShell>;
}
