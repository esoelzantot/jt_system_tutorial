import { useEffect, useState } from 'react';
import { useI18n } from '../../i18n/I18nContext';
import type { GuideItem, Question, TutorialImage } from '../../types/tutorial';
import './PackagingGuide.css';

interface Props {
  /** A question with answerType "guide". */
  question: Question;
  /** Set when a search result points at a step; a new object re-selects it. */
  target?: { stepIndex?: number } | null;
  onOpenImage: (image: TutorialImage) => void;
}

/** Answer of a packaging topic: definition, examples, a materials checklist and a step-by-step walkthrough. */
export function PackagingGuide({ question, target, onOpenImage }: Props) {
  const { t } = useI18n();
  const guide = question.guide;
  const steps = guide?.steps ?? [];
  const materials = guide?.materials ?? [];
  const [stepIndex, setStepIndex] = useState(0);
  const [ready, setReady] = useState<ReadonlySet<number>>(() => new Set());

  useEffect(() => {
    if (target?.stepIndex !== undefined) setStepIndex(target.stepIndex);
  }, [target]);

  if (!guide) return null;

  const hasSteps = steps.length > 0;
  const step: GuideItem | undefined = steps[stepIndex] ?? steps[0];
  const toggle = (i: number) =>
    setReady((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <div className="pg">
      {question.answerText && (
        <p className="pg__intro" dir="auto">
          {question.answerText}
        </p>
      )}

      {guide.examples.length > 0 && (
        <section className="pg__block">
          <h4 className="pg__heading">{t.guideExamples}</h4>
          <ul className="pg__examples">
            {guide.examples.map((item, i) => (
              <li key={i} className="pg-example">
                {item.imageUrl && <img src={item.imageUrl} alt="" loading="lazy" decoding="async" />}
                <span dir="auto">{item.text}</span>
                {item.note && (
                  <small dir="auto">{item.note}</small>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {materials.length > 0 && (
        <section className="pg__block">
          <div className="pg__heading-row">
            <h4 className="pg__heading">{hasSteps ? t.guideMaterials : t.guideMaterialsAll}</h4>
            {hasSteps && <span className="pg__count">{t.guideReady(ready.size, materials.length)}</span>}
          </div>
          <ul className="pg__materials">
            {materials.map((item, i) => {
              const content = (
                <>
                  {item.imageUrl && <img src={item.imageUrl} alt="" loading="lazy" decoding="async" />}
                  <span className="pg-material__text">
                    <span className="pg-material__name" dir="auto">
                      {item.text}
                    </span>
                    {item.note && (
                      <small dir="auto">{item.note}</small>
                    )}
                  </span>
                </>
              );
              return (
                <li key={i}>
                  {hasSteps ? (
                    // With a procedure below, materials are a checklist to prepare before starting.
                    <button type="button" className={`pg-material${ready.has(i) ? ' pg-material--ready' : ''}`} aria-pressed={ready.has(i)} onClick={() => toggle(i)}>
                      {content}
                      <span className="pg-material__check" aria-hidden="true">
                        <svg viewBox="0 0 24 24">
                          <path d="m5 12.500 4.500 4.500L19 7.500" />
                        </svg>
                      </span>
                    </button>
                  ) : (
                    <div className="pg-material">{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {hasSteps && step && (
        <section className="pg__block">
          <h4 className="pg__heading">{t.guideSteps}</h4>
          <ol className="pg__track">
            {steps.map((_, i) => (
              <li key={i} className={i < stepIndex ? 'pg__dot-item pg__dot-item--done' : 'pg__dot-item'}>
                <button
                  type="button"
                  className={`pg__dot${i === stepIndex ? ' pg__dot--current' : ''}`}
                  aria-current={i === stepIndex ? 'step' : undefined}
                  aria-label={t.stepLabel(i + 1)}
                  onClick={() => setStepIndex(i)}
                >
                  {i + 1}
                </button>
              </li>
            ))}
          </ol>

          <div key={stepIndex} className="pg-step" aria-live="polite">
            {step.imageUrl && (
              <button
                type="button"
                className="pg-step__image"
                aria-label={`${t.enlargeImage}: ${step.text}`}
                onClick={() => onOpenImage({ url: step.imageUrl!, alt: step.text })}
              >
                <img src={step.imageUrl} alt={step.text} />
              </button>
            )}
            <div className="pg-step__body">
              <p className="pg-step__label">{t.guideStepOf(stepIndex + 1, steps.length)}</p>
              <p className="pg-step__text" dir="auto">
                {step.text}
              </p>
              <div className="pg-step__nav">
                <button type="button" className="pg-step__btn" disabled={stepIndex === 0} onClick={() => setStepIndex((i) => i - 1)}>
                  {t.guidePrev}
                </button>
                <button
                  type="button"
                  className="pg-step__btn pg-step__btn--primary"
                  disabled={stepIndex === steps.length - 1}
                  onClick={() => setStepIndex((i) => i + 1)}
                >
                  {t.guideNext}
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {guide.notes.length > 0 && (
        <ul className="pg__notes">
          {guide.notes.map((note, i) => (
            <li key={i} className="pg-note" dir="auto">
              {note}
            </li>
          ))}
        </ul>
      )}

      {guide.warning && (
        <p className="pg-warning" dir="auto">
          {guide.warning}
        </p>
      )}
    </div>
  );
}
