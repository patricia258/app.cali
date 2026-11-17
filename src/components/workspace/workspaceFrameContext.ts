import { createContext } from 'react';

// O layout persistente e as páginas lazy precisam do mesmo contexto durante o Fast Refresh.
export const WorkspaceFrameContext = createContext(false);
