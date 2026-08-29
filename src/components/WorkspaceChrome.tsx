import { ChangeEvent, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Bell, Camera, Check, ChevronDown, Instagram, Linkedin, Loader2, Mail, MessageCircle, Phone, UserRound, X } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { Role } from './WorkspaceShell';

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

type NotificationItem = {
  id: string;
  title: string;
  body: string | null;
  created_at: string;
  read_at: string | null;
  notification_type?: string;
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

const notificationFallback: Record<Role, NotificationItem[]> = {
  admin: [
    { id: 'demo-1', title: 'Entregável pronto para sua revisão', body: 'Grupo Aurora · Estrutura de indicadores de People', created_at: new Date().toISOString(), read_at: null, notification_type: 'deliverable' },
    { id: 'demo-2', title: 'Horas próximas do limite contratado', body: 'Novatech atingiu 82% do ciclo atual.', created_at: new Date(Date.now() - 3600000).toISOString(), read_at: null, notification_type: 'hours' },
    { id: 'demo-3', title: 'Novo comentário do cliente', body: 'Studio Norte solicitou um ajuste no ritual de gestão.', created_at: new Date(Date.now() - 86400000).toISOString(), read_at: new Date().toISOString(), notification_type: 'comment' },
  ],
  client: [
    { id: 'demo-c1', title: 'Você tem uma entrega para validar', body: 'Estrutura de indicadores de People · prazo em 2 dias.', created_at: new Date().toISOString(), read_at: null, notification_type: 'deliverable' },
    { id: 'demo-c2', title: 'Novo relatório publicado', body: 'Relatório executivo de agosto está disponível.', created_at: new Date(Date.now() - 7200000).toISOString(), read_at: null, notification_type: 'report' },
  ],
};

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'C';
}

function relativeTime(value: string) {
  const date = new Date(value).getTime();
  const diff = Math.max(0, Date.now() - date);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  return `há ${Math.floor(hours / 24)}d`;
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

export function NotificationCenter({ role }: { role: Role }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>(notificationFallback[role]);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    let channel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null;
    async function load() {
      if (!isSupabaseConfigured || !supabase) return;
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user || !mounted) return;
      const { data } = await supabase.from('notifications').select('id,title,body,created_at,read_at,notification_type').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20);
      if (mounted && data) setItems(data as NotificationItem[]);
      channel = supabase.channel(`workspace-notifications-${user.id}`).on('postgres_changes', { event: 'INSERT', schema: 'cali_workspace', table: 'notifications', filter: `user_id=eq.${user.id}` }, (payload) => {
        if (!mounted) return;
        setItems((current) => [payload.new as NotificationItem, ...current].slice(0, 20));
      }).subscribe();
    }
    load();
    return () => { mounted = false; if (channel && supabase) supabase.removeChannel(channel); };
  }, [role]);

  useEffect(() => {
    function closeOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', closeOutside);
    return () => document.removeEventListener('mousedown', closeOutside);
  }, []);

  const unread = items.filter((item) => !item.read_at).length;
  async function markRead(item: NotificationItem) {
    setItems((current) => current.map((notification) => notification.id === item.id ? { ...notification, read_at: notification.read_at || new Date().toISOString() } : notification));
    if (!item.id.startsWith('demo-') && supabase) await supabase.rpc('mark_notification_read', { p_notification_id: item.id });
  }
  async function markAll() {
    setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString() })));
    if (supabase) await supabase.rpc('mark_all_notifications_read');
  }

  return (
    <div className="chrome-popover" ref={popoverRef}>
      <button className="icon-button notification-button" aria-label="Notificações" onClick={() => setOpen((current) => !current)}>
        <Bell size={20} />{unread > 0 && <span className="notification-count">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="notification-panel" role="dialog" aria-label="Notificações">
          <div className="notification-head"><div><strong>Notificações</strong><span>{unread ? `${unread} não lida${unread > 1 ? 's' : ''}` : 'Tudo em dia'}</span></div>{unread > 0 && <button onClick={markAll}>Marcar todas</button>}</div>
          <div className="notification-list">
            {items.length === 0 ? <div className="notification-empty"><Check size={20} /><strong>Nenhum aviso por aqui.</strong><span>Novidades de projetos, horas, agenda e validações aparecem neste canal.</span></div> : items.map((item) => (
              <button className={`notification-item ${item.read_at ? '' : 'unread'}`} key={item.id} onClick={() => markRead(item)}><span className="notification-indicator" /><div><strong>{item.title}</strong>{item.body && <p>{item.body}</p>}<small>{relativeTime(item.created_at)}</small></div></button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ProfileControl({ role, compact = false }: { role: Role; compact?: boolean }) {
  const [profile, setProfile] = useState<ProfileData>(profileFallback[role]);
  const [draft, setDraft] = useState<ProfileData>(profileFallback[role]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cached = window.localStorage.getItem(`cali-workspace-profile-${role}`);
    if (cached) {
      try {
        const parsed = { ...profileFallback[role], ...JSON.parse(cached) } as ProfileData;
        setProfile(parsed); setDraft(parsed);
      } catch { /* cache inválido */ }
    }
    let mounted = true;
    async function load() {
      if (!isSupabaseConfigured || !supabase) return;
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user || !mounted) return;
      const { data } = await supabase.from('profiles').select('full_name,email,job_title,phone,whatsapp,linkedin_url,instagram_url,avatar_url,avatar_position_x,avatar_position_y,avatar_zoom').eq('id', user.id).single();
      if (!mounted || !data) return;
      const next: ProfileData = {
        full_name: data.full_name || profileFallback[role].full_name,
        email: data.email || user.email || profileFallback[role].email,
        job_title: data.job_title || profileFallback[role].job_title,
        phone: data.phone || '', whatsapp: data.whatsapp || '', linkedin_url: data.linkedin_url || '', instagram_url: data.instagram_url || '', avatar_url: data.avatar_url || '',
        avatar_position_x: Number(data.avatar_position_x ?? 50), avatar_position_y: Number(data.avatar_position_y ?? 50), avatar_zoom: Number(data.avatar_zoom ?? 1),
      };
      setProfile(next); setDraft(next);
    }
    load();
    return () => { mounted = false; };
  }, [role]);

  useEffect(() => {
    function closeOutside(event: MouseEvent) { if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false); }
    document.addEventListener('mousedown', closeOutside);
    return () => document.removeEventListener('mousedown', closeOutside);
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    document.body.classList.add('workspace-modal-open');
    return () => document.body.classList.remove('workspace-modal-open');
  }, [modalOpen]);

  const avatar = useMemo(() => profile.avatar_url ? <img src={profile.avatar_url} alt="" style={avatarStyle(profile)} /> : <span>{initials(profile.full_name)}</span>, [profile]);

  async function handleAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setMessage('');
    const localPreview = () => {
      const reader = new FileReader();
      reader.onload = () => setDraft((current) => ({ ...current, avatar_url: String(reader.result || ''), avatar_position_x: 50, avatar_position_y: 50, avatar_zoom: 1 }));
      reader.readAsDataURL(file);
    };
    if (!supabase) { localPreview(); return; }
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) { localPreview(); return; }
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('workspace-assets').upload(path, file, { upsert: true });
    if (error) { setMessage('Não consegui enviar essa imagem. Use PNG, JPG ou WEBP com até 5 MB.'); return; }
    const { data } = supabase.storage.from('workspace-assets').getPublicUrl(path);
    setDraft((current) => ({ ...current, avatar_url: data.publicUrl, avatar_position_x: 50, avatar_position_y: 50, avatar_zoom: 1 }));
  }

  async function saveProfile() {
    if (!draft.full_name.trim()) return;
    setSaving(true); setMessage('');
    const next = { ...draft, full_name: draft.full_name.trim(), linkedin_url: normalizeExternalUrl(draft.linkedin_url), instagram_url: normalizeExternalUrl(draft.instagram_url) };
    try {
      const { data: sessionData } = supabase ? await supabase.auth.getSession() : { data: { session: null } } as const;
      const user = sessionData.session?.user;
      if (supabase && user) {
        const { error } = await supabase.rpc('update_my_profile', {
          p_full_name: next.full_name, p_job_title: next.job_title || null, p_phone: next.phone || null, p_avatar_url: next.avatar_url || null,
          p_whatsapp: next.whatsapp || null, p_linkedin_url: next.linkedin_url || null, p_instagram_url: next.instagram_url || null,
          p_avatar_position_x: next.avatar_position_x, p_avatar_position_y: next.avatar_position_y, p_avatar_zoom: next.avatar_zoom,
        });
        if (error) throw error;
      }
      window.localStorage.setItem(`cali-workspace-profile-${role}`, JSON.stringify(next));
      setProfile(next); setDraft(next); setModalOpen(false); setMenuOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível salvar o perfil.');
    } finally { setSaving(false); }
  }

  const wa = whatsappUrl(profile.whatsapp || profile.phone);
  return (
    <>
      <div className={`profile-control ${compact ? 'compact' : ''}`} ref={menuRef}>
        <button className="profile-trigger" type="button" onClick={() => setMenuOpen((current) => !current)}>
          <span className="profile-avatar">{avatar}</span>
          {!compact && <span className="profile-copy"><strong>{profile.full_name}</strong><small>{profile.job_title || (role === 'admin' ? 'Admin CALI' : 'Acesso principal')}</small></span>}
          {!compact && <ChevronDown size={16} />}
        </button>
        {menuOpen && (
          <div className="profile-menu">
            <div className="profile-menu-head"><span className="profile-avatar large-avatar">{avatar}</span><div><strong>{profile.full_name}</strong><span>{profile.email}</span></div></div>
            <div className="profile-quick-actions">
              {wa && <a href={wa} target="_blank" rel="noreferrer" title="WhatsApp"><MessageCircle size={16} /></a>}
              {profile.linkedin_url && <a href={normalizeExternalUrl(profile.linkedin_url)} target="_blank" rel="noreferrer" title="LinkedIn"><Linkedin size={16} /></a>}
              <a href={`mailto:${profile.email}`} title="E-mail"><Mail size={16} /></a>
            </div>
            <button onClick={() => { setDraft(profile); setModalOpen(true); setMenuOpen(false); }}><UserRound size={17} />Editar perfil</button>
          </div>
        )}
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
                  {draft.avatar_url ? <img src={draft.avatar_url} alt="Prévia do perfil" style={avatarStyle(draft)} /> : <span>{initials(draft.full_name)}</span>}
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
            <div className="modal-actions"><button type="button" className="secondary" onClick={() => setModalOpen(false)}>Cancelar</button><button type="button" className="primary" onClick={saveProfile} disabled={saving}>{saving ? <Loader2 size={17} className="spin" /> : <Check size={17} />}{saving ? 'Salvando…' : 'Salvar perfil'}</button></div>
          </section>
        </div>
      )}
    </>
  );
}
