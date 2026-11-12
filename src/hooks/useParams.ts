import { useParams as useRouterParams } from '@tanstack/react-router';

export function useParams(): Record<string, string | undefined> {
  return useRouterParams({ strict: false });
}
