(() => {
  const nativePrint = window.print.bind(window);
  let printing = false;

  function isReportPrintRoute() {
    return /\/relatorios\/impressao\//.test(window.location.pathname);
  }

  function nextFrame() {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }

  async function waitForImages() {
    const images = Array.from(document.images || []);
    await Promise.all(images.map((image) => {
      if (image.complete) return Promise.resolve();
      return new Promise((resolve) => {
        const done = () => resolve();
        image.addEventListener('load', done, { once: true });
        image.addEventListener('error', done, { once: true });
      });
    }));
  }

  async function waitUntilReportIsPainted() {
    try { await document.fonts?.ready; } catch { /* FontFaceSet indisponível */ }
    await waitForImages();

    for (let attempt = 0; attempt < 12; attempt += 1) {
      await nextFrame();
      await nextFrame();
      const stage = document.querySelector('.report-print-v16-stage');
      const paper = stage?.querySelector('.reports-v19-paper');
      const rect = paper?.getBoundingClientRect();
      const text = (paper?.textContent || '').trim();
      if (rect && rect.width > 500 && rect.height > 700 && text.length > 80) {
        await new Promise((resolve) => setTimeout(resolve, 320));
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
  }

  window.print = function caliSafePrint() {
    if (!isReportPrintRoute()) {
      nativePrint();
      return;
    }
    if (printing) return;
    printing = true;
    void (async () => {
      try {
        await waitUntilReportIsPainted();
        nativePrint();
      } finally {
        window.setTimeout(() => { printing = false; }, 600);
      }
    })();
  };
})();
