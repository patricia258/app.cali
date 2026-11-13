import { useEffect, useState } from 'react';

/* Capa automática: o logo no centro e o fundo na cor do próprio fundo da imagem, para parecer uma peça só. */
export function DocumentAutoCover({ logo, name }: { logo: string; name: string }) {
  const [background, setBackground] = useState('');
  useEffect(() => {
    let active = true; setBackground('');
    const probe = new Image();
    probe.crossOrigin = 'anonymous';
    probe.onload = () => {
      try {
        const canvas = document.createElement('canvas'); canvas.width = probe.naturalWidth; canvas.height = probe.naturalHeight;
        const context = canvas.getContext('2d'); if (!context || !canvas.width || !canvas.height) return;
        context.drawImage(probe, 0, 0);
        const [r, g, b, alpha] = context.getImageData(Math.min(2, canvas.width - 1), Math.min(2, canvas.height - 1), 1, 1).data;
        if (active) setBackground(alpha < 16 ? '#ffffff' : `rgb(${r}, ${g}, ${b})`);
      } catch { /* sem leitura da imagem, fica o fundo padrão */ }
    };
    probe.src = logo;
    return () => { active = false; };
  }, [logo]);
  return <span className="v2-doc-autocover tw:absolute tw:inset-0 tw:m-0! tw:grid tw:size-full tw:max-w-none tw:place-items-center tw:rounded-none! tw:border-0! tw:bg-[#f6f1ee] tw:p-0!" style={background ? { background } : undefined}><img className="tw:h-auto tw:w-auto tw:max-h-[76%] tw:max-w-[44%] tw:rounded-none tw:border-0 tw:bg-transparent tw:object-contain" src={logo} alt={`Logo de ${name}`} /></span>;
}
