import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  NATURAL_BLOCKS, PRESSURE_BLOCKS, adaptationOf, bandText, blockItems, computeScores, profileOf, rangeOf,
} from '../../src/modules/disc/profileMethod.ts';

test('DISC repeats the same four statements from each selected block under pressure', () => {
  assert.equal(NATURAL_BLOCKS, 18);
  assert.equal(PRESSURE_BLOCKS.length, 6);
  for (let block = 1; block <= NATURAL_BLOCKS; block++) {
    const natural = blockItems(block);
    assert.deepEqual(natural.map((item) => item.style).sort(), ['C', 'D', 'I', 'S']);
    assert.ok(natural.every((item) => item.block === block));
    if (PRESSURE_BLOCKS.includes(block)) {
      const sortedByStyle = (items) => [...items].sort((a, b) => a.style.localeCompare(b.style));
      assert.deepEqual(sortedByStyle(blockItems(block, true)), sortedByStyle(natural));
    }
  }
});

test('DISC compares the pressure answers with the same six natural blocks', () => {
  const natural = Array.from({ length: NATURAL_BLOCKS }, (_, index) => {
    const b = index + 1;
    return PRESSURE_BLOCKS.includes(b) ? { b, mais: 'I', menos: 'S' } : { b, mais: 'D', menos: 'C' };
  });
  const pressure = PRESSURE_BLOCKS.map((b) => ({ b, mais: 'I', menos: 'S' }));
  const unchanged = computeScores({ natural, pressure });
  assert.deepEqual(unchanged.natural, {
    D: { raw: 12, pct: 83 }, I: { raw: 6, pct: 67 }, S: { raw: -6, pct: 33 }, C: { raw: -12, pct: 17 },
  });
  assert.deepEqual(unchanged.natural6, unchanged.pressure);
  assert.deepEqual(adaptationOf(unchanged), { level: 'Muda pouco', changed: [] });
  assert.deepEqual(profileOf(unchanged), { primary: 'D', secondary: 'I', mixed: false, ranked: ['D', 'I', 'S', 'C'] });

  const changed = computeScores({ natural, pressure: pressure.map(({ b }) => ({ b, mais: 'S', menos: 'I' })) });
  assert.deepEqual(changed.adaptation, { D: 0, I: -100, S: 100, C: 0 });
  assert.deepEqual(adaptationOf(changed), {
    level: 'Muda em mais de um estilo', changed: [{ style: 'I', up: false }, { style: 'S', up: true }],
  });
});

test('DISC reports the natural-profile margin and pressure threshold at their exact boundaries', () => {
  const natural = { D: { pct: 70 }, I: { pct: 61 }, S: { pct: 45 }, C: { pct: 24 } };
  assert.equal(profileOf({ natural }).mixed, true);
  assert.equal(profileOf({ natural: { ...natural, I: { pct: 60 } } }).mixed, false);
  assert.deepEqual(adaptationOf({ adaptation: { D: -24, I: 25, S: 0, C: 10 } }), {
    level: 'Muda em um estilo', changed: [{ style: 'I', up: true }],
  });
  assert.deepEqual(rangeOf(95, 10), { lo: 85, hi: 100, band: 'Muito alto', loBand: 'Muito alto', hiBand: 'Muito alto' });
  assert.equal(bandText(59, 10), 'Moderado, no limite com Alto');
});
