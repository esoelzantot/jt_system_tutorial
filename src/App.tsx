import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ImageViewer } from './components/ImageViewer/ImageViewer';
import { SearchBar } from './components/SearchBar/SearchBar';
import { SearchResults } from './components/SearchResults/SearchResults';
import { SectionNavigation } from './components/SectionNavigation/SectionNavigation';
import { LoadingSkeleton, StatusMessage } from './components/StatusMessage/StatusMessage';
import { TutorialSection } from './components/TutorialSection/TutorialSection';
import { UI } from './constants/ui';
import { useActiveSection } from './hooks/useActiveSection';
import { useSearch } from './hooks/useSearch';
import { useStickyOffset } from './hooks/useStickyOffset';
import { useTutorialData } from './hooks/useTutorialData';
import { FirebaseConfigError } from './services/firebase';
import type { SearchResult, TutorialImage } from './types/tutorial';
import { questionButtonDomId, questionDomId, sectionDomId } from './utils/dom';
import logoUrl from './assets/brand/jt-express-logo.png';
import mascotUrl from './assets/brand/jt-rabbit.webp';
import './App.css';

const HIGHLIGHT_MS = 2200;

export function App() {
  const { status, sections, error, reload } = useTutorialData();
  const headerRef = useRef<HTMLElement>(null);
  const stickyOffset = useStickyOffset(headerRef);

  const [query, setQuery] = useState('');
  const { results, isSearching } = useSearch(sections, query);

  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(() => new Set());
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [viewerImage, setViewerImage] = useState<TutorialImage | null>(null);

  const sectionIds = useMemo(() => sections.map((section) => section.id), [sections]);
  const hasContent = status === 'success' && sections.length > 0;
  const { activeId, navigate } = useActiveSection({
    sectionIds,
    stickyOffset,
    enabled: hasContent && !isSearching,
  });

  // Search results temporarily replace the tutorial content. Remember the reading
  // position so clearing the search (without picking a result) returns to it.
  const savedScrollRef = useRef(0);
  const restoreScrollRef = useRef(true);

  const handleQueryChange = useCallback(
    (value: string) => {
      if (!isSearching && value.trim()) {
        savedScrollRef.current = window.scrollY;
        restoreScrollRef.current = true;
      }
      setQuery(value);
    },
    [isSearching],
  );

  const clearSearch = useCallback(() => setQuery(''), []);

  const isFirstRender = useRef(true);
  useLayoutEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (isSearching) window.scrollTo(0, 0);
    else if (restoreScrollRef.current) window.scrollTo(0, savedScrollRef.current);
  }, [isSearching]);

  /** Leaves search mode without restoring the old position (a navigation follows). */
  const exitSearchForNavigation = useCallback(() => {
    restoreScrollRef.current = false;
    setQuery('');
  }, []);

  const handleSelectSection = useCallback(
    (sectionId: string) => {
      exitSearchForNavigation();
      navigate(sectionId, () => document.getElementById(sectionDomId(sectionId)));
    },
    [exitSearchForNavigation, navigate],
  );

  const handleSelectResult = useCallback(
    ({ section, question }: SearchResult) => {
      exitSearchForNavigation();
      setOpenIds((prev) => (prev.has(question.id) ? prev : new Set(prev).add(question.id)));
      navigate(
        section.id,
        () => document.getElementById(questionDomId(question.id)),
        () => {
          document.getElementById(questionButtonDomId(question.id))?.focus({ preventScroll: true });
          setHighlightedId(question.id);
        },
      );
    },
    [exitSearchForNavigation, navigate],
  );

  useEffect(() => {
    if (!highlightedId) return;
    const timer = window.setTimeout(() => setHighlightedId(null), HIGHLIGHT_MS);
    return () => window.clearTimeout(timer);
  }, [highlightedId]);

  const toggleQuestion = useCallback((questionId: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  }, []);

  const openImage = useCallback((image: TutorialImage) => setViewerImage(image), []);
  const closeImage = useCallback(() => setViewerImage(null), []);

  return (
    <>
      <a href="#main" className="skip-link">
        {UI.skipToContent}
      </a>

      <header ref={headerRef} className="app-header">
        <div className="app-header__inner container">
          <div className="brand">
            <img className="brand__logo" src={logoUrl} alt={UI.brand} width={359} height={81} />
            <span className="brand__divider" aria-hidden="true" />
            <div className="brand__text">
              <h1 className="brand__title">{UI.title}</h1>
              <p className="brand__subtitle">{UI.subtitle}</p>
            </div>
          </div>
          <SearchBar value={query} onChange={handleQueryChange} onClear={clearSearch} disabled={!hasContent} />
          <img className="mascot" src={mascotUrl} alt="" aria-hidden="true" width={156} height={216} />
        </div>
        {hasContent && (
          <div className="app-header__nav">
            <SectionNavigation variant="bar" sections={sections} activeId={activeId} onSelect={handleSelectSection} />
          </div>
        )}
      </header>

      <div className="layout container">
        {hasContent && (
          <aside className="layout__sidebar">
            <SectionNavigation variant="sidebar" sections={sections} activeId={activeId} onSelect={handleSelectSection} />
          </aside>
        )}

        <main id="main" className="layout__main" tabIndex={-1}>
          {status === 'loading' && <LoadingSkeleton />}

          {status === 'error' && (
            <StatusMessage
              kind="error"
              title={UI.errorTitle}
              hint={error instanceof FirebaseConfigError ? UI.configErrorHint : UI.errorHint}
              onRetry={error instanceof FirebaseConfigError ? undefined : reload}
            />
          )}

          {status === 'success' && sections.length === 0 && (
            <StatusMessage kind="empty" title={UI.emptyTitle} hint={UI.emptyHint} />
          )}

          {hasContent && isSearching && <SearchResults query={query} results={results} onSelect={handleSelectResult} />}

          {/* Kept mounted during search so open answers and loaded images survive. */}
          {hasContent && (
            <div hidden={isSearching}>
              {sections.map((section, index) => (
                <TutorialSection
                  key={section.id}
                  section={section}
                  index={index}
                  openIds={openIds}
                  highlightedId={highlightedId}
                  onToggle={toggleQuestion}
                  onOpenImage={openImage}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {viewerImage && <ImageViewer image={viewerImage} onClose={closeImage} />}
    </>
  );
}
