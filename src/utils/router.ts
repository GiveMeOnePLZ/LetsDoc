import { useState, useEffect, useCallback } from 'react';

export type PageKey = 'dashboard' | 'generate' | 'templates' | 'backup' | 'settings';

const PAGE_MAP: Record<string, PageKey> = {
  '': 'generate',
  dashboard: 'dashboard',
  generate: 'generate',
  templates: 'templates',
  backup: 'backup',
  settings: 'settings',
};

const DEFAULT_PAGE: PageKey = 'generate';

export function getPageFromHash(): PageKey {
  const hash = window.location.hash.replace(/^#\/?/, '');
  return PAGE_MAP[hash] || DEFAULT_PAGE;
}

export function setHash(page: PageKey): void {
  window.location.hash = `#/${page}`;
}

export function useCurrentPage(): [PageKey, (page: PageKey) => void] {
  const [page, setPage] = useState<PageKey>(getPageFromHash);

  useEffect(() => {
    const handler = () => {
      setPage(getPageFromHash());
    };
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  const navigate = useCallback((p: PageKey) => {
    setHash(p);
  }, []);

  return [page, navigate];
}
