import { useI18n } from '../../i18n/I18nContext';
import type { Question } from '../../types/tutorial';
import { driveEmbedUrl } from '../../utils/driveVideo';
import './VideoGuide.css';

interface Props {
  /** A question with answerType "video". */
  question: Question;
  isOpen: boolean;
}

/** Answer of a video guide: the player, a short description and a link to download the video. */
export function VideoGuide({ question, isOpen }: Props) {
  const { t } = useI18n();
  const link = question.videoUrl ?? '';
  const embedUrl = driveEmbedUrl(link);

  if (!embedUrl) return null;

  return (
    <div className="vg">
      <div className="vg__frame">
        {/* Only while open: this avoids loading every player, and closing the card stops the video. */}
        {isOpen && <iframe src={embedUrl} title={question.title} allow="autoplay; fullscreen" allowFullScreen />}
      </div>

      {question.answerText && (
        <p className="vg__description" dir="auto">
          {question.answerText}
        </p>
      )}

      <div className="vg__actions">
        <a className="vg__download" href={link} target="_blank" rel="noopener noreferrer">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 4v12M7 11l5 5 5-5M4 20h16" />
          </svg>
          {t.videoDownload}
        </a>
        <small>{t.videoHint}</small>
      </div>
    </div>
  );
}
