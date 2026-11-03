import { useEffect, useRef } from 'react';
import { A } from '../strings';
import { Icon } from './Icon';

export interface StepItem {
  key: number;
  text: string;
}

let nextKey = 1;
export const makeStep = (text = ''): StepItem => ({ key: nextKey++, text });

interface Props {
  steps: StepItem[];
  onChange: (steps: StepItem[]) => void;
  invalid?: boolean;
}

/** Numbered step list. Enter adds a step below; Backspace in an empty step removes it. */
export function StepsEditor({ steps, onChange, invalid }: Props) {
  const refs = useRef(new Map<number, HTMLTextAreaElement>());
  const focusKey = useRef<number | null>(null);

  useEffect(() => {
    if (focusKey.current === null) return;
    refs.current.get(focusKey.current)?.focus();
    focusKey.current = null;
  });

  const set = (i: number, text: string) => onChange(steps.map((s, j) => (j === i ? { ...s, text } : s)));
  const insertAfter = (i: number) => {
    const step = makeStep();
    focusKey.current = step.key;
    onChange([...steps.slice(0, i + 1), step, ...steps.slice(i + 1)]);
  };
  const remove = (i: number) => {
    if (steps.length === 1) return onChange([makeStep()]);
    focusKey.current = steps[Math.max(0, i - 1)].key;
    onChange(steps.filter((_, j) => j !== i));
  };
  const move = (i: number, dir: -1 | 1) => {
    const next = [...steps];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    onChange(next);
  };

  return (
    <div className="steps-editor">
      <ol className="steps-editor__list">
        {steps.map((step, i) => (
          <li key={step.key} className="steps-editor__row">
            <span className="steps-editor__num" aria-hidden="true">
              {i + 1}
            </span>
            <textarea
              ref={(el) => {
                if (el) refs.current.set(step.key, el);
                else refs.current.delete(step.key);
              }}
              className="adm-textarea steps-editor__input"
              dir="auto"
              rows={1}
              value={step.text}
              placeholder={A.stepPlaceholder(i + 1)}
              aria-label={A.stepPlaceholder(i + 1)}
              aria-invalid={invalid && !step.text.trim() ? true : undefined}
              onChange={(e) => set(i, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  insertAfter(i);
                } else if (e.key === 'Backspace' && !step.text && steps.length > 1) {
                  e.preventDefault();
                  remove(i);
                }
              }}
            />
            <span className="steps-editor__actions">
              <button type="button" className="adm-icon-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label={A.moveUp}>
                <Icon name="up" />
              </button>
              <button
                type="button"
                className="adm-icon-btn"
                onClick={() => move(i, 1)}
                disabled={i === steps.length - 1}
                aria-label={A.moveDown}
              >
                <Icon name="down" />
              </button>
              <button type="button" className="adm-icon-btn adm-icon-btn--danger" onClick={() => remove(i)} aria-label={A.removeStep}>
                <Icon name="close" />
              </button>
            </span>
          </li>
        ))}
      </ol>
      <button type="button" className="steps-editor__add" onClick={() => insertAfter(steps.length - 1)}>
        <Icon name="plus" />
        {A.addStep}
      </button>
      <p className="adm-hint">{A.stepsHint}</p>
    </div>
  );
}
