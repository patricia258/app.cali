'use strict';

const assert = require('node:assert/strict');
const { browserSuite, press } = require('./browser-suite.cjs');

async function carousel({ page, origin, snapshot }, input) {
  await page.goto(origin + '/', { waitUntil: 'domcontentloaded' });
  const carousel = page.getByRole('region', { name: 'Telas do CALI Workspace na prática' });
  const next = carousel.getByRole('button', { name: 'Próxima tela', exact: true });
  const previous = carousel.getByRole('button', { name: 'Tela anterior', exact: true });
  const selected = carousel.locator('.lp-screen-slide.is-active img');
  await selected.waitFor();
  const first = await selected.getAttribute('alt');
  assert(first);
  await press(next, input);
  assert.equal(await selected.getAttribute('alt'), 'Conversa com a Pati');
  assert(
    await selected.evaluate(async (image) => {
      await image.decode();
      return image.naturalWidth > 0;
    }),
  );
  await press(previous, input);
  assert.equal(await selected.getAttribute('alt'), first);
  const dot = carousel.getByRole('button', { name: 'Ver Conversa com a Pati', exact: true });
  await press(dot, input);
  assert.equal(await selected.getAttribute('alt'), 'Conversa com a Pati');
  await press(previous, input);
  assert.equal(await selected.getAttribute('alt'), first);
  await snapshot('carousel', carousel);
  return { arrows: true, indicator: true, input };
}

async function adjustment({ page, origin, snapshot }, input) {
  if (input === 'touch') {
    await page.goto(origin + '/cliente/entregaveis?deliverable=44444443-4444-4444-8444-444444444444', {
      waitUntil: 'domcontentloaded',
    });
  } else {
    await page.goto(origin + '/cliente/entregaveis', { waitUntil: 'domcontentloaded' });
    await press(page.getByRole('tab', { name: 'Entregáveis', exact: true }), input);
    await press(page.getByRole('button', { name: 'Abrir Entrega QA C', exact: true }), input);
  }
  const overview = page.getByRole('dialog', { name: 'Entrega QA C', exact: true });
  const trigger = overview.getByRole('button', { name: 'Solicitar ajuste', exact: true });
  await press(trigger, input);
  const form = page.getByRole('dialog', { name: 'O que precisa ser revisto?', exact: true });
  const field = form.getByRole('textbox');
  const cancel = form.getByRole('button', { name: 'Cancelar', exact: true });
  const send = form.getByRole('button', { name: 'Enviar ajuste', exact: true });
  await form.waitFor();
  await snapshot('adjustment');
  assert.equal(await page.locator('[role=dialog]:visible').count(), 1);
  assert(await send.isDisabled());
  if (input === 'keyboard') {
    assert(await field.evaluate((element) => element === document.activeElement), 'Campo sem foco ao abrir');
    await page.keyboard.insertText('Separar por unidade.');
    assert(!(await send.isDisabled()));
    await page.keyboard.press('Escape');
  } else {
    await press(field, input);
    await page.keyboard.insertText('Separar por unidade.');
    assert(!(await send.isDisabled()));
    await press(cancel, input);
  }
  await form.waitFor({ state: 'hidden' });
  await overview.waitFor();
  assert(await trigger.evaluate((element) => element === document.activeElement), 'Foco não retornou à origem');
  await press(trigger, input);
  await form.waitFor();
  assert.equal(await field.inputValue(), '');
  await press(form.getByRole('button', { name: 'Fechar ajuste', exact: true }), input);
  await overview.waitFor();
  await press(overview.getByRole('button', { name: 'Aprovar entrega', exact: true }), input);
  const rating = page.getByRole('dialog', { name: 'Como foi esta entrega?', exact: true });
  await rating.waitFor();
  assert.equal(await page.locator('[role=dialog]:visible').count(), 1);
  await press(rating.getByRole('button', { name: 'Fechar avaliação', exact: true }), input);
  await overview.waitFor();
  return { focusRestored: true, cancelAndReopen: true, ratingDialog: true, input };
}

const cases = [
  ['carousel-desktop-pointer', 1440, 'public', 'pointer', carousel],
  ['carousel-mobile-pointer', 390, 'public', 'pointer', carousel],
  ['carousel-mobile-touch', 390, 'public', 'touch', carousel],
  ['carousel-mobile-keyboard', 390, 'public', 'keyboard', carousel],
  ['adjustment-desktop-pointer', 1440, 'client', 'pointer', adjustment],
  ['adjustment-mobile-touch', 390, 'client', 'touch', adjustment],
  ['adjustment-mobile-keyboard', 390, 'client', 'keyboard', adjustment],
].map(([id, width, role, input, run]) => ({ id, width, role, input, run: (context) => run(context, input) }));

browserSuite(cases).catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
