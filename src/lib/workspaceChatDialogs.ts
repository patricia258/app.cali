// Diálogos próprios das conversas (entregáveis e ocorrências), no formato do Workspace.
// Substituem as caixas nativas do navegador ("app.calirh.com diz…"), que confundiam: pedido da proprietária em 2026-10-13.

/** Pergunta um link para colar na mensagem. Devolve o endereço completo ou null se a pessoa desistir. */
export function askWorkspaceLink(): Promise<string | null> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'v2-chat-dialog-overlay';
    overlay.innerHTML = `<section class="v2-chat-dialog" role="dialog" aria-modal="true" aria-labelledby="v2-chat-dialog-title">
      <header><div><small>CONVERSA</small><h2 id="v2-chat-dialog-title">Inserir um link na mensagem</h2></div><button type="button" class="v2-chat-dialog-x" aria-label="Fechar">×</button></header>
      <p>Cole o endereço de uma página (site, pasta do Drive, formulário). Para enviar um <strong>arquivo</strong> do seu computador, feche e use o botão <strong>Anexar</strong>.</p>
      <label>Endereço do link<input type="url" placeholder="https://…" autocomplete="off" /></label>
      <footer><button type="button" class="secondary">Cancelar</button><button type="button" class="primary" disabled>Inserir link</button></footer>
    </section>`;
    const input = overlay.querySelector<HTMLInputElement>('input')!;
    const confirm = overlay.querySelector<HTMLButtonElement>('button.primary')!;
    const close = (value: string | null) => { document.removeEventListener('keydown', onKey, true); overlay.remove(); resolve(value); };
    const submit = () => { const raw = input.value.trim(); if (!raw) return; close(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`); };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.stopPropagation(); close(null); } if (event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); submit(); } };
    input.addEventListener('input', () => { confirm.disabled = !input.value.trim(); });
    confirm.addEventListener('click', submit);
    overlay.querySelector('button.secondary')!.addEventListener('click', () => close(null));
    overlay.querySelector('.v2-chat-dialog-x')!.addEventListener('click', () => close(null));
    overlay.addEventListener('mousedown', (event) => { if (event.target === overlay) close(null); });
    document.addEventListener('keydown', onKey, true);
    document.body.append(overlay);
    window.setTimeout(() => input.focus(), 30);
  });
}

/** Aviso de algo que precisa ser corrigido (ex.: arquivo grande demais). Cartão flutuante que some sozinho. */
export function workspaceChatAlert(message: string) {
  document.querySelector('.v2-chat-alert')?.remove();
  const card = document.createElement('div');
  card.className = 'v2-chat-alert';
  card.setAttribute('role', 'alert');
  card.textContent = message;
  document.body.append(card);
  window.setTimeout(() => card.remove(), 6000);
}
