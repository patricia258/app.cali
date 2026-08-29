import { ChangeEvent, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Camera, Check, ChevronDown, Instagram, Linkedin, Loader2, Mail, MessageCircle, Phone, X } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

type Role = 'admin' | 'client';

type ProfileData = {
  full_name: string;
  email: string;
  job_title: string;
  phone: string;
  whatsapp: string;
  linkedin_url: string;
  instagram_url: string;
  avatar_url: string;
  avatar_position_x: number;
  avatar_position_y: number;
  avatar_zoom: number;
};

const profileFallback: Record<Role, ProfileData> = {
  admin: {
    full_name: 'Patrícia Lima',
    email: 'patricia@calirh.com',
    job_title: 'People Advisory Executive',
    phone: '',
    whatsapp: '',
    linkedin_url: '',
    instagram_url: '',
    avatar_url: '',
    avatar_position_x: 50,
    avatar_position_y: 50,
    avatar_zoom: 1,
  },
  client: {
    full_name: 'Marina Costa',
    email: 'marina@grupoaurora.com.br',
    job_title: 'Decisora principal',
    phone: '',
    whatsapp: '',
    linkedin_url: '',
    instagram_url: '',
    avatar_url: '',
    avatar_position_x: 50,
    avatar_position_y: 50,
    avatar_zoom: 1,
  },
};

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'C';
}

function normalizeExternalUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function whatsappUrl(value: string) {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  return `https://wa.me/${digits.startsWith('55') ? digits : `55${digits}`}`;
}

function avatarStyle(profile: Pick<ProfileData, 'avatar_position_x' | 'avatar_position_y' | 'avatar_zoom'>): CSSProperties {
  return {
    '--avatar-x': `${profile.avatar_position_x}%`,
    '--avatar-y': `${profile.avatar_position_y}%`,
    '--avatar-zoom': String(profile.avatar_zoom),
  } as CSSProperties;
}

export function DirectProfileControl({ role }: { role: Role }) {
  const [profile, setProfile] = useState<ProfileData>(profileFallback[role]);
  const [draft, setDraft] = useState<ProfileData>(profileFallback[role]);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const cached = window.localStorage.getItem(`cali-workspace-profile-${role}`);
    if (cached) {
      try {
        const parsed = { ...profileFallback[role], ...JSON.parse(cached) } as ProfileData;
        setProfile(parsed);
        setDraft(parsed);
      } catch {
        // Ignora cache antigo/inválido e mantém o fallback.
      }
    }

    let mounted = true;
    async function load() {
      if (!isSupabaseConfigured || !supabase) return;
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user || !mounted) return;
      const { data } = await supabase
        .from('profiles')
        .select('full_name,email,job_title,phone,whatsapp,linkedin_url,instagram_url,avatar_url,avatar_position_x,avatar_position_y,avatar_zoom')
        .eq('id', user.id)
        .single();
      if (!mounted || !data) return;
      const next: ProfileData = {
        full_name: data.full_name || profileFallback[role].full_name,
        email: data.email || user.email || profileFallback[role].email,
        job_title: data.job_title || profileFallback[role].job_title,
        phone: data.phone || '',
        whatsapp: data.whatsapp || '',
        linkedin_url: data.linkedin_url || '',
        instagram_url: data.instagram_url || '',
        avatar_url: data.avatar_url || '',
        avatar_position_x: Number(data.avatar_position_x ?? 50),
        avatar_position_y: Number(data.avatar_position_y ?? 50),
        avatar_zoom: Number(data.avatar_zoom ?? 1),
      };
      setProfile(next);
      setDraft(next);
    }
    load();
    return () => { mounted = false; };
  }, [role]);

  useEffect(() => {
    if (!modalOpen) return;
    document.body.classList.add('workspace-modal-open');
    return () => document.body.classList.remove('workspace-modal-open');
  }, [modalOpen]);

  const avatar = useMemo(
    () => profile.avatar_url
      ? <img src={profile.avatar_url} alt="" style={avatarStyle(profile)} />
      : <span>{initials(profile.full_name)}</span>,
    [profile],
  );

  function openEditor() {
    setDraft(profile);
    setMessage('');
    setModalOpen(true);
  }

  async function handleAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setMessage('');

    const localPreview = () => {
      const reader = new FileReader();
      reader.onload = () => setDraft((current) => ({
        ...current,
        avatar_url: String(reader.result || ''),
        avatar_position_x: 50,
        avatar_position_y: 50,
        avatar_zoom: 1,
      }));
      reader.readAsDataURL(file);
    };

    if (!supabase) {
      localPreview();
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) {
      localPreview();
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('workspace-assets').upload(path, file, { upsert: true });
    if (error) {
      setMessage('Não consegui enviar essa imagem. Use PNG, JPG ou WEBP com até 5 MB.');
      return;
    }
    const { data } = supabase.storage.from('workspace-assets').getPublicUrl(path);
    setDraft((current) => ({
      ...current,
      avatar_url: data.publicUrl,
      avatar_position_x: 50,
      avatar_position_y: 50,
      avatar_zoom: 1,
    }));
  }

  async function saveProfile() {
    if (!draft.full_name.trim()) return;
    setSaving(true);
    setMessage('');
    const next = {
      ...draft,
      full_name: draft.full_name.trim(),
      linkedin_url: normalizeExternalUrl(draft.linkedin_url),
      instagram_url: normalizeExternalUrl(draft.instagram_url),
    };

    try {
      const { data: sessionData } = supabase
        ? await supabase.auth.getSession()
        : { data: { session: null } } as const;
      const user = sessionData.session?.user;
      if (supabase && user) {
        const { error } = await supabase.rpc('update_my_profile', {
          p_full_name: next.full_name,
          p_job_title: next.job_title || null,
          p_phone: next.phone || null,
          p_avatar_url: next.avatar_url || null,
          p_whatsapp: next.whatsapp || null,
          p_linkedin_url: next.linkedin_url || null,
          p_instagram_url: next.instagram_url || null,
          p_avatar_position_x: next.avatar_position_x,
          p_avatar_position_y: next.avatar_position_y,
          p_avatar_zoom: next.avatar_zoom,
        });
        if (error) throw error;
      }
      window.localStorage.setItem(`cali-workspace-profile-${role}`, JSON.stringify(next));
      setProfile(next);
      setDraft(next);
      setModalOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível salvar o perfil.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="profile-control profile-control-direct">
        <button className="profile-trigger profile-trigger-direct" type="button" onClick={openEditor} aria-label="Editar perfil" title="Editar perfil">
          <span className="profile-avatar">{avatar}</span>
          <span className="profile-copy">
            <strong>{profile.full_name}</strong>
            <small>{profile.job_title || (role === 'admin' ? 'Admin CALI' : 'Acesso principal')}</small>
          </span>
          <ChevronDown className="profile-edit-chevron" size={16} />
        </button>
      </div>

      {modalOpen && (
        <div className="modal-backdrop chrome-modal-backdrop full-screen-modal" role="presentation">
          <section className="modal-card profile-modal profile-modal-v2" role="dialog" aria-modal="true" aria-label="Editar perfil">
            <button className="modal-close" type="button" onClick={() => setModalOpen(false)} aria-label="Fechar"><X size={20} /></button>
            <span className="section-kicker">SEU PERFIL</span>
            <h2>Perfil e canais de contato</h2>
            <p>Essas informações identificam você no Workspace e deixam seus canais de contato acessíveis para quem trabalha com você.</p>

            <div className="profile-photo-workbench">
              <div className="profile-photo-stage">
                <span className="profile-avatar profile-avatar-editor large-editor-avatar">
                  {draft.avatar_url
                    ? <img src={draft.avatar_url} alt="Prévia do perfil" style={avatarStyle(draft)} />
                    : <span>{initials(draft.full_name)}</span>}
                </span>
                <label className="photo-upload-button"><Camera size={17} />Escolher foto<input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAvatar} /></label>
              </div>
              <div className={`profile-crop-controls ${draft.avatar_url ? '' : 'disabled'}`}>
                <label>Zoom<input type="range" min="1" max="3" step="0.05" value={draft.avatar_zoom} disabled={!draft.avatar_url} onChange={(event) => setDraft((current) => ({ ...current, avatar_zoom: Number(event.target.value) }))} /></label>
                <label>Horizontal<input type="range" min="0" max="100" value={draft.avatar_position_x} disabled={!draft.avatar_url} onChange={(event) => setDraft((current) => ({ ...current, avatar_position_x: Number(event.target.value) }))} /></label>
                <label>Vertical<input type="range" min="0" max="100" value={draft.avatar_position_y} disabled={!draft.avatar_url} onChange={(event) => setDraft((current) => ({ ...current, avatar_position_y: Number(event.target.value) }))} /></label>
              </div>
            </div>

            <div className="form-grid profile-form-grid">
              <label className="stacked-label wide">Nome<input value={draft.full_name} onChange={(event) => setDraft((current) => ({ ...current, full_name: event.target.value }))} /></label>
              <label className="stacked-label">Cargo / função<input value={draft.job_title} onChange={(event) => setDraft((current) => ({ ...current, job_title: event.target.value }))} placeholder="Ex.: Diretora de RH" /></label>
              <label className="stacked-label">Telefone<input value={draft.phone} onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))} placeholder="(41) 3333-3333" /></label>
              <label className="stacked-label"><span className="label-with-icon"><MessageCircle size={15} />WhatsApp</span><input value={draft.whatsapp} onChange={(event) => setDraft((current) => ({ ...current, whatsapp: event.target.value }))} placeholder="(41) 99999-9999" /></label>
              <label className="stacked-label"><span className="label-with-icon"><Linkedin size={15} />LinkedIn</span><input value={draft.linkedin_url} onChange={(event) => setDraft((current) => ({ ...current, linkedin_url: event.target.value }))} placeholder="linkedin.com/in/..." /></label>
              <label className="stacked-label"><span className="label-with-icon"><Instagram size={15} />Instagram</span><input value={draft.instagram_url} onChange={(event) => setDraft((current) => ({ ...current, instagram_url: event.target.value }))} placeholder="instagram.com/..." /></label>
              <label className="stacked-label wide"><span className="label-with-icon"><Mail size={15} />E-mail</span><input value={draft.email} disabled /></label>
            </div>

            <div className="profile-live-actions">
              {(draft.whatsapp || draft.phone) && <a className="secondary" href={whatsappUrl(draft.whatsapp || draft.phone)} target="_blank" rel="noreferrer"><MessageCircle size={16} />Abrir WhatsApp</a>}
              {draft.phone && <a className="secondary" href={`tel:${draft.phone.replace(/[^+\d]/g, '')}`}><Phone size={16} />Ligar</a>}
            </div>

            {message && <div className="form-message">{message}</div>}
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button type="button" className="primary" onClick={saveProfile} disabled={saving}>
                {saving ? <Loader2 size={17} className="spin" /> : <Check size={17} />}
                {saving ? 'Salvando…' : 'Salvar perfil'}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
