'use strict';

const rules = [
  [
    'legal-30-dias',
    'Versão legal atualizada para 30 dias',
    (row, before, after) =>
      /^\/(privacidade|termos)\?/.test(row.id) &&
      /12 de novembro de 2026/.test(after) &&
      /30 dias corridos/.test(after) &&
      /15 de outubro de 2026/.test(before),
  ],
  [
    'pre-cadastro',
    'Pré-cadastro público passou a tratar link inválido',
    (row, before, after) =>
      row.id.startsWith('/pre-cadastro/') &&
      row.reference.signature.url === '/' &&
      after.includes('Solicite um novo link à CALI'),
  ],
  [
    'disc-agradecimento',
    'Link DISC antigo agradece e orienta pedir PDF à CALI',
    (row, before, after) =>
      row.id.startsWith('/perfil/relatorio/') &&
      before.includes('Relatório não encontrado') &&
      after.includes('Obrigada por responder!') &&
      after.includes('solicite à CALI RH'),
  ],
  [
    'disc-privado',
    'Perfil individual remete a gestão autorizada',
    (row, before, after) =>
      row.role === 'client' &&
      before.includes('Este relatório ainda não foi liberado') &&
      after.includes('Relatórios individuais ficam com a CALI RH'),
  ],
  [
    'cliente-responsaveis',
    'Home Cliente mostra responsáveis e contato por Ocorrências',
    (row, before, after) =>
      row.role === 'client' &&
      row.candidate.signature.url.split('?')[0] === '/cliente' &&
      before.includes('Fale com a Pati') &&
      after.includes('PARTNER DE APOIO') &&
      after.includes('Falar com a CALI'),
  ],
  [
    'historico-empresa',
    'Adição do histórico de ocorrências por empresa',
    (_row, before, after) => !before.includes('Histórico por empresa') && after.includes('Histórico por empresa'),
  ],
  [
    'admin-visao-geral',
    'Visão geral mostra NPS da carteira e agenda futura',
    (row, before, after) =>
      row.role === 'admin' &&
      row.candidate.signature.url.split('?')[0] === '/admin' &&
      before.includes('NPS atual') &&
      after.includes('NPS da carteira') &&
      after.includes('próximos 15 dias'),
  ],
  [
    'admin-acessos',
    'Contagem da ficha usa apenas acessos habilitados',
    (row, before, after) =>
      row.role === 'admin' &&
      row.candidate.signature.url.split('?')[0] === '/admin/clientes' &&
      before.includes('2 acesso(s) habilitado(s)') &&
      after.includes('1 acesso(s) habilitado(s)'),
  ],
  [
    'admin-aviso',
    'Fila de revisão de avisos',
    (row, before, after) =>
      row.role === 'admin' && !before.includes('Avisos para revisar') && after.includes('Avisos para revisar'),
  ],
  [
    'primeiro-projeto',
    'Carteira vazia permite cadastrar o primeiro projeto',
    (row, before, after) =>
      row.id === 'projetos:carteira-vazia' &&
      before.includes('Ainda não há um projeto persistido') &&
      after.includes('Nenhum projeto cadastrado') &&
      after.includes('Novo projeto'),
  ],
  [
    'satisfacao-coorte',
    'Satisfação inclui coorte e estado das solicitações',
    (row, before, after) =>
      row.id.startsWith('/admin/satisfacao?') &&
      !before.includes('Solicitações de avaliação') &&
      after.includes('Solicitações de avaliação'),
  ],
  [
    'partner-materiais',
    'Partner ganhou acesso de revisão a Materiais',
    (row) =>
      row.role === 'partner' &&
      !row.reference.signature.menus.includes('/equipe/materiais') &&
      row.candidate.signature.menus.includes('/equipe/materiais'),
  ],
  [
    'mfa-antes-do-shell',
    'MFA bloqueia a montagem da interface Admin',
    (row, before, after) =>
      row.id === 'seguranca:mfa-antes-da-confirmacao' &&
      row.reference.signature.menus.length > 0 &&
      !row.candidate.signature.menus.length &&
      after.includes('Verificação em duas etapas'),
  ],
  [
    'aviso-fragmento',
    'Fechamento de aviso preserva fragmento da URL',
    (row) =>
      row.id === 'search:notice-close-replace' &&
      row.candidate.signature.url === row.reference.signature.url + '#comunicado',
  ],
  [
    'entregavel-sobreposicao',
    'Diálogo de ajuste ou avaliação passa a ocupar o único nível visível',
    (row, before, after) =>
      /^entregaveis:(ajuste|avaliacao)$/.test(row.id) &&
      row.reference.signature.dialogs.length === 2 &&
      row.candidate.signature.dialogs.length === 1 &&
      before.includes('Visão geral') &&
      /O que precisa ser revisto\?|Como foi esta entrega\?/.test(after),
  ],
  [
    'entregavel-revisao',
    'Revisão reaberta retira aprovação direta do seletor',
    (row, before, after) =>
      row.id.startsWith('entregavel:') &&
      before.includes('\nAprovado\n') &&
      before.replace('\nAprovado\n', '\n') === after,
  ],
  [
    'agenda-despesas',
    'Agenda Admin recebeu o acesso a despesas',
    (row, before, after) =>
      row.role === 'admin' &&
      row.candidate.signature.url.split('?')[0] === '/admin/calendario' &&
      !before.includes('\nDespesas\n') &&
      after.includes('\nDespesas\n'),
  ],
  [
    'admin-topbar-mobile',
    'Cabeçalho Admin móvel recupera controles cortados',
    (row) =>
      row.role === 'admin' &&
      row.viewport === 'mobile' &&
      row.reference.signature.topbar?.clippedControls.length >
        row.candidate.signature.topbar?.clippedControls.length,
  ],
  [
    'admin-title-spacing',
    'Ações móveis aproximadas do título Admin ou Partner',
    (row) =>
      (row.role === 'admin' || row.role.startsWith('partner')) &&
      row.viewport === 'mobile' &&
      Number.isFinite(row.reference.signature.titleActionsGap) &&
      Number.isFinite(row.candidate.signature.titleActionsGap) &&
      row.reference.signature.titleActionsGap - row.candidate.signature.titleActionsGap >= 80,
  ],
  [
    'mapa-toolbar-mobile',
    'Barra do relatório Mapa expõe ações antes cortadas',
    (row) =>
      row.role === 'admin' &&
      row.reference.signature.reportToolbarClipped?.length > row.candidate.signature.reportToolbarClipped?.length,
  ],
  [
    'foco-visita-extra',
    'Seletor de visita recebe foco com geometria e pintura equivalentes',
    (row) =>
      row.id === 'agenda:escolha-visita-extra' &&
      row.pixels?.changedPixels === 0 &&
      row.differences.length === 1 &&
      row.differences[0] === 'frame' &&
      row.reference.signature.frame.every((frame) => !frame.active) &&
      row.candidate.signature.frame.at(-1)?.active,
  ],
  [
    'carrossel-detalhe-equivalente',
    'Segundo slide equivalente no detalhe com resíduo na captura completa',
    (row) =>
      row.id === 'landing:carrossel-segunda-tela' &&
      !row.differences.length &&
      row.detailPixels?.changedPixels === 0,
  ],
  [
    'ancora-workspace-detalhe-equivalente',
    'Âncora e seção Workspace equivalentes com resíduo na captura completa',
    (row) =>
      row.id === 'landing:ancora-workspace' &&
      row.candidate.signature.url === '/#workspace' &&
      !row.differences.length &&
      row.detailPixels?.changedPixels === 0,
  ],
  [
    'foco-visivel-dialogo',
    'Contorno de foco no diálogo aberto por link',
    (row) => {
      if (row.differences.some((key) => key !== 'frame')) return false;
      if (row.id !== 'avisos:comunicado-aberto' && !row.id.startsWith('/cliente/entregaveis?deliverable='))
        return false;
      const frame = row.candidate.signature.frame.find(
        (element) => element.active && element.outline?.includes(' auto '),
      );
      const bounds = row.pixels?.bounds;
      return Boolean(
        frame &&
        bounds &&
        bounds.left >= frame.x - 4 &&
        bounds.top >= frame.y - 4 &&
        bounds.right <= frame.x + frame.width + 4 &&
        bounds.bottom <= frame.y + frame.height + 4,
      );
    },
  ],
];

function classify(row, texts) {
  if (row.status === 'equivalent') return { code: 'equivalent', detail: 'Assinatura e pixels dentro do limite' };
  if (row.status === 'candidate-failure')
    return { code: 'candidate-failure', detail: 'Falha de captura, ação ou asset no candidato' };
  if (row.status === 'reference-limitation') {
    if (row.id === 'landing:carrossel-segunda-tela' && row.viewport === 'mobile')
      return {
        code: 'carrossel-mobile',
        detail: 'Main não conclui clique de carrossel a 390 px. Candidato conclui',
      };
    if (row.id === 'agenda:despesas-visita-extra')
      return {
        code: 'agenda-despesas',
        detail: 'Main não expõe despesas na Agenda Admin. Candidato abre o diálogo',
      };
    return { code: 'reference-limitation', detail: 'Falha de captura, ação ou asset na referência' };
  }
  const matched = rules.filter(([, , verify]) => verify(row, ...texts));
  if (matched.length)
    return {
      code: 'matched',
      rules: matched.map(([code]) => code),
      detail: matched.map(([, detail]) => detail).join('. '),
    };
  if (row.differences.includes('url'))
    return { code: 'review-route', detail: 'Mudança de destino a revisar com URLs registradas no JSON' };
  if (row.differences.includes('textHash'))
    return { code: 'review-text', detail: 'Mudança de conteúdo a revisar com textos lado a lado' };
  if (row.differences.length) return { code: 'review-layout', detail: 'Mudança de layout ou semântica a revisar' };
  if (row.pixels?.changedPixels <= 5)
    return { code: 'pixel-residue', detail: 'Até cinco pixels alterados com assinatura e dimensões iguais' };
  return { code: 'review-pixels', detail: 'Mudança de pixels a revisar com mapa de diferenças' };
}

module.exports = { classify };
