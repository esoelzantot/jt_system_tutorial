import { memo } from 'react';
import { UI } from '../../constants/ui';
import type { Question, TutorialImage } from '../../types/tutorial';
import { questionButtonDomId, questionDomId, questionPanelDomId } from '../../utils/dom';
import { AnswerContent } from '../AnswerContent/AnswerContent';
import './QuestionAccordion.css';

interface Props {
  question: Question;
  isOpen: boolean;
  /** Briefly emphasised after arriving from a search result. */
  isHighlighted: boolean;
  onToggle: (questionId: string) => void;
  onOpenImage: (image: TutorialImage) => void;
}

export const QuestionAccordion = memo(function QuestionAccordion({
  question,
  isOpen,
  isHighlighted,
  onToggle,
  onOpenImage,
}: Props) {
  const buttonId = questionButtonDomId(question.id);
  const panelId = questionPanelDomId(question.id);
  const { image } = question;

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
          <span className="qa__title" dir="auto">
            {question.title}
          </span>
          <svg className="qa__chevron" viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
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
