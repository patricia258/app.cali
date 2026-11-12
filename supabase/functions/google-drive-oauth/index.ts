import {
  claimGoogleOAuth, finishGoogleOAuth, googleActor, googleFailure, GoogleIntegrationError,
  googleOAuthToken, googleRequest, revokeUnusedGoogleCredential, startGoogleOAuth, withGoogleLease,
} from '../_shared/google-integration.ts';
import { calendarAccessToken } from '../_shared/google-calendar-events.ts';

const drive = 'https://www.googleapis.com/drive/v3/files';
const fileFields = 'id,company_id,deliverable_id,title,storage_path,file_type,original_filename,status,client_visible,version_label,published_at,updated_at';
const mimeByExtension: Record<string, string> = {
  pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain', csv: 'text/csv',
};
const uuid = (value: string) => /^[a-f0-9-]{36}$/.test(value);
const fileUrl = (id: string) => 'https://drive.google.com/file/d/' + encodeURIComponent(id) + '/view';
const folderUrl = (id: string) => 'https://drive.google.com/drive/folders/' + encodeURIComponent(id);

async function sourceVersion(file: { version_label?: string | null; storage_path?: string | null; published_at?: string | null }) {
  const value = JSON.stringify([file.version_label, file.storage_path, file.published_at]);
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (request) => {
  const config = googleRequest(request);
  const rejection = config.reject();
  if (rejection) return rejection;
  const body = await request.json().catch(() => ({}));
  const action = String(body?.action || 'status');
  if (action === 'config') return config.json({
    configured: config.configured,
    parts: { clientId: Boolean(config.clientId), clientSecret: Boolean(config.clientSecret), redirectUri: Boolean(config.callback) },
  });
  if (!config.configured) return config.json({ error: 'google_oauth_not_configured' }, 503);

  try {
    const actor = await googleActor(request);
    const { db, profile, user, workspace } = actor;
    if (profile.role !== 'client' || !profile.company_id) return config.json({ error: 'client_drive_only' }, 403);
    const companyId = String(profile.company_id);
    const key = 'drive:' + companyId;
    async function connection(includeRevoked = false) {
      let query = db.from('drive_connections').select('*').eq('owner_type', 'client').eq('company_id', companyId);
      if (!includeRevoked) query = query.eq('status', 'connected');
      const loaded = await query.order('updated_at', { ascending: false }).limit(1).maybeSingle();
      if (loaded.error) throw new GoogleIntegrationError('drive_connection_unavailable', 503);
      return loaded.data;
    }
    if (action === 'authorize') {
      const attempt = await startGoogleOAuth(config, actor, 'drive', companyId);
      const params = new URLSearchParams({
        client_id: config.clientId, redirect_uri: attempt.redirect, response_type: 'code',
        scope: 'openid email https://www.googleapis.com/auth/drive.file', access_type: 'offline',
        include_granted_scopes: 'true', prompt: 'consent', state: attempt.state,
        code_challenge: attempt.challenge, code_challenge_method: 'S256',
      });
      return config.json({ url: config.authorize(params) });
    }
    if (action === 'exchange') {
      return await withGoogleLease(db, key, () => withGoogleLease(db, 'oauth:' + user.id, async () => {
        const code = String(body.code || '');
        const attempt = await claimGoogleOAuth(config, actor, 'drive', String(body.state || ''), code);
        if ('receipt' in attempt) return config.json(attempt.receipt);
        const credential = await googleOAuthToken(config, actor, 'drive', attempt, code);
        const existing = await connection();
        if (existing && (String(existing.account_email).toLowerCase() !== credential.account_email ||
          existing.google_account_id && existing.google_account_id !== credential.provider_account_id)) {
          throw new GoogleIntegrationError('google_account_mismatch', 409);
        }
        if (config.mode === 'test' && !config.driveRoot()) throw new GoogleIntegrationError('google_drive_target_not_configured', 503);
        return config.json(await finishGoogleOAuth(actor, attempt.nonce, existing?.id || null, config.driveRoot() || null, credential));
      }));
    }
    if (action === 'status') {
      const conn = await connection();
      const jobs = conn ? await db.from('file_sync_jobs').select('file_id,status,external_url,updated_at')
        .eq('connection_id', conn.id).order('updated_at', { ascending: false }).limit(100) : { data: [] };
      return config.json({
        connected: Boolean(conn),
        connection: conn ? { id: conn.id, accountEmail: conn.account_email, rootFolderName: conn.root_folder_name, status: conn.status } : null,
        jobs: jobs.data || [],
      });
    }
    if (action === 'disconnect') {
      return await withGoogleLease(db, key, async () => {
        const conn = await connection(true);
        if (!conn) return config.json({ ok: true });
        const disconnected = await db.from('drive_connections').update({ status: 'revoked', updated_at: new Date().toISOString() }).eq('id', conn.id);
        if (disconnected.error) throw new GoogleIntegrationError('drive_connection_unavailable', 503);
        if (conn.credential_key && conn.connected_by) {
          await withGoogleLease(db, 'oauth:' + conn.connected_by, () => revokeUnusedGoogleCredential(config, actor, conn.credential_key));
        }
        return config.json({ ok: true });
      });
    }
    if (!['copy_file', 'copy_folder'].includes(action)) return config.json({ error: 'unknown_action' }, 400);

    const fileId = String(body.fileId || '');
    const deliverableId = String(body.deliverableId || '');
    if (action === 'copy_file' ? !uuid(fileId) : !uuid(deliverableId)) {
      return config.json({ error: action === 'copy_file' ? 'missing_file_id' : 'missing_deliverable_id' }, 400);
    }
    return await withGoogleLease(db, key, async renew => {
      const conn = await connection();
      if (!conn) return config.json({ error: 'drive_not_connected' }, 409);
      let query = workspace.from('files').select(fileFields).eq('company_id', companyId).eq('status', 'published').eq('client_visible', true);
      query = action === 'copy_file' ? query.eq('id', fileId) : query.eq('deliverable_id', deliverableId);
      const visible = await query.order('id');
      if (visible.error) throw new GoogleIntegrationError('file_not_available', 404);
      if (action === 'copy_file' && !visible.data?.length) return config.json({ error: 'file_not_available' }, 404);
      const files = (visible.data || []).filter(file => file.storage_path);
      if (!files.length) return config.json({
        error: action === 'copy_file' ? 'workspace_file_required' : 'folder_empty',
        detail: action === 'copy_file' ? 'Este arquivo é um link externo.' : 'Ainda não há documento liberado nesta pasta.',
      }, 409);

      const token = await calendarAccessToken(config, db, { ...conn, user_id: conn.connected_by, provider_account_id: conn.google_account_id });
      const authorization = { Authorization: 'Bearer ' + token };
      const jsonHeaders = { ...authorization, 'Content-Type': 'application/json' };
      const now = () => new Date().toISOString();

      async function reserveId() {
        const response = await config.fetch(drive + '/generateIds?count=1&space=drive', { headers: authorization });
        const payload = await response.json().catch(() => ({}));
        const id = payload.ids?.[0];
        if (!response.ok || typeof id !== 'string' || !/^[A-Za-z0-9_-]+$/.test(id)) {
          throw new GoogleIntegrationError('google_drive_reservation_failed', 502);
        }
        return id;
      }
      async function providerFile(id: string) {
        const response = await config.fetch(drive + '/' + encodeURIComponent(id) + '?fields=id,name,trashed,mimeType,webViewLink,appProperties,parents', { headers: authorization });
        if (response.status === 404) return null;
        if (!response.ok) throw new GoogleIntegrationError('google_drive_read_failed', 502);
        return response.json();
      }
      async function folder(folderKey: string, name: string, parent?: string) {
        const fixed = folderKey === 'root' ? config.driveRoot() || conn.root_folder_id : null;
        if (folderKey === 'root' && config.mode === 'test' && !config.driveRoot()) throw new GoogleIntegrationError('google_drive_target_not_configured', 503);
        if (fixed) {
          const found = await providerFile(fixed);
          if (!found || found.trashed || found.mimeType && found.mimeType !== 'application/vnd.google-apps.folder') {
            throw new GoogleIntegrationError('google_drive_target_unavailable', 409);
          }
          return String(found.id);
        }
        const receipt = await db.from('google_drive_folders').select('external_id')
          .eq('connection_id', conn.id).eq('folder_key', folderKey).maybeSingle();
        if (receipt.error) throw new GoogleIntegrationError('drive_receipt_unavailable', 503);
        let id = receipt.data?.external_id;
        if (!id && parent && folderKey.startsWith('deliverable:')) {
          const previous = await db.from('file_sync_jobs').select('target_folder_id,files!inner(deliverable_id)')
            .eq('connection_id', conn.id).eq('files.deliverable_id', folderKey.slice('deliverable:'.length))
            .eq('status', 'synced').is('source_version', null).not('target_folder_id', 'is', null)
            .order('updated_at', { ascending: false }).limit(1).maybeSingle();
          if (previous.error) throw new GoogleIntegrationError('drive_receipt_unavailable', 503);
          if (previous.data?.target_folder_id) {
            const legacy = await providerFile(previous.data.target_folder_id);
            if (legacy?.mimeType === 'application/vnd.google-apps.folder' && !legacy.trashed && legacy.parents?.includes(parent)) {
              return String(legacy.id);
            }
          }
        }
        if (!id) {
          id = await reserveId();
          const reserved = await db.from('google_drive_folders').insert({ connection_id: conn.id, folder_key: folderKey, external_id: id });
          if (reserved.error) throw new GoogleIntegrationError('drive_receipt_unavailable', 503);
        }
        let remote = await providerFile(id);
        if (!remote) {
          const created = await config.fetch(drive + '?fields=id,trashed,mimeType,appProperties,parents', {
            method: 'POST', headers: jsonHeaders, body: JSON.stringify({
              id, name, mimeType: 'application/vnd.google-apps.folder', ...(parent ? { parents: [parent] } : {}),
              appProperties: { caliFolderKey: folderKey, caliConnectionId: conn.id },
            }),
          });
          if (!created.ok && created.status !== 409) throw new GoogleIntegrationError('google_drive_folder_failed', 502);
          remote = created.ok ? await created.json() : await providerFile(id);
        }
        if (!remote || remote.trashed || remote.appProperties?.caliConnectionId !== conn.id ||
          remote.appProperties?.caliFolderKey !== folderKey || (parent && !remote.parents?.includes(parent))) {
          throw new GoogleIntegrationError('google_drive_folder_mismatch', 409);
        }
        if (folderKey === 'root') {
          const saved = await db.from('drive_connections').update({ root_folder_id: id, root_folder_name: name, updated_at: now() }).eq('id', conn.id);
          if (saved.error) throw new GoogleIntegrationError('drive_receipt_unavailable', 503);
        }
        return String(id);
      }
      async function copy(file: typeof files[number], folderId: string) {
        const version = await sourceVersion(file);
        const found = await db.from('file_sync_jobs').select('id,status,external_url,external_file_id,attempts,created_at,source_version')
          .eq('connection_id', conn.id).eq('file_id', file.id)
          .or('source_version.eq.' + version + ',source_version.is.null').order('created_at', { ascending: false }).limit(10);
        if (found.error) throw new GoogleIntegrationError('drive_receipt_unavailable', 503);
        const jobs = found.data || [];
        const legacy = jobs.find(row => row.source_version === null && row.status === 'synced' && Date.parse(row.created_at) >= Date.parse(file.updated_at));
        let job = jobs.find(row => row.source_version === version);
        if (!job && legacy) return { status: 'synced', url: legacy.external_url };
        if (job?.status === 'synced') return { status: 'synced', url: job.external_url };
        if (!job) {
          const inserted = await db.from('file_sync_jobs').insert({
            file_id: file.id, company_id: companyId, connection_id: conn.id, source_version: version,
            status: 'processing', requested_by: user.id, attempts: 1, external_file_id: await reserveId(),
          }).select('id,status,external_url,external_file_id,attempts,created_at,source_version').single();
          if (inserted.error || !inserted.data) throw new GoogleIntegrationError('drive_receipt_unavailable', 503);
          job = inserted.data;
        } else {
          const retry = await db.from('file_sync_jobs').update({ status: 'processing', attempts: job.attempts + 1, updated_at: now() }).eq('id', job.id);
          if (retry.error) throw new GoogleIntegrationError('drive_receipt_unavailable', 503);
        }
        const id = job.external_file_id;
        try {
          let remote = await providerFile(id);
          if (!remote) {
            const document = await actor.client.storage.from('cali-workspace-private').download(file.storage_path);
            if (document.error || !document.data) throw new GoogleIntegrationError('workspace_download_failed', 403);
            let name = String(file.original_filename || file.title || 'Documento CALI').trim();
            const extension = name.split('.').at(-1)?.toLowerCase() || '';
            const mime = String(file.file_type || '').includes('/') ? file.file_type : mimeByExtension[extension] || 'application/octet-stream';
            if (!name.includes('.')) {
              const suffix = Object.keys(mimeByExtension).find(key => mimeByExtension[key] === mime);
              if (suffix) name += '.' + suffix;
            }
            const boundary = 'cali-' + crypto.randomUUID();
            const metadata = JSON.stringify({ id, name, parents: [folderId], appProperties: { caliFileId: file.id, caliSourceVersion: version } });
            const requestBody = new Blob([
              `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${mime}\r\n\r\n`,
              document.data, `\r\n--${boundary}--`,
            ]);
            const uploaded = await config.fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,appProperties,parents,trashed', {
              method: 'POST', headers: { ...authorization, 'Content-Type': 'multipart/related; boundary=' + boundary }, body: requestBody,
            });
            if (!uploaded.ok && uploaded.status !== 409) throw new GoogleIntegrationError('google_drive_upload_failed', 502);
            remote = uploaded.ok ? await uploaded.json() : await providerFile(id);
          }
          if (!remote || remote.trashed || remote.appProperties?.caliFileId !== file.id ||
            remote.appProperties?.caliSourceVersion !== version || !remote.parents?.includes(folderId)) {
            throw new GoogleIntegrationError('google_drive_file_mismatch', 409);
          }
          const url = fileUrl(id);
          const synced = await db.from('file_sync_jobs').update({
            status: 'synced', target_folder_id: folderId, external_url: url, error_message: null, updated_at: now(),
          }).eq('id', job.id);
          if (synced.error) throw new GoogleIntegrationError('drive_receipt_unavailable', 503);
          return { status: 'synced', url, fileName: remote.name };
        } catch (error) {
          await db.from('file_sync_jobs').update({
            status: 'error', error_message: error instanceof GoogleIntegrationError ? error.message : 'google_drive_upload_failed', updated_at: now(),
          }).eq('id', job.id);
          throw error;
        }
      }

      const root = await folder('root', 'CALI Workspace');
      const delivery = action === 'copy_folder' ? deliverableId : files[0].deliverable_id;
      let target = root;
      if (delivery) {
        const named = await workspace.from('deliverables').select('title,protocol').eq('id', delivery).maybeSingle();
        const name = named.data ? `${named.data.title}${named.data.protocol ? ' (' + named.data.protocol + ')' : ''}` : 'Entregável';
        target = await folder('deliverable:' + delivery, name.slice(0, 180), root);
      }
      if (action === 'copy_file') {
        const receipt = await copy(files[0], target);
        await db.from('drive_connections').update({ last_sync_at: now(), updated_at: now() }).eq('id', conn.id);
        return config.json(receipt);
      }
      let copied = 0;
      let failed = 0;
      for (const file of files) {
        await renew();
        try { await copy(file, target); copied++; }
        catch { failed++; }
      }
      await db.from('drive_connections').update({ last_sync_at: now(), updated_at: now() }).eq('id', conn.id);
      return config.json({ status: failed ? 'partial' : 'synced', url: folderUrl(target), copied, failed });
    });
  } catch (error) {
    return googleFailure(config, error instanceof GoogleIntegrationError ? error : null);
  }
});
