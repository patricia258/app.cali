'use strict';

const assert = require('node:assert/strict');
const { browserSuite } = require('./browser-suite.cjs');

browserSuite([
  {
    id: 'agenda-cliente-solicitar-agendamento',
    role: 'client',
    width: 390,
    input: 'touch',
    async run({ page, origin, snapshot }) {
      await page.goto(origin + '/cliente/cronograma');
      const trigger = page.getByRole('button', { name: 'Solicitar agendamento', exact: true });
      await trigger.tap();
      const chooser = page.getByRole('dialog', { name: 'Que tipo de papo você deseja?' });
      await chooser.getByRole('button', { name: /Visita presencial na sede/ }).waitFor();
      await chooser.getByRole('button', { name: /Bate-papo online/ }).tap();
      const online = page.getByRole('dialog', { name: 'Vamos marcar um papo online?' });
      await online.getByText('R$ 300 por 1h30').waitFor();
      await snapshot('solicitar-agendamento');
      await online.getByRole('button', { name: 'Fechar', exact: true }).tap();
      await online.waitFor({ state: 'detached' });
      assert.equal(await page.getByRole('dialog').count(), 0);
    },
  },
  {
    id: 'agenda-admin-despesas-visitas-concluidas',
    role: 'admin',
    async run({ page, origin, snapshot }) {
      await page.goto(origin + '/admin/calendario');
      const trigger = page.getByRole('button', { name: 'Despesas das visitas extras', exact: true });
      await trigger.press('Enter');
      const dialog = page.getByRole('dialog', { name: 'Despesas de visitas extras', exact: true });
      await dialog.getByRole('button', { name: 'Adicionar linha' }).waitFor();
      assert(await dialog.getByRole('button', { name: 'Registrar despesas' }).isDisabled());
      await snapshot('despesas');
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'detached' });
      assert(await trigger.evaluate((button) => button === document.activeElement));
    },
  },
  {
    id: 'agenda-partner-sem-registro-administrativo-de-despesas',
    role: 'partner',
    async run({ page, origin }) {
      await page.goto(origin + '/equipe/calendario');
      await page.getByRole('heading', { name: 'Calendário.' }).waitFor();
      assert.equal(
        await page.getByRole('button', { name: 'Despesas das visitas extras', exact: true }).count(),
        0,
      );
    },
  },
]).catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
