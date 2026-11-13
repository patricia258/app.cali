import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DeliveryHistory } from '../../src/components/projects/DeliveryHistory.tsx';
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
