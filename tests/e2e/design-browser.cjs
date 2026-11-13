'use strict';

const assert = require('node:assert/strict');
const { browserSuite, press } = require('./browser-suite.cjs');

const recordTitle = 'Solicitação QA fictícia';
const focusWithin = (dialog) => dialog.evaluate((element) => element.contains(document.activeElement));
const focused = (locator) => locator.evaluate((element) => element === document.activeElement);

async function recordDialog({ page, origin, snapshot }, input) {
  await page.goto(origin + '/cliente/registros', { waitUntil: 'domcontentloaded' });
  const trigger = page.getByRole('button', { name: 'Abrir ' + recordTitle, exact: true });
  await trigger.waitFor();
  await trigger.focus();
  await press(trigger, input);
  const dialog = page.getByRole('dialog', { name: recordTitle, exact: true });
  await dialog.getByText('Resposta QA da CALI.', { exact: true }).waitFor();
  assert.equal(await dialog.getAttribute('aria-modal'), 'true');
  assert.equal(await dialog.getAttribute('data-v2-operation'), 'records-v13-drawer');
  assert(await focusWithin(dialog), 'Foco não entrou no drawer');
  const close = dialog.getByRole('button', { name: 'Fechar', exact: true });
  if (input === 'keyboard') {
    await close.focus();
    await page.keyboard.press('Shift+Tab');
    assert(await focusWithin(dialog), 'Shift+Tab escapou do drawer');
    assert(!(await focused(close)), 'Shift+Tab não levou ao fim do drawer');
    await page.keyboard.press('Tab');
    assert(await focused(close), 'Tab não voltou ao início do drawer');
    await page.keyboard.press('Escape');
  } else {
    const compose = dialog.getByRole('textbox');
    await press(compose, input);
    await compose.fill('Texto sintético sem envio');
    assert(await dialog.getByRole('button', { name: 'Enviar', exact: true }).isEnabled());
    await snapshot('drawer');
    await press(close, input);
  }
  await dialog.waitFor({ state: 'hidden' });
  assert(await focused(trigger), 'Foco não voltou à ocorrência');
  return { keyboardCycle: input === 'keyboard', focusRestored: true, touch: input === 'touch' };
}

async function recordSelectAndEmpty({ page, origin, snapshot }) {
  await page.goto(origin + '/admin/registros', { waitUntil: 'domcontentloaded' });
  const select = page.getByRole('combobox', { name: 'Tipo', exact: true });
  await select.waitFor();
  assert((await select.getAttribute('class'))?.split(/\s+/).includes('wf-record-filter'));
  const record = page.getByText(recordTitle, { exact: true });
  await record.waitFor();
  const values = await select.locator('option').evaluateAll((options) => options.map((option) => option.value));
  const absentType = values.find((value) => !['all', 'request', 'solicitacao', 'solicitação'].includes(value));
  assert(absentType);
  await select.selectOption(absentType);
  const empty = page.getByText('Nenhuma ocorrência neste recorte.', { exact: true });
  await empty.waitFor();
  assert.equal(await empty.evaluate((element) => Boolean(element.closest('.wf-empty'))), true);
  await record.waitFor({ state: 'hidden' });
  await snapshot('empty');
  await select.selectOption('all');
  await record.waitFor();
  return { selectedValue: absentType, emptyAndRestore: true };
}

async function semanticStyles({ page, origin, snapshot }) {
  await page.goto(origin + '/cliente/registros', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Ocorrências', exact: true }).waitFor();
  const primary = page.getByRole('button', { name: 'Nova ocorrência', exact: true });
  assert.match(await primary.getAttribute('class'), /\bwf-primary\b/);
  await primary.click();
  const dialog = page
    .getByRole('dialog')
    .filter({ has: page.getByRole('textbox', { name: 'Assunto', exact: true }) });
  const label = dialog.locator('label.stacked-label').filter({ hasText: 'Assunto' });
  await label.waitFor();
  const fields = await label.evaluate((element) => {
    const style = getComputedStyle(element);
    return { display: style.display, gap: Number.parseFloat(style.gap) };
  });
  assert.equal(fields.display, 'flex');
  assert(Math.abs(fields.gap - 7) < 0.05, 'Espaçamento vertical da legenda deve permanecer em torno de 7 px');
  const viewportOverflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  assert.equal(viewportOverflow, 0);
  await snapshot('form');
  return { buttonAndLabel: true, noHorizontalOverflow: true };
}

const cases = [
  {
    id: 'design-dialog-desktop-keyboard',
    role: 'client',
    input: 'keyboard',
    run: (context) => recordDialog(context, 'keyboard'),
  },
  {
    id: 'design-dialog-mobile-touch',
    role: 'client',
    input: 'touch',
    width: 390,
    run: (context) => recordDialog(context, 'touch'),
  },
  { id: 'design-filter-and-empty', role: 'admin', run: recordSelectAndEmpty },
  { id: 'design-button-and-label', role: 'client', run: semanticStyles },
];

browserSuite(cases).catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
