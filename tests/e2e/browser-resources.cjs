'use strict';

const { execFileSync } = require('node:child_process');
const { statfsSync } = require('node:fs');
const { tmpdir } = require('node:os');

const minimumDiskBytes = 1024 ** 3;

function assertBrowserResources({ availableDiskBytes, memoryPressure }) {
  if (memoryPressure >= 2) {
    throw new Error('QA interrompido por pressão de memória do macOS.');
  }
  if (availableDiskBytes < minimumDiskBytes) {
    const freeMiB = Math.floor(availableDiskBytes / (1024 ** 2));
    throw new Error(`QA interrompido com ${freeMiB} MiB livres no disco temporário. O Chromium precisa de espaço para o perfil, as capturas e o swap.`);
  }
}

function checkBrowserResources() {
  const { bavail, bsize } = statfsSync(tmpdir());
  let memoryPressure = 0;
  if (process.platform === 'darwin') {
    try {
      memoryPressure = Number(execFileSync('/usr/sbin/sysctl', ['-n', 'kern.memorystatus_vm_pressure_level'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        timeout: 1000,
      }).trim());
    } catch {
      // O sandbox pode bloquear o sysctl. O espaço do perfil ainda é verificado.
    }
  }
  assertBrowserResources({ availableDiskBytes: bavail * bsize, memoryPressure });
}

module.exports = { assertBrowserResources, checkBrowserResources };
