import { useEffect, useState } from 'react';
import { ArrowLeft, ExternalLink, FileText, Loader2, PencilLine } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Shell } from '../../components/WorkspaceShell';
import { loadPortalProposal, type PortalProposal, type PortalSubmission } from '../../lib/portalAdminApi';
import { createPortalProposalPdfUrl } from '../../lib/portalProposalPdf';
import { AdminProposalPreviewPageV2 } from './AdminProposalPreviewPageV2';

type FullProposal=PortalProposal&{submission:PortalSubmission};

export function AdminProposalPreviewPageV3(){
  const{proposalId=''}=useParams();const navigate=useNavigate();
  const[proposal,setProposal]=useState<FullProposal|null>(null),[pdfUrl,setPdfUrl]=useState(''),[loading,setLoading]=useState(true),[error,setError]=useState('');
  useEffect(()=>{void(async()=>{setLoading(true);setError('');try{const data=await loadPortalProposal(proposalId);if(!data)throw new Error('Proposta não encontrada.');setProposal(data);if(data.pdf_path)setPdfUrl(await createPortalProposalPdfUrl(data.pdf_path));}catch(e){setError(e instanceof Error?e.message:'Não foi possível abrir a proposta.');}finally{setLoading(false)}})()},[proposalId]);
  if(loading)return <Shell role="admin"><section className="page"><div className="panel portal-admin-loading"><Loader2 className="spin"/>Carregando proposta…</div></section></Shell>;
  if(!proposal)return <Shell role="admin"><section className="page"><div className="inline-notice danger">{error||'Proposta não encontrada.'}</div></section></Shell>;
  if(!proposal.pdf_path)return <AdminProposalPreviewPageV2/>;
  return <Shell role="admin"><section className="page portal-original-proposal"><header className="portal-original-toolbar"><button className="secondary" onClick={()=>navigate('/admin/propostas')}><ArrowLeft size={16}/>Propostas</button><div><span>VERSÃO OFICIAL ARQUIVADA</span><strong>Proposta v{proposal.version} · {proposal.submission.company_name||proposal.submission.contact_name}</strong><small>Este é o PDF efetivamente salvo e enviado. O tema da plataforma não altera o documento.</small></div><div><button className="secondary" onClick={()=>navigate(`/admin/propostas/${proposal.submission_id}/editar`)}><PencilLine size={16}/>Criar nova versão</button>{pdfUrl&&<button className="primary" onClick={()=>window.open(pdfUrl,'_blank','noopener,noreferrer')}><ExternalLink size={16}/>Abrir PDF original</button>}</div></header>{error&&<div className="inline-notice danger">{error}</div>}<div className="portal-original-pdf-shell">{pdfUrl?<iframe title={`Proposta v${proposal.version}`} src={pdfUrl}/>:<div className="portal-original-missing"><FileText size={24}/><strong>O registro possui um PDF arquivado, mas ele não pôde ser aberto.</strong></div>}</div></section></Shell>;
}
