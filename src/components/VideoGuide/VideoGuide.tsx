import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../../i18n/I18nContext';
import type { Question } from '../../types/tutorial';
import { driveEmbedUrl, drivePosterUrl } from '../../utils/driveVideo';
import './VideoGuide.css';

interface Props {
  /** A question with answerType "video". */
  question: Question;
  isOpen: boolean;
}

/** Below this width Drive's player crops its picture, so on small screens it keeps this width and is scaled down. */
const DRIVE_PLAYER_WIDTH = 640;

/**
 * Answer of a video guide: the video in a window-style frame, a short description and a download link.
 * The site's server streams the file to the browser's own player, which works on phones. If that fails
 * (very large file, or too many downloads today), Drive's player takes over.
 */
export function VideoGuide({ question, isOpen }: Props) {
  const { t } = useI18n();
  const screenRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scale, setScale] = useState(1);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const link = question.videoUrl ?? '';
  const embedUrl = driveEmbedUrl(link);

  // The player is removed on close, which stops the video, so it starts over the next time.
  useEffect(() => {
    if (isOpen) return;
    setStarted(false);
    setPlaying(false);
  }, [isOpen]);

  useEffect(() => {
    const screen = screenRef.current;
    if (!screen || !isOpen || !failed) return;
    const fit = () => setScale(Math.min(1, screen.clientWidth / DRIVE_PLAYER_WIDTH));
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(screen);
    return () => observer.disconnect();
  }, [isOpen, failed]);

  if (!embedUrl) return null;

  const start = () => {
    setStarted(true);
    // If the browser refuses, its own controls are showing by now and can start the video.
    videoRef.current?.play().catch(() => {});
  };

  const drivePlayerSize =
    scale < 1
      ? { width: DRIVE_PLAYER_WIDTH, height: (DRIVE_PLAYER_WIDTH * 9) / 16, transform: `scale(${scale})` }
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
          {isOpen &&
            (failed ? (
              <iframe src={embedUrl} title={question.title} style={drivePlayerSize} allow="autoplay; fullscreen" allowFullScreen />
            ) : (
              <video
                ref={videoRef}
                src={`/api/video?id=${encodeURIComponent(question.id)}`}
                poster={drivePosterUrl(link) ?? undefined}
                controls={started}
                controlsList="nodownload"
                playsInline
                preload="none"
                aria-label={question.title}
                onPlaying={() => setPlaying(true)}
                onError={() => setFailed(true)}
              />
            ))}
          {isOpen && !failed && !playing && (
            <button type="button" className={`vg__play${started ? ' vg__play--loading' : ''}`} aria-label={`${t.videoPlay}: ${question.title}`} disabled={started} onClick={start}>
              <span>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 5l11 7-11 7z" />
                </svg>
              </span>
            </button>
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
