import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LegalDocument } from '../../src/components/legal/LegalDocument.tsx';
import { CapacityBar } from '../../src/components/hours/CapacityBar.tsx';
import { CapacityCard } from '../../src/components/hours/CapacityCard.tsx';
import { DocumentAutoCover } from '../../src/components/documents/DocumentAutoCover.tsx';
import { DocumentAction } from '../../src/components/workspace/components/DocumentAction.tsx';
import { DocumentPanel } from '../../src/components/workspace/components/DocumentPanel.tsx';
import { SensitiveDataNote } from '../../src/components/privacy/SensitiveDataNote.tsx';
import { ReportManualComplementsPanel } from '../../src/modules/admin/reports/components/ReportManualComplementsPanel.tsx';
import { normalizeIntelligenceSnapshot } from '../../src/lib/reportIntelligence.ts';
import { capacityOf } from '../../src/lib/capacity.ts';
import { workspaceHttp } from './helpers/workspace-http.mjs';

const render = (Component, props = {}) => renderToStaticMarkup(createElement(Component, props));

test('LegalDocument preserva headings, lista, tabela e escapa texto HTML', () => {
  const source = [
    '# 1. Termos', '## Dados', '### Retenção', '',
    'Excluir após **30 dias**. <script>alert(1)</script>',
    '- Solicitar pelo Workspace', '1. Confirmar recebimento', '',
    '| Item | Prazo |', '| --- | --- |', '| Protocolo | **30 dias** |',
  ].join('\n');
  const markup = render(LegalDocument, { source, idPrefix: 'qa' });
  assert.match(markup, /<h2(?: [^>]+)?>Termos<\/h2><h3(?: [^>]+)?>Dados<\/h3><h4(?: [^>]+)?>Retenção<\/h4>/);
  assert.match(markup, /<strong(?: [^>]+)?>30 dias<\/strong>\. &lt;script&gt;/);
  assert.match(markup, /<ul(?: [^>]+)?><li(?: [^>]+)?>Solicitar pelo Workspace<\/li><\/ul><ol(?: [^>]+)?><li(?: [^>]+)?>Confirmar recebimento<\/li><\/ol>/);
  assert.match(markup, /<th(?: [^>]+)?>Item<\/th><th(?: [^>]+)?>Prazo<\/th>.*<td(?: [^>]+)?>Protocolo<\/td><td(?: [^>]+)?><strong(?: [^>]+)?>30 dias<\/strong><\/td>/);
});

test('LegalDocument ignora separador de tabela isolado e mantém o restante do documento', () => {
  const markup = render(LegalDocument, { source: '# Termos\n\n| --- | --- |\n\nTexto válido', idPrefix: 'qa' });
  assert.match(markup, /<h2(?: [^>]+)?>Termos<\/h2><p(?: [^>]+)?>Texto válido<\/p>/);
  assert.doesNotMatch(markup, /<table(?: [^>]+)?>/);
});

test('CapacityBar limita a escala e anuncia o excedente real por texto acessível', () => {
  const markup = render(CapacityBar, { capacity: capacityOf(10, 735) });
  assert.match(markup, /role="progressbar"[^>]+aria-valuemax="100"[^>]+aria-valuenow="100"/);
  assert.match(markup, /aria-valuetext="122,5% utilizados, 2h 15min acima do contratado"/);
  assert.match(markup, /Excedente/);
});

test('CapacityCard apresenta ausência de contrato e pausa sem cobrança automática', () => {
  const noContract = render(CapacityCard, { capacity: capacityOf(null, 90) });
  assert.match(noContract, /Capacidade mensal ainda não definida/);
  assert.doesNotMatch(noContract, /role="progressbar"/);
  const paused = render(CapacityCard, { capacity: capacityOf(10, 735), occurrence: 3, paused: true });
  assert.match(paused, /Atividades pausadas até a renovação do mês/);
  assert.match(paused, /terceira ocorrência/);
  assert.match(paused, /Não há cobrança adicional ou alteração automática de contrato/);
});

test('DocumentAutoCover preserva logo e texto alternativo da empresa', () => {
  const markup = render(DocumentAutoCover, { logo: '/logos/qa.png', name: 'CALI & QA' });
  const image = markup.match(/<img\b[^>]*\/>/)?.[0] ?? '';
  assert.match(image, /\bsrc="\/logos\/qa\.png"/);
  assert.match(image, /\balt="Logo de CALI &amp; QA"/);
});

test('DocumentPanel preserva região semântica e variante de carregamento', () => {
  const markup = render(DocumentPanel, { as: 'aside', padding: 'loading', 'aria-label': 'Resumo', children: 'Carregando' });
  assert.match(markup, /<aside[^>]+aria-label="Resumo"/);
  assert.match(markup, /tw:p-10\.5!/);
  assert.match(markup, /Carregando<\/aside>/);
});

test('DocumentAction preserva ações nativas e permite envio explícito de formulário', () => {
  const primary = render(DocumentAction, { variant: 'primary', disabled: true, children: 'Salvar' });
  assert.match(primary, /<button[^>]+type="button"[^>]+disabled=""/);
  assert.match(primary, /tw:bg-cali-brand/);
  const secondary = render(DocumentAction, { type: 'submit', variant: 'secondary', children: 'Continuar' });
  assert.match(secondary, /<button[^>]+type="submit"/);
  assert.doesNotMatch(secondary, /disabled=""/);
});

test('SensitiveDataNote orienta sobre documentos clínicos com ícone decorativo', () => {
  const markup = render(SensitiveDataNote);
  assert.match(markup, /<svg[^>]+aria-hidden="true"/);
  assert.match(markup, /Não inclua atestados, laudos, diagnósticos, CID ou exames/);
});

test('painel de complementos mostra total e impede edição em fechamento bloqueado', () => {
  const props = {
    value: {
      deliveries: [{ id: 'd1', title: 'Revisão', status: 'completed', completedAt: '2026-11-11', minutes: 50 }],
      timeEntries: [{ id: 'h1', description: 'Apoio', category: 'Documentação', minutes: 35 }],
    },
    onChange() {},
  };
  const locked = render(ReportManualComplementsPanel, { ...props, locked: true });
  assert.match(locked, /1h 25min complementados/);
  assert.match(locked, /Concluído em/);
  assert.match(locked, /<input[^>]+readonly=""[^>]+value="Revisão"/);
  assert.ok([...locked.matchAll(/<button\b[^>]*>/g)].every(([button]) => button.includes('disabled=""')));
  const draft = render(ReportManualComplementsPanel, props);
  assert.doesNotMatch(draft, /readonly=""|disabled=""/);
});

test('papel do relatório mostra protocolo e diferencia ciência pendente de assinatura registrada', async (t) => {
  const http = await workspaceHttp(t);
  const { ExecutiveReportPaper } = await http.loadSource('components/reports/ExecutiveReportPaper.tsx');
  const snapshot = normalizeIntelligenceSnapshot({
    companyId: 'qa', companyName: 'Empresa QA', generatedAt: '2026-11-30',
    period: { start: '2026-11-01', end: '2026-11-30', months: 1 },
    contract: { monthlyHours: 10, contractedHoursPeriod: 10 },
    deliverables: {}, hours: { contractedHours: 10, consumedMinutes: 0 },
  });
  const props = {
    company: { name: 'Empresa QA' }, snapshot, reportType: 'monthly',
    periodName: 'novembro de 2026', protocol: 'REL-QA-01', deliveries: [],
    editor: { summary: '', movements: '', decisions: '', risks: '', nextSteps: '' },
    approvalIdentity: { full_name: 'Patrícia QA', signature_mode: 'generated', signature_style: 'personal' },
  };
  const pending = render(ExecutiveReportPaper, props);
  assert.match(pending, /Empresa QA/);
  assert.match(pending, /REL-QA-01/);
  assert.match(pending, /signature-style-personal">Patrícia QA/);
  assert.match(pending, /Aguardando ciência/);
  const signed = render(ExecutiveReportPaper, {
    ...props,
    acknowledgementIdentity: { full_name: 'Cliente QA', signature_mode: 'uploaded', signature_url: '/fixture.png' },
    acknowledgementProtocol: 'CIE-QA-01',
  });
  assert.doesNotMatch(signed, /Aguardando ciência/);
  assert.match(signed, /alt="Assinatura de Cliente QA"/);
  assert.match(signed, /CIE-QA-01/);
});
