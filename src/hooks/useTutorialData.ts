import { useCallback, useEffect, useState } from 'react';
import { fetchTutorial } from '../services/tutorialService';
import type { Section } from '../types/tutorial';

type State =
  | { status: 'loading'; sections: Section[]; error: null }
  | { status: 'success'; sections: Section[]; error: null }
  | { status: 'error'; sections: Section[]; error: Error };

export function useTutorialData() {
  const [state, setState] = useState<State>({ status: 'loading', sections: [], error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((prev) => ({ status: 'loading', sections: prev.sections, error: null }));

    fetchTutorial()
      .then((sections) => {
        if (!cancelled) setState({ status: 'success', sections, error: null });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error('Failed to load tutorial content', error);
        setState({
          status: 'error',
          sections: [],
          error: error instanceof Error ? error : new Error(String(error)),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  return { ...state, reload };
}
