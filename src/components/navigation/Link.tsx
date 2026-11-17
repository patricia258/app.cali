import type { ComponentPropsWithoutRef } from 'react';
import { useNavigate } from '../../hooks/useNavigate';

type LinkProps = Omit<ComponentPropsWithoutRef<'a'>, 'href'> & { to: string };

export function Link({ to, onClick, target, download, ...props }: LinkProps) {
  const navigate = useNavigate();

  return (
    <a
      {...props}
      href={to}
      target={target}
      download={download}
      onClick={(event) => {
        onClick?.(event);
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.altKey ||
          event.ctrlKey ||
          event.shiftKey ||
          (target && target !== '_self') ||
          (download !== undefined && download !== false) ||
          !to.startsWith('/') ||
          to.startsWith('//')
        ) {
          return;
        }

        event.preventDefault();
        navigate(to, { replaceIfSame: true });
      }}
    />
  );
}
