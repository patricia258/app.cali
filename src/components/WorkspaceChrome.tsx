import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Camera, Check, ChevronDown, Loader2, UserRound, X } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { Role } from './WorkspaceShell';

type ProfileData = {
  full_name: string;
  email: string;
  job_title: string;
  phone: string;
  avatar_url: string;
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
    avatar_url: '',
  },
  client: {
    full_name: 'Marina Costa',
    email: 'marina@grupoaurora.com.br',
    job_title: 'Decisora principal',
    phone: '',
    avatar_url: '',
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
  const days = Math.floor(hours / 24);
  return `há ${days}d`;
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

      const { data } = await supabase
        .from('notifications')
        .select('id,title,body,created_at,read_at,notification_type')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (mounted && data) setItems(data as NotificationItem[]);

      channel = supabase
        .channel(`workspace-notifications-${user.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'cali_workspace', table: 'notifications', filter: `user_id=eq.${user.id}` }, (payload) => {
          if (!mounted) return;
          const incoming = payload.new as NotificationItem;
          setItems((current) => [incoming, ...current].slice(0, 20));
        })
        .subscribe();
    }

    load();
    return () => {
      mounted = false;
      if (channel && supabase) supabase.removeChannel(channel);
    };
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
        <Bell size={20} />
        {unread > 0 && <span className="notification-count">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="notification-panel" role="dialog" aria-label="Notificações">
          <div className="notification-head">
            <div><strong>Notificações</strong><span>{unread ? `${unread} não lida${unread > 1 ? 's' : ''}` : 'Tudo em dia'}</span></div>
            {unread > 0 && <button onClick={markAll}>Marcar todas</button>}
          </div>
          <div className="notification-list">
            {items.length === 0 ? (
              <div className="notification-empty"><Check size={20} /><strong>Nenhum aviso por aqui.</strong><span>Novidades de projetos, horas, agenda e validações aparecem neste canal.</span></div>
            ) : items.map((item) => (
              <button className={`notification-item ${item.read_at ? '' : 'unread'}`} key={item.id} onClick={() => markRead(item)}>
                <span className="notification-indicator" />
                <div><strong>{item.title}</strong>{item.body && <p>{item.body}</p>}<small>{relativeTime(item.created_at)}</small></div>
              </button>
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
        const parsed = JSON.parse(cached) as ProfileData;
        setProfile(parsed); setDraft(parsed);
      } catch { /* ignore cache */ }
    }

    let mounted = true;
    async function load() {
      if (!isSupabaseConfigured || !supabase) return;
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user || !mounted) return;
      const { data } = await supabase.from('profiles').select('full_name,email,job_title,phone,avatar_url').eq('id', user.id).single();
      if (!mounted || !data) return;
      const next: ProfileData = {
        full_name: data.full_name || profileFallback[role].full_name,
        email: data.email || user.email || profileFallback[role].email,
        job_title: data.job_title || profileFallback[role].job_title,
        phone: data.phone || '',
        avatar_url: data.avatar_url || '',
      };
      setProfile(next); setDraft(next);
    }
    load();
    return () => { mounted = false; };
  }, [role]);

  useEffect(() => {
    function closeOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', closeOutside);
    return () => document.removeEventListener('mousedown', closeOutside);
  }, []);

  const avatar = useMemo(() => profile.avatar_url ? <img src={profile.avatar_url} alt="" /> : <span>{initials(profile.full_name)}</span>, [profile]);

  async function handleAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setMessage('');

    if (!supabase) {
      const reader = new FileReader();
      reader.onload = () => setDraft((current) => ({ ...current, avatar_url: String(reader.result || '') }));
      reader.readAsDataURL(file);
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) {
      const reader = new FileReader();
      reader.onload = () => setDraft((current) => ({ ...current, avatar_url: String(reader.result || '') }));
      reader.readAsDataURL(file);
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('workspace-assets').upload(path, file, { upsert: true });
    if (error) { setMessage('Não consegui enviar essa imagem. Tente PNG, JPG ou WEBP com até 5 MB.'); return; }
    const { data } = supabase.storage.from('workspace-assets').getPublicUrl(path);
    setDraft((current) => ({ ...current, avatar_url: data.publicUrl }));
  }

  async function saveProfile() {
    if (!draft.full_name.trim()) return;
    setSaving(true); setMessage('');
    const next = { ...draft, full_name: draft.full_name.trim() };

    try {
      const { data: sessionData } = supabase ? await supabase.auth.getSession() : { data: { session: null } } as const;
      const user = sessionData.session?.user;
      if (supabase && user) {
        const { error } = await supabase.rpc('update_my_profile', {
          p_full_name: next.full_name,
          p_job_title: next.job_title || null,
          p_phone: next.phone || null,
          p_avatar_url: next.avatar_url || null,
        });
        if (error) throw error;
      }
      window.localStorage.setItem(`cali-workspace-profile-${role}`, JSON.stringify(next));
      setProfile(next);
      setModalOpen(false);
      setMenuOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível salvar o perfil.');
    } finally {
      setSaving(false);
    }
  }

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
            <button onClick={() => { setDraft(profile); setModalOpen(true); setMenuOpen(false); }}><UserRound size={17} />Editar perfil</button>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="modal-backdrop chrome-modal-backdrop" role="presentation">
          <section className="modal-card profile-modal" role="dialog" aria-modal="true" aria-label="Editar perfil">
            <button className="modal-close" type="button" onClick={() => setModalOpen(false)} aria-label="Fechar"><X size={20} /></button>
            <span className="section-kicker">SEU PERFIL</span>
            <h2>Informações de acesso</h2>
            <p>Esses dados aparecem no Workspace e ajudam a deixar a relação entre CALI e cliente mais clara.</p>

            <div className="profile-photo-editor">
              <span className="profile-avatar profile-avatar-editor">{draft.avatar_url ? <img src={draft.avatar_url} alt="Prévia do perfil" /> : <span>{initials(draft.full_name)}</span>}</span>
              <label className="secondary upload-avatar"><Camera size={17} />Alterar foto<input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAvatar} /></label>
            </div>

            <div className="form-grid">
              <label className="stacked-label wide">Nome<input value={draft.full_name} onChange={(event) => setDraft((current) => ({ ...current, full_name: event.target.value }))} /></label>
              <label className="stacked-label">Cargo / função<input value={draft.job_title} onChange={(event) => setDraft((current) => ({ ...current, job_title: event.target.value }))} placeholder="Ex.: Diretora de RH" /></label>
              <label className="stacked-label">Telefone<input value={draft.phone} onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))} placeholder="(41) 99999-9999" /></label>
              <label className="stacked-label wide">E-mail<input value={draft.email} disabled /></label>
            </div>
            {message && <div className="form-message">{message}</div>}
            <div className="modal-actions"><button type="button" className="secondary" onClick={() => setModalOpen(false)}>Cancelar</button><button type="button" className="primary" onClick={saveProfile} disabled={saving}>{saving ? <Loader2 size={17} className="spin" /> : <Check size={17} />}{saving ? 'Salvando…' : 'Salvar perfil'}</button></div>
          </section>
        </div>
      )}
    </>
  );
}
