import type { Question } from '../../types/tutorial';
import './AnswerContent.css';

interface Props {
  question: Question;
}

/** Renders an answer as a paragraph or as numbered steps, according to its type. */
export function AnswerContent({ question }: Props) {
  if (question.answerType === 'steps') {
    return (
      <div className="answer">
        {question.answerText && (
          <p className="answer__intro" dir="auto">
            {question.answerText}
          </p>
        )}
        <ol className="answer__steps">
          {question.steps.map((step, i) => (
            <li key={i} className="answer__step">
              <span className="answer__step-number" aria-hidden="true">
                {i + 1}
              </span>
              <span className="answer__step-text" dir="auto">
                {step}
              </span>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  return (
    <div className="answer">
      {question.answerText.split(/\n{2,}/).map((paragraph, i) => (
        <p key={i} className="answer__paragraph" dir="auto">
          {paragraph}
        </p>
      ))}
    </div>
  );
}
