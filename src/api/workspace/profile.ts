import { readWorkspaceSession } from '../access/session';
import { supabase } from '../supabase';

export const workspaceProfileAvailable = supabase !== null;

const profileFields = 'company_id,full_name,email,job_title,phone,whatsapp,linkedin_url,instagram_url,avatar_url,avatar_position_x,avatar_position_y,avatar_zoom,signature_mode,signature_url,signature_style';

type ProfileUpdate = {
  full_name: string;
  job_title: string;
  phone: string;
  whatsapp: string;
  linkedin_url: string;
  instagram_url: string;
  avatar_url: string;
  avatar_position_x: number;
  avatar_position_y: number;
  avatar_zoom: number;
  signature_mode: 'generated' | 'uploaded';
  signature_url: string;
  signature_style: string;
};

export async function readOwnWorkspaceProfile(userId: string) {
  const result = await supabase?.from('profiles').select(profileFields).eq('id', userId).single();
  return result?.data ?? null;
}

export async function readProfileCompany(companyId: string) {
  const result = await supabase?.from('companies').select('display_name,logo_url,logo_workspace_url')
    .eq('id', companyId).single();
  return result?.data ?? null;
}

export async function uploadWorkspaceProfileImage(
  userId: string,
  kind: 'avatar' | 'signature',
  image: { blob: Blob; extension: string; contentType: string },
) {
  if (!supabase) return '';
  const path = `${userId}/${kind}-${Date.now()}.${image.extension}`;
  const storage = supabase.storage.from('workspace-assets');
  const { error } = await storage.upload(path, image.blob, {
    cacheControl: '31536000', contentType: image.contentType, upsert: false,
  });
  if (error) throw error;
  return storage.getPublicUrl(path).data.publicUrl;
}

export async function updateOwnWorkspaceProfile(userId: string | undefined, profile: ProfileUpdate) {
  if (!supabase) return null;
  const session = await readWorkspaceSession();
  if (!session?.user || session.user.id !== userId) throw new Error('Sua sessão mudou. Abra Minha conta novamente.');

  const { error } = await supabase.rpc('update_my_profile_v56', {
    p_full_name: profile.full_name,
    p_job_title: profile.job_title || null,
    p_phone: profile.phone || null,
    p_avatar_url: profile.avatar_url || null,
    p_whatsapp: profile.whatsapp || null,
    p_linkedin_url: profile.linkedin_url || null,
    p_instagram_url: profile.instagram_url || null,
    p_avatar_position_x: profile.avatar_position_x,
    p_avatar_position_y: profile.avatar_position_y,
    p_avatar_zoom: profile.avatar_zoom,
    p_signature_mode: profile.signature_mode,
    p_signature_url: profile.signature_url || null,
    p_signature_style: profile.signature_style,
  });
  if (error) throw error;
  return session.user.id;
}
