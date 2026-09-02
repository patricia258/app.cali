import { supabase } from './supabase';

export async function createPortalProposalPdfUrl(path:string,expiresIn=1800){
  if(!supabase) throw new Error('Supabase não configurado.');
  const {data,error}=await supabase.storage.from('cali-proposals').createSignedUrl(path,expiresIn);
  if(error) throw error;
  if(!data?.signedUrl) throw new Error('PDF original não encontrado.');
  return data.signedUrl;
}
