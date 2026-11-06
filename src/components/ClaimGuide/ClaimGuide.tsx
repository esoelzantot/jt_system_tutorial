import { useState } from 'react';
import { useI18n } from '../../i18n/I18nContext';
import type { GuideItem, Question } from '../../types/tutorial';
import { BidiText } from '../BidiText/BidiText';
import './ClaimGuide.css';

interface Props {
  /** A question with answerType "claim". */
  question: Question;
}

function CheckList({ items, prefix, checked, onToggle }: { items: GuideItem[]; prefix: string; checked: ReadonlySet<string>; onToggle: (id: string) => void }) {
  return (
    <ul className="cg__list">
      {items.map((item, i) => {
        const id = `${prefix}${i}`;
        const isChecked = checked.has(id);
        return (
          <li key={id}>
            <button type="button" className={`cg-item${isChecked ? ' cg-item--checked' : ''}`} aria-pressed={isChecked} onClick={() => onToggle(id)}>
              <span className="cg-item__check" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="m5 12.500 4.500 4.500L19 7.500" />
                </svg>
              </span>
              <span className="cg-item__text">
                <span className="cg-item__title" dir="auto">
                  <BidiText text={item.text} />
                </span>
                {item.note && <small dir="auto">{item.note}</small>}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Answer of a claim type: conditions and documents as a checklist around the fixed action. */
export function ClaimGuide({ question }: Props) {
  const { t } = useI18n();
  const claim = question.claim;
  const [checked, setChecked] = useState<ReadonlySet<string>>(() => new Set());

  if (!claim) return null;

  // With "any term", the terms count as one point: ticking one of them completes it.
  const termCount = claim.anyTerm ? Math.min(claim.terms.length, 1) : claim.terms.length;
  const termsTicked = claim.terms.filter((_, i) => checked.has(`t${i}`)).length;
  const total = termCount + claim.documents.length;
  const done = Math.min(termsTicked, termCount) + (checked.size - termsTicked);
  const toggle = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="cg">
      {question.answerText && (
        <p className="cg__intro" dir="auto">
          {question.answerText}
        </p>
      )}

      <div className="cg__progress">
        <div className="cg__progress-row">
          <span>{t.claimTick}</span>
          <strong>{t.guideReady(done, total)}</strong>
        </div>
        <div className="cg__bar" aria-hidden="true">
          <span style={{ inlineSize: `${total ? (done / total) * 100 : 0}%` }} />
        </div>
      </div>

      <ol className="cg__flow">
        <li className="cg-stage">
          <span className="cg-stage__number" aria-hidden="true">
            1
          </span>
          <div className="cg-stage__body">
            <h4 className="cg-stage__title">{t.claimTermsTitle}</h4>
            <p className="cg-stage__hint">{claim.anyTerm ? t.claimTermsAnyHint : t.claimTermsHint}</p>
            <CheckList items={claim.terms} prefix="t" checked={checked} onToggle={toggle} />
          </div>
        </li>

        <li className="cg-stage">
          <span className="cg-stage__number" aria-hidden="true">
            2
          </span>
          <div className="cg-stage__body">
            <h4 className="cg-stage__title">{t.claimActionTitle}</h4>
            <div className="cg-action">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M21 15.500v3a2 2 0 0 1-2.200 2A17 17 0 0 1 3.500 5.200 2 2 0 0 1 5.500 3h3a1.500 1.500 0 0 1 1.500 1.300l.4 2.500a1.500 1.500 0 0 1-.5 1.400L8.700 9.300a14 14 0 0 0 6 6l1.100-1.200a1.500 1.500 0 0 1 1.400-.5l2.500.4a1.500 1.500 0 0 1 1.300 1.500z" />
              </svg>
              <span>
                <strong><BidiText text={t.claimAction} /></strong>
                <small>{t.claimActionHint}</small>
              </span>
            </div>
          </div>
        </li>

        <li className="cg-stage">
          <span className="cg-stage__number" aria-hidden="true">
            3
          </span>
          <div className="cg-stage__body">
            <h4 className="cg-stage__title">{t.claimDocsTitle}</h4>
            <p className="cg-stage__hint">{t.claimDocsHint}</p>
            <CheckList items={claim.documents} prefix="d" checked={checked} onToggle={toggle} />
          </div>
        </li>
      </ol>

      {total > 0 && done === total && (
        <p className="cg__ready" role="status">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m5 12.500 4.500 4.500L19 7.500" />
          </svg>
          {t.claimReady}
        </p>
      )}
    </div>
  );
}
