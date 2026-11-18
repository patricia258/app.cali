import { useLayoutEffect, useRef, useState } from 'react';

export function useReportDirectionPagination(sectionIds: string[]) {
  const titleRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLElement>(null);
  const sections = useRef<Record<string, HTMLElement | null>>({});
  const [pageStarts, setPageStarts] = useState<number[]>([]);

  useLayoutEffect(() => {
    const title = titleRef.current;
    const footer = footerRef.current;
    const elements = sectionIds.map((id) => sections.current[id]);
    if (!title || !footer || !elements.every((element): element is HTMLElement => Boolean(element))) return;

    function measure(title: HTMLDivElement, footer: HTMLElement, elements: HTMLElement[]) {
      const footerGap = 8;
      const availableHeight = footer.offsetTop - title.offsetTop - title.offsetHeight - footerGap;
      if (availableHeight <= 0) return;

      // Cada folha repete o cabeçalho. Seções da direção passam inteiras para a continuação.
      let usedHeight = 0;
      const nextPageStarts: number[] = [];
      elements.forEach((element, index) => {
        const style = getComputedStyle(element);
        const height = element.offsetHeight + parseFloat(style.marginTop) + parseFloat(style.marginBottom);
        if (usedHeight > 0 && usedHeight + height > availableHeight) {
          nextPageStarts.push(index);
          usedHeight = 0;
        }
        usedHeight += height;
      });

      setPageStarts((current) => (
        current.length === nextPageStarts.length && current.every((start, index) => start === nextPageStarts[index])
          ? current
          : nextPageStarts
      ));
    }

    const update = () => measure(title, footer, elements);
    update();
    const observer = new ResizeObserver(update);
    for (const element of [title, footer, ...elements]) observer.observe(element);
    return () => observer.disconnect();
  });

  return { titleRef, footerRef, sections, pageStarts };
}
