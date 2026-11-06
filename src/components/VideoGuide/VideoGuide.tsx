import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../../i18n/I18nContext';
import type { Question } from '../../types/tutorial';
import { driveEmbedUrl } from '../../utils/driveVideo';
import './VideoGuide.css';

interface Props {
  /** A question with answerType "video". */
  question: Question;
  isOpen: boolean;
}

/**
 * Drive's player breaks when it is laid out narrower than this: its picture is cropped and its
 * controls land in the wrong place. So on small screens it keeps this width and is scaled down.
 */
const PLAYER_WIDTH = 640;

/** Answer of a video guide: the video in a window-style frame, a short description and a download link. */
export function VideoGuide({ question, isOpen }: Props) {
  const { t } = useI18n();
  const screenRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [loaded, setLoaded] = useState(false);
  const link = question.videoUrl ?? '';
  const embedUrl = driveEmbedUrl(link);

  // The player is removed on close, so it loads again the next time.
  useEffect(() => {
    if (!isOpen) setLoaded(false);
  }, [isOpen]);

  useEffect(() => {
    const screen = screenRef.current;
    if (!screen || !isOpen) return;
    const fit = () => setScale(Math.min(1, screen.clientWidth / PLAYER_WIDTH));
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(screen);
    return () => observer.disconnect();
  }, [isOpen, embedUrl]);

  if (!embedUrl) return null;

  const playerSize =
    scale < 1
      ? { width: PLAYER_WIDTH, height: (PLAYER_WIDTH * 9) / 16, transform: `scale(${scale})` }
      : { width: '100%', height: '100%' };

  return (
    <div className="vg">
      <div className="vg__window">
        <div className="vg__bar" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div ref={screenRef} className="vg__screen">
          {/* Only while open: this avoids loading every player, and closing the card stops the video. */}
          {isOpen && (
            <iframe src={embedUrl} title={question.title} style={playerSize} allow="autoplay; fullscreen" allowFullScreen onLoad={() => setLoaded(true)} />
          )}
          {!loaded && (
            <span className="vg__loading" aria-hidden="true">
              <span />
            </span>
          )}
        </div>
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
