import { createContext, useContext } from 'react';

export const PreviewOverlayContext = createContext<HTMLElement | null>(null);
export function usePreviewOverlayHost() { return useContext(PreviewOverlayContext); }
