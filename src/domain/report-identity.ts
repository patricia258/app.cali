export type ReportSignatureStyleV59 =
  | 'executive' | 'editorial' | 'notarial' | 'heritage' | 'calligraphic' | 'autograph' | 'contemporary'
  | 'italian' | 'minimal' | 'classic' | 'fluid' | 'delicate' | 'formal' | 'personal';

export type ReportIdentityV55 = {
  user_id?: string;
  full_name?: string;
  job_title?: string;
  avatar_url?: string;
  avatar_position_x?: number;
  avatar_position_y?: number;
  avatar_zoom?: number;
  signature_mode?: 'generated' | 'uploaded';
  signature_url?: string;
  signature_style?: ReportSignatureStyleV59;
  signed_at?: string;
  protocol?: string;
};
