import { memo } from 'react';
import { useI18n } from '../../i18n/I18nContext';
import type { ExplorerTarget, Section, TutorialImage } from '../../types/tutorial';
import { sectionDomId } from '../../utils/dom';
import { QuestionAccordion } from '../QuestionAccordion/QuestionAccordion';
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
  const { t } = useI18n();
  const headingId = `${sectionDomId(section.id)}-heading`;

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
          <p className="tutorial-section__meta">{(section.questions.every((q) => q.answerType === 'video') ? t.videosCount : t.questionsCount)(section.questions.length)}</p>
        </div>
      </header>

      <div className="tutorial-section__questions">
        {section.questions.map((question, i) => (
          <QuestionAccordion
            key={question.id}
            question={question}
            number={i + 1}
            isOpen={openIds.has(question.id)}
            isHighlighted={highlightedId === question.id}
            explorerTarget={explorerTarget?.questionId === question.id ? explorerTarget : null}
            onToggle={onToggle}
            onOpenImage={onOpenImage}
          />
        ))}
      </div>
    </section>
  );
});
