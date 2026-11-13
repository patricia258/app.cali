import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DeliveryHistory } from '../../src/components/projects/DeliveryHistory.tsx';
import { DeliveryDetailTabs } from '../../src/components/projects/DeliveryDetailTabs.tsx';
import { ProjectComplexityBadge } from '../../src/components/projects/ProjectComplexityBadge.tsx';
import { StatusBadge } from '../../src/components/ds/StatusBadge.tsx';
import { ClientDeliverySteps } from '../../src/modules/client/deliverables/components/ClientDeliverySteps.tsx';

const render = (Component, props) => renderToStaticMarkup(createElement(Component, props));

test('histórico preserva a ordem fornecida, incluindo entradas antigas e estados distintos', () => {
  const props = {
    title: 'Histórico da entrega',
    description: 'Mudanças de situação',
    emptyMessage: 'Ainda não há movimentações.',
  };
  const markup = render(DeliveryHistory, {
    ...props,
    entries: [
      { id: 2, title: 'Validação', date: '12/11', description: 'Aguardando você', tone: 'review' },
      { id: 'd1', title: 'Criação', date: '10/11', description: 'Situação registrada.' },
    ],
  });
  assert.match(markup, /<ol[^>]*>.*<time[^>]*>12\/11<\/time>.*Validação.*<time[^>]*>10\/11<\/time>.*Criação.*<\/ol>/);
  assert.match(render(DeliveryHistory, { ...props, entries: [] }), /Ainda não há movimentações/);
});

test('etapas do Cliente anunciam progresso, marcam a próxima e preservam prazos', () => {
  const tasks = [
    { id: 'a', title: 'Levantamento', status: 'done' },
    { id: 'b', title: 'Registro antigo', status: 'completed' },
    { id: 'c', title: 'Revisão', protocol: 'CALI-03', status: 'doing', dueAt: '2026-11-13' },
  ];
  const formatDate = (value) => value;
  const markup = render(ClientDeliverySteps, { tasks, formatDate });
  assert.match(markup, /role="progressbar" aria-label="Andamento da entrega" aria-valuenow="67"/);
  assert.match(markup, /<li aria-current="step"[^>]*>.*Revisão.*CALI-03 · prazo 2026-11-13.*Em andamento/);
  assert.equal([...markup.matchAll(/aria-current="step"/g)].length, 1);
  assert.doesNotMatch(render(ClientDeliverySteps, { tasks: tasks.slice(0, 2), formatDate }), /aria-current="step"/);

  const empty = render(ClientDeliverySteps, { tasks: [], formatDate });
  assert.match(empty, /Nenhuma etapa compartilhada/);
  assert.doesNotMatch(empty, /role="progressbar"|<ol/);
});

test('abas do entregável preservam botões e anunciam a seção selecionada', () => {
  const markup = render(DeliveryDetailTabs, {
    tabs: ['overview', 'conversation'], selected: 'conversation', onChange() {},
    label: (tab) => tab === 'overview' ? 'Visão geral' : 'Conversas',
  });
  assert.match(markup, /<nav aria-label="Detalhes da entrega"/);
  assert.match(markup, /<button type="button"[^>]*aria-pressed="false">Visão geral<\/button>/);
  assert.match(markup, /<button type="button"[^>]*aria-pressed="true">Conversas<\/button>/);
});

test('badges de entrega e complexidade carregam suas variantes sem folha de Projetos', () => {
  const review = render(StatusBadge, { variant: 'delivery', tone: 'review', children: 'Aguardando você' });
  assert.match(review, /dv-status[^"]*tw:bg-\[#fff0d9\][^"]*">Aguardando você/);
  const mc = render(ProjectComplexityBadge, { code: 'MC2', explain: true });
  assert.match(mc, /aria-label="MC2: [^"]+" data-tip="[^"]+">MC2<\/b>/);
  const old = render(ProjectComplexityBadge, { code: 'Antiga', explain: true });
  assert.doesNotMatch(old, /data-tip/);
  assert.match(old, />Antiga<\/b>/);
});
