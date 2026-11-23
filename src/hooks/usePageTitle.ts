import { useEffect } from 'react';
import { SITE_NAME } from '../data/site';

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} — ${SITE_NAME}` : SITE_NAME;
  }, [title]);
}
