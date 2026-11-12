import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Button } from '../../src/components/ds/Button.tsx';
import { FieldLabel } from '../../src/components/ds/FieldLabel.tsx';
import { GuidedInput } from '../../src/components/ds/GuidedField.tsx';
import { InlineNotice } from '../../src/components/ds/InlineNotice.tsx';

test('pending submit keeps native form semantics and prevents a second submission', () => {
  const markup = renderToStaticMarkup(createElement(Button, {
    type: 'submit', name: 'submit', variant: 'workflowPrimary', pending: true, className: 'draft-send',
  }, 'Enviando…'));
  assert.match(markup, /^<button /);
  assert.match(markup, /type="submit"/);
  assert.match(markup, /name="submit"/);
  assert.match(markup, /class="wf-primary draft-send /);
  assert.match(markup, /disabled=""/);
  assert.match(markup, /aria-busy="true"/);
});

test('icon-only dismissal has an accessible name and accepts an explicit label', () => {
  const close = renderToStaticMarkup(createElement(Button, { variant: 'close', type: 'button' }));
  assert.match(close, /aria-label="Fechar"/);
  const override = renderToStaticMarkup(createElement(Button, {
    variant: 'inlineClose', type: 'button', 'aria-label': 'Fechar prévia',
  }));
  assert.match(override, /aria-label="Fechar prévia"/);
});

test('field labels and guided fields preserve native association and autocomplete', () => {
  const markup = renderToStaticMarkup(createElement(FieldLabel, { htmlFor: 'contact', className: 'wide' },
    'E-mail', createElement(GuidedInput, { id: 'contact', type: 'email', autoComplete: 'email' })));
  assert.match(markup, /^<label for="contact" class="stacked-label wide">/);
  assert.match(markup, /<input id="contact" type="email" autoComplete="email" class="cf-text"\/>/);
});

test('success and danger notices expose the appropriate announcement role', () => {
  assert.match(renderToStaticMarkup(createElement(InlineNotice, { tone: 'success' }, 'Salvo')), /role="status"/);
  assert.match(renderToStaticMarkup(createElement(InlineNotice, { as: 'p', tone: 'danger' }, 'Falhou')), /^<p[^>]+role="alert"/);
});
