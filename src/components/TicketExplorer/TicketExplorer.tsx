import { memo, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { UI } from '../../constants/ui';
import type { ExplorerTarget, Question, TicketSubtype, TutorialImage } from '../../types/tutorial';
import { questionDomId } from '../../utils/dom';
import { normalize, tokenize } from '../../utils/textSearch';
import { subtypeIconPath } from './icons';
import './TicketExplorer.css';

interface Props {
  /** Questions with answerType "types": each is a main type, its subtypes are the cards. */
  mainTypes: Question[];
  /** Set when a search result points at a subtype. */
  target?: ExplorerTarget | null;
  highlightedId?: string | null;
  onOpenImage: (image: TutorialImage) => void;
}

const SubtypeIconSvg = ({ icon }: { icon: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d={subtypeIconPath(icon)} />
  </svg>
);

function SubtypeDetail({ mainType, subtype }: { mainType: Question; subtype: TicketSubtype }) {
  return (
    <div className="tx-detail">
      <div className="tx-detail__head">
        <span className="tx-detail__icon">
          <SubtypeIconSvg icon={subtype.icon} />
        </span>
        <div>
          <p className="tx-detail__title" dir="auto">
            {subtype.title}
          </p>
          {subtype.titleEn && (
            <p className="tx-detail__title-en" dir="ltr">
              {subtype.titleEn}
            </p>
          )}
        </div>
      </div>

      <div className="tx-detail__block">
        <p className="tx-detail__label">{UI.explorerMeaning}</p>
        <p className="tx-detail__text" dir="auto">
          {subtype.meaning}
        </p>
      </div>

      {subtype.whenToUse && (
        <div className="tx-detail__block tx-detail__block--when">
          <p className="tx-detail__label">{UI.explorerWhen}</p>
          <p className="tx-detail__text" dir="auto">
            {subtype.whenToUse}
          </p>
        </div>
      )}

      <div className="tx-detail__path">
        <span className="tx-detail__path-label">{UI.explorerPath}</span>
        <span className="tx-detail__crumb" dir="auto">
          {mainType.title.replace(/\s*\([^)]*\)\s*$/, '')}
        </span>
        <span className="tx-detail__sep" aria-hidden="true">
          ‹
        </span>
        <span className="tx-detail__crumb tx-detail__crumb--active" dir="auto">
          {subtype.title}
        </span>
      </div>
    </div>
  );
}

/**
 * Interactive guide to ticket types: pick a main type, tap a subtype, read what it means and
 * when to use it. The quick filter searches every subtype across all main types.
 */
export const TicketExplorer = memo(function TicketExplorer({ mainTypes, target, highlightedId, onOpenImage }: Props) {
  const [activeId, setActiveId] = useState(mainTypes[0]?.id ?? '');
  const [selected, setSelected] = useState(0);
  const [filter, setFilter] = useState('');
  const [focusRequest, setFocusRequest] = useState(0);
  const baseId = useId();
  const listRef = useRef<HTMLUListElement>(null);

  const active = mainTypes.find((q) => q.id === activeId) ?? mainTypes[0];

  // Arriving from a search result: open that main type and subtype.
  useEffect(() => {
    if (!target) return;
    setActiveId(target.questionId);
    setSelected(target.subtypeIndex ?? 0);
    setFilter('');
    setFocusRequest((n) => n + 1);
  }, [target]);

  // Runs after the commit above, so the newly selected card is the one in the DOM.
  useEffect(() => {
    if (focusRequest === 0) return;
    listRef.current?.querySelector<HTMLElement>('[aria-pressed="true"]')?.focus({ preventScroll: true });
  }, [focusRequest]);

  const tokens = useMemo(() => tokenize(filter), [filter]);
  const matches = useMemo(() => {
    if (tokens.length === 0) return [];
    return mainTypes.flatMap((mainType) =>
      mainType.subtypes.flatMap((subtype, index) => {
        const haystack = normalize(`${subtype.title} ${subtype.titleEn} ${subtype.meaning} ${subtype.whenToUse}`);
        return tokens.every((t) => haystack.includes(t)) ? [{ mainType, subtype, index }] : [];
      }),
    );
  }, [mainTypes, tokens]);

  if (!active) return null;

  const selectTab = (id: string) => {
    setActiveId(id);
    setSelected(0);
  };

  const onTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    // In RTL the next tab sits to the left.
    const delta = e.key === 'ArrowLeft' ? 1 : e.key === 'ArrowRight' ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = mainTypes[(i + delta + mainTypes.length) % mainTypes.length];
    selectTab(next.id);
    document.getElementById(questionDomId(next.id))?.focus();
  };

  const subtype = active.subtypes[selected] ?? active.subtypes[0];
  const filtering = tokens.length > 0;

  return (
    <div className="tx">
      <div className="tx__search">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="search"
          dir="auto"
          value={filter}
          placeholder={UI.explorerSearch}
          aria-label={UI.explorerSearch}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {filtering ? (
        matches.length === 0 ? (
          <p className="tx__empty" role="status">
            {UI.explorerNoMatches}
          </p>
        ) : (
          <ul className="tx__matches">
            {matches.map(({ mainType, subtype: s, index }) => (
              <li key={`${mainType.id}-${index}`}>
                <button
                  type="button"
                  className="tx-card"
                  onClick={() => {
                    setActiveId(mainType.id);
                    setSelected(index);
                    setFilter('');
                  }}
                >
                  <span className="tx-card__icon">
                    <SubtypeIconSvg icon={s.icon} />
                  </span>
                  <span className="tx-card__text">
                    <span className="tx-card__title" dir="auto">
                      {s.title}
                    </span>
                    <span className="tx-card__en" dir="auto">
                      {mainType.title}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )
      ) : (
        <>
          {mainTypes.length > 1 && (
            <div className="tx__tabs" role="tablist" aria-label={UI.explorerMainTypes}>
              {mainTypes.map((q, i) => (
                <button
                  key={q.id}
                  id={questionDomId(q.id)}
                  type="button"
                  role="tab"
                  className="tx__tab"
                  aria-selected={q.id === active.id}
                  aria-controls={`${baseId}-panel`}
                  tabIndex={q.id === active.id ? 0 : -1}
                  onClick={() => selectTab(q.id)}
                  onKeyDown={(e) => onTabKeyDown(e, i)}
                >
                  <span dir="auto">{q.title}</span>
                  <span className="tx__tab-count">{q.subtypes.length}</span>
                </button>
              ))}
            </div>
          )}

          <div
            id={mainTypes.length > 1 ? `${baseId}-panel` : questionDomId(active.id)}
            className="tx__panel"
            role={mainTypes.length > 1 ? 'tabpanel' : undefined}
          >
            <div className="tx__intro">
              <div>
                {mainTypes.length === 1 && (
                  <h3 className="tx__main-title" dir="auto">
                    {active.title}
                  </h3>
                )}
                {active.answerText && (
                  <p className="tx__main-text" dir="auto">
                    {active.answerText}
                  </p>
                )}
              </div>
              {active.image && (
                <button type="button" className="tx__guide" onClick={() => onOpenImage(active.image!)}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4" />
                  </svg>
                  {UI.explorerGuide}
                </button>
              )}
            </div>

            <div className="tx__body">
              <ul ref={listRef} className="tx__cards">
                {active.subtypes.map((s, i) => {
                  const isSelected = i === selected;
                  return (
                    <li key={i} className="tx__card-item">
                      <button
                        type="button"
                        className={`tx-card${isSelected ? ' tx-card--selected' : ''}${
                          isSelected && highlightedId === active.id ? ' tx-card--flash' : ''
                        }`}
                        aria-pressed={isSelected}
                        onClick={() => setSelected(i)}
                      >
                        <span className="tx-card__icon">
                          <SubtypeIconSvg icon={s.icon} />
                        </span>
                        <span className="tx-card__text">
                          <span className="tx-card__title" dir="auto">
                            {s.title}
                          </span>
                          {s.titleEn && (
                            <span className="tx-card__en" dir="ltr">
                              {s.titleEn}
                            </span>
                          )}
                        </span>
                      </button>
                      {/* Phones: the explanation opens right under the tapped card. */}
                      {isSelected && (
                        <div className="tx__inline-detail">
                          <SubtypeDetail mainType={active} subtype={s} />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>

              {/* Wide screens: the explanation sits beside the list. */}
              {subtype && (
                <div className="tx__side-detail" aria-live="polite">
                  <SubtypeDetail key={`${active.id}-${selected}`} mainType={active} subtype={subtype} />
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
});
