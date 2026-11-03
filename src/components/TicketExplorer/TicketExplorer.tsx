import { useEffect, useState } from 'react';
import { UI } from '../../constants/ui';
import type { Question, TicketSubtype, TutorialImage } from '../../types/tutorial';
import { subtypeIconPath } from './icons';
import './TicketExplorer.css';

interface Props {
  /** A question with answerType "types": it is the main type, its subtypes are the cards. */
  question: Question;
  /** Set when a search result points at a subtype; a new object re-selects it. */
  target?: { subtypeIndex?: number } | null;
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

/** Answer of a main ticket type: tap a subtype card to read what it means and when to use it. */
export function TicketExplorer({ question, target, onOpenImage }: Props) {
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (target) setSelected(target.subtypeIndex ?? 0);
  }, [target]);

  const subtype = question.subtypes[selected] ?? question.subtypes[0];

  return (
    <div className="tx">
      {(question.answerText || question.image) && (
        <div className="tx__intro">
          {question.answerText && (
            <p className="tx__main-text" dir="auto">
              {question.answerText}
            </p>
          )}
          {question.image && (
            <button type="button" className="tx__guide" onClick={() => onOpenImage(question.image!)}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4" />
              </svg>
              {UI.explorerGuide}
            </button>
          )}
        </div>
      )}

      <div className="tx__body">
        <ul className="tx__cards">
          {question.subtypes.map((s, i) => {
            const isSelected = i === selected;
            return (
              <li key={i}>
                <button
                  type="button"
                  className={`tx-card${isSelected ? ' tx-card--selected' : ''}`}
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
                {/* Narrow cards: the explanation opens right under the tapped subtype. */}
                {isSelected && (
                  <div className="tx__inline-detail">
                    <SubtypeDetail mainType={question} subtype={s} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {/* Wide cards: the explanation sits beside the list. */}
        {subtype && (
          <div className="tx__side-detail" aria-live="polite">
            <SubtypeDetail key={selected} mainType={question} subtype={subtype} />
          </div>
        )}
      </div>
    </div>
  );
}
