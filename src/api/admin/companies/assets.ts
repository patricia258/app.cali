import { supabase } from '../../supabase';
import { optimizeImageForUpload } from '../../../lib/imageUpload';

export async function uploadCompanyLogo(companyId:string,file:File) {
  if (!supabase) throw new Error('Conexão indisponível.');
  const prepared=await optimizeImageForUpload(file,'company-logo');
  const path=`${companyId}/brand/logo-${Date.now()}.${prepared.extension}`;
  const {error}=await supabase.storage.from('cali-workspace-private').upload(path,prepared.blob,{cacheControl:'31536000',contentType:prepared.contentType,upsert:false}); if(error) throw error; return `private:${path}`;
}
export async function uploadCompanyContractDocument(companyId:string,file:File,type:'contract'|'addendum',documentDate:string) {
  if (!supabase) throw new Error('Conexão indisponível.');
  const safe=file.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]+/g,'-');
  const prepared=file.type.startsWith('image/')?await optimizeImageForUpload(file,'attachment'):{blob:file,contentType:file.type||'application/octet-stream',extension:file.name.split('.').pop()?.toLowerCase()||'bin'};
  const path=`${companyId}/account/${type}-${Date.now()}-${safe.replace(/\.[^.]+$/,'')}.${prepared.extension}`;
  const {error:uploadError}=await supabase.storage.from('cali-workspace-private').upload(path,prepared.blob,{cacheControl:file.type.startsWith('image/')?'31536000':'3600',contentType:prepared.contentType,upsert:false}); if(uploadError) throw uploadError;
  const {data:sessionData}=await supabase.auth.getSession(); const {error}=await supabase.from('account_documents').insert({company_id:companyId,document_type:type,title:type==='contract'?'Contrato assinado':'Aditivo contratual',document_date:documentDate||null,storage_path:path,client_visible:true,created_by:sessionData.session?.user.id??null}); if(error) throw error;
}
