import { memo } from 'react';
import { UI } from '../../constants/ui';
import type { ExplorerTarget, Section, TutorialImage } from '../../types/tutorial';
import { sectionDomId } from '../../utils/dom';
import { QuestionAccordion } from '../QuestionAccordion/QuestionAccordion';
import { TicketExplorer } from '../TicketExplorer/TicketExplorer';
import './TutorialSection.css';

interface Props {
  section: Section;
  index: number;
  openIds: ReadonlySet<string>;
  highlightedId: string | null;
  explorerTarget: ExplorerTarget | null;
  onToggle: (questionId: string) => void;
  onOpenImage: (image: TutorialImage) => void;
}

export const TutorialSection = memo(function TutorialSection({
  section,
  index,
  openIds,
  highlightedId,
  explorerTarget,
  onToggle,
  onOpenImage,
}: Props) {
  const headingId = `${sectionDomId(section.id)}-heading`;
  const mainTypes = section.questions.filter((q) => q.answerType === 'types');
  const questions = section.questions.filter((q) => q.answerType !== 'types');
  const target = mainTypes.some((q) => q.id === explorerTarget?.questionId) ? explorerTarget : null;

  return (
    <section id={sectionDomId(section.id)} className="tutorial-section" aria-labelledby={headingId}>
      <header className="tutorial-section__header">
        <span className="tutorial-section__index" aria-hidden="true">
          {String(index + 1).padStart(2, '0')}
        </span>
        <div>
          <h2 id={headingId} className="tutorial-section__title" dir="auto">
            {section.title}
          </h2>
          <p className="tutorial-section__meta">{UI.questionsCount(section.questions.length)}</p>
        </div>
      </header>

      {mainTypes.length > 0 && (
        <TicketExplorer mainTypes={mainTypes} target={target} highlightedId={highlightedId} onOpenImage={onOpenImage} />
      )}

      <div className="tutorial-section__questions">
        {questions.map((question, i) => (
          <QuestionAccordion
            key={question.id}
            question={question}
            number={i + 1}
            isOpen={openIds.has(question.id)}
            isHighlighted={highlightedId === question.id}
            onToggle={onToggle}
            onOpenImage={onOpenImage}
          />
        ))}
      </div>
    </section>
  );
});
