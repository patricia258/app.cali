import { useRouter } from '@tanstack/react-router';
import type { ComponentPropsWithoutRef } from 'react';

type LinkProps = Omit<ComponentPropsWithoutRef<'a'>, 'href'> & { to: string };

export function Link({ to, onClick, target, download, ...props }: LinkProps) {
  const { history } = useRouter();

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
        if (history.location.href === to) history.replace(to);
        else history.push(to);
      }}
    />
  );
}
