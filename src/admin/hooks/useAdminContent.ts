import { useCallback, useEffect, useState } from 'react';
import { loadAdminContent } from '../services/adminContent';
import type { AdminQuestion, AdminSection } from '../types';

interface State {
  status: 'loading' | 'ready' | 'error';
  sections: AdminSection[];
  questions: AdminQuestion[];
}

/** Loads all sections and questions; `reload` after every write keeps the view in sync. */
export function useAdminContent() {
  const [state, setState] = useState<State>({ status: 'loading', sections: [], questions: [] });

  const reload = useCallback(async () => {
    try {
      const data = await loadAdminContent();
      setState({ status: 'ready', ...data });
    } catch (error) {
      console.error('Failed to load content', error);
      setState((prev) => ({ ...prev, status: prev.status === 'ready' ? 'ready' : 'error' }));
      throw error;
    }
  }, []);

  useEffect(() => {
    reload().catch(() => {});
  }, [reload]);

  return { ...state, reload };
}
