import assert from 'node:assert/strict';
import test from 'node:test';
import resources from '../e2e/browser-resources.cjs';

test('QA interrompe por pressão de memória ou falta de espaço do perfil', () => {
  const availableDiskBytes = 1024 ** 3;
  assert.doesNotThrow(() => resources.assertBrowserResources({ availableDiskBytes, memoryPressure: 1 }));
  assert.throws(() => resources.assertBrowserResources({ availableDiskBytes, memoryPressure: 2 }), /pressão de memória/);
  assert.throws(() => resources.assertBrowserResources({ availableDiskBytes: availableDiskBytes / 2, memoryPressure: 1 }), /512 MiB livres/);
});
