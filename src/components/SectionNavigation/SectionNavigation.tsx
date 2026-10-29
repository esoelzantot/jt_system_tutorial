import { memo, useEffect, useRef } from 'react';
import { UI } from '../../constants/ui';
import type { Section } from '../../types/tutorial';
import { scrollChildIntoContainer, sectionDomId } from '../../utils/dom';
import './SectionNavigation.css';

interface Props {
  sections: Section[];
  activeId: string | null;
  onSelect: (sectionId: string) => void;
  /** `sidebar`: vertical list for wide screens; `bar`: horizontal scroller for small screens. */
  variant: 'sidebar' | 'bar';
}

export const SectionNavigation = memo(function SectionNavigation({ sections, activeId, onSelect, variant }: Props) {
  const listRef = useRef<HTMLOListElement>(null);

  // Keep the active item visible inside its own scroll area when there are many sections.
  useEffect(() => {
    const list = listRef.current;
    if (!list || !activeId || list.offsetParent === null) return;
    const item = list.querySelector<HTMLElement>(`[data-section-id="${CSS.escape(activeId)}"]`);
    if (item) scrollChildIntoContainer(list, item, variant === 'bar' ? 'x' : 'y');
  }, [activeId, variant]);

  return (
    <nav className={`section-nav section-nav--${variant}`} aria-label={UI.sectionsNav}>
      {variant === 'sidebar' && <p className="section-nav__heading">{UI.sectionsNav}</p>}
      <ol ref={listRef} className="section-nav__list">
        {sections.map((section) => {
          const isActive = section.id === activeId;
          return (
            <li key={section.id}>
              <a
                href={`#${sectionDomId(section.id)}`}
                data-section-id={section.id}
                className="section-nav__link"
                aria-current={isActive ? 'location' : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  onSelect(section.id);
                }}
              >
                <span className="section-nav__title" dir="auto">
                  {section.title}
                </span>
                {variant === 'sidebar' && (
                  <span className="section-nav__count">{UI.questionsCount(section.questions.length)}</span>
                )}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
});
