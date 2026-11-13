import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AdminNotice } from '../../src/components/ds/AdminNotice.tsx';
import { CompactDialog, CompactDialogActions, CompactDialogOverlay } from '../../src/components/ds/CompactDialog.tsx';
import { WorkflowControls, WorkflowControlsAside, WorkflowSegments } from '../../src/components/ds/WorkflowControls.tsx';
import { WorkflowDialog, WorkflowDialogActions, WorkflowDialogForm, WorkflowDialogHeader, WorkflowDialogOverlay } from '../../src/components/ds/WorkflowDialog.tsx';
import { WorkflowHeading } from '../../src/components/ds/WorkflowHeading.tsx';
import { WorkflowList, WorkflowListRow } from '../../src/components/ds/WorkflowList.tsx';

const render = (Component, props, ...children) => renderToStaticMarkup(h(Component, props, ...children));

test('WorkflowList mantém cabeçalho, seleção e botão de ação nativo', () => {
  const markup = render(WorkflowList, { className: 'custom-grid' },
    h(WorkflowListRow, { header: true }, h('span', null, 'Assunto')),
    h(WorkflowListRow, { as: 'button', disabled: true }, 'Abrir item'),
    h(WorkflowListRow, { role: 'button', tabIndex: 0 }, 'Abrir com teclado'),
  );
  assert.match(markup, /<div class="wf-records[^"]*custom-grid/);
  assert.match(markup, /<div class="wf-record-row[^"]*\bheader\b[^"]*"><span>Assunto<\/span><\/div>/);
  assert.match(markup, /<button type="button" disabled="" class="wf-record-row[^"]*">Abrir item<\/button>/);
  assert.match(markup, /<div role="button" tabindex="0" class="wf-record-row[^"]*">Abrir com teclado<\/div>/);
  assert.doesNotMatch(markup, /\b(?:header|as)="(?:true|button)"/);
});

test('WorkflowHeading e controles preservam hierarquia, rótulo e seleção', () => {
  const markup = render(WorkflowHeading, { className: 'custom-title' }, h('h1', null, 'Ocorrências'));
  assert.match(markup, /class="wf-head[^"]*custom-title[^"]*"><h1>Ocorrências<\/h1>/);
  const controls = render(WorkflowControls, { 'aria-label': 'Filtrar ocorrências' },
    h(WorkflowControlsAside, null, h('input', { 'aria-label': 'Buscar' })),
    h(WorkflowSegments, null, h('button', { type: 'button', className: 'on', 'aria-pressed': true }, 'Todas')),
  );
  assert.match(controls, /aria-label="Filtrar ocorrências" class="wf-controls/);
  assert.match(controls, /class="wf-control-right[^"]*"><input aria-label="Buscar"/);
  assert.match(controls, /class="wf-segments[^"]*"><button type="button" class="on" aria-pressed="true">Todas<\/button>/);
});

test('primitivas de diálogo mantêm região modal e envio nativo', () => {
  const markup = render(WorkflowDialogOverlay, { role: 'presentation' },
    h(WorkflowDialogForm, { 'aria-label': 'Novo registro', create: true },
      h(WorkflowDialogHeader, null, 'Registrar'),
      h(WorkflowDialogActions, null, h('button', { type: 'submit' }, 'Salvar'))),
  );
  assert.match(markup, /role="presentation" class="wf-overlay/);
  assert.match(markup, /<form[^>]*aria-label="Novo registro"[^>]*\bwf-create\b[^>]*role="dialog" aria-modal="true"/);
  assert.match(markup, /class="wf-modal-header[^"]*">Registrar<\/div>/);
  assert.match(markup, /class="wf-modal-actions[^"]*"><button type="submit">Salvar<\/button>/);
  assert.match(render(WorkflowDialog, { as: 'aside', 'aria-label': 'Detalhes' }), /<aside[^>]*role="dialog" aria-modal="true"/);
  const compact = render(CompactDialogOverlay, null,
    h(CompactDialog, { 'aria-label': 'Histórico' }, h(CompactDialogActions, null, 'Fechar')));
  assert.match(compact, /class="modal-backdrop[^"]*"><section[^>]*role="dialog" aria-modal="true"/);
  assert.match(compact, /class="modal-actions[^"]*">Fechar<\/div>/);
});

test('AdminNotice preserva papel semântico com cores de resultado', () => {
  assert.match(render(AdminNotice, { success: true, role: 'status' }, 'Salvo'), /role="status"[^>]*#f1f8f3[^>]*>Salvo<\/p>/);
  assert.match(render(AdminNotice, { role: 'alert' }, 'Falhou'), /role="alert"[^>]*#fdf3f3[^>]*>Falhou<\/p>/);
});
