import { memo } from 'react';
import { UI } from '../../constants/ui';
import type { Question, TutorialImage } from '../../types/tutorial';
import { questionButtonDomId, questionDomId, questionPanelDomId } from '../../utils/dom';
import { AnswerContent } from '../AnswerContent/AnswerContent';
import './QuestionAccordion.css';

interface Props {
  question: Question;
  /** Position within its section, starting at 1. */
  number: number;
  isOpen: boolean;
  /** Briefly emphasised after arriving from a search result. */
  isHighlighted: boolean;
  onToggle: (questionId: string) => void;
  onOpenImage: (image: TutorialImage) => void;
}

export const QuestionAccordion = memo(function QuestionAccordion({
  question,
  number,
  isOpen,
  isHighlighted,
  onToggle,
  onOpenImage,
}: Props) {
  const buttonId = questionButtonDomId(question.id);
  const panelId = questionPanelDomId(question.id);
  const { image } = question;
  const isSteps = question.answerType === 'steps';

  return (
    <div
      id={questionDomId(question.id)}
      className={`qa${isOpen ? ' qa--open' : ''}${isHighlighted ? ' qa--highlighted' : ''}`}
    >
      <h3 className="qa__heading">
        <button
          id={buttonId}
          type="button"
          className="qa__trigger"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={() => onToggle(question.id)}
        >
          <span className="qa__number" aria-hidden="true">
            {number}
          </span>
          <span className="qa__main">
            <span className="qa__title" dir="auto">
              {question.title}
            </span>
            <span className="qa__tags">
              <span className={`qa__tag qa__tag--${question.answerType}`}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  {isSteps ? <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" /> : <path d="M4 6h16M4 12h16M4 18h10" />}
                </svg>
                {isSteps ? UI.answerSteps(question.steps.length) : UI.answerParagraph}
              </span>
              {image && (
                <span className="qa__tag qa__tag--image">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="m3 16 5-5 4 4 3-3 6 6" />
                  </svg>
                  {UI.statImages}
                </span>
              )}
            </span>
          </span>
          <span className="qa__chevron" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </span>
        </button>
      </h3>

      {/* Collapsed panels stay mounted (for the height transition) but are inert. */}
      <div id={panelId} role="region" aria-labelledby={buttonId} className="qa__panel" inert={!isOpen}>
        <div className="qa__panel-inner">
          <div className="qa__body">
            {image && (
              <figure className="qa__figure">
                <button
                  type="button"
                  className="qa__image-button"
                  onClick={() => onOpenImage(image)}
                  aria-label={`${UI.enlargeImage}: ${image.alt}`}
                >
                  {/* Screenshot framed as an app window. */}
                  <span className="qa__window-bar" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                  <img
                    src={image.url}
                    alt={image.alt}
                    width={image.width}
                    height={image.height}
                    loading="lazy"
                    decoding="async"
                  />
                  <span className="qa__zoom-badge" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <circle cx="11" cy="11" r="7" />
                      <path d="m20 20-3.5-3.5M11 8v6M8 11h6" />
                    </svg>
                    {UI.enlargeImage}
                  </span>
                </button>
                <figcaption className="qa__caption">{UI.imageHint}</figcaption>
              </figure>
            )}
            <AnswerContent question={question} />
          </div>
        </div>
      </div>
    </div>
  );
});
