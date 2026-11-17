import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});

const generations = new WeakMap<QueryClient, number>();

export function captureQueryScope(client: QueryClient) {
  const generation = generations.get(client);
  return () => generation === generations.get(client);
}

export function clearWorkspaceQueryCache(client: QueryClient) {
  generations.set(client, (generations.get(client) ?? 0) + 1);
  client.clear();
}
