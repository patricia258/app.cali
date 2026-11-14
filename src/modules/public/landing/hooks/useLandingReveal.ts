import { useEffect, useState, type RefCallback } from 'react';

export function useLandingReveal<ElementType extends HTMLElement>() {
  const [element, setElement] = useState<ElementType | null>(null);
  const [visible, setVisible] = useState(false);
  const ref: RefCallback<ElementType> = setElement;

  useEffect(() => {
    if (!element || visible) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.12 });
    observer.observe(element);
    return () => observer.disconnect();
  }, [element, visible]);

  return { ref, visible };
}
