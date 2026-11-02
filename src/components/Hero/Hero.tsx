import { memo, useMemo } from 'react';
import { UI } from '../../constants/ui';
import type { Section } from '../../types/tutorial';
import { prefersReducedMotion, sectionDomId } from '../../utils/dom';
import './Hero.css';

interface Props {
  sections: Section[];
  onSelectSection: (sectionId: string) => void;
}

/** Landing block: headline, live content stats and a tile per section. */
export const Hero = memo(function Hero({ sections, onSelectSection }: Props) {
  const stats = useMemo(() => {
    const questions = sections.flatMap((s) => s.questions);
    return [
      { value: sections.length, label: UI.statSections },
      { value: questions.length, label: UI.statQuestions },
      { value: questions.filter((q) => q.image).length, label: UI.statImages },
    ];
  }, [sections]);

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero__backdrop" aria-hidden="true">
        <span className="hero__blob hero__blob--one" />
        <span className="hero__blob hero__blob--two" />
      </div>

      <div className="container">
        <div className="hero__top">
          <div className="hero__copy">
            <span className="hero__eyebrow">
              <span className="hero__pulse" aria-hidden="true" />
              {UI.heroEyebrow}
            </span>
            <h2 id="hero-title" className="hero__title">
              {UI.heroTitleLead} <span className="hero__accent">{UI.heroTitleAccent}</span>
            </h2>
            <p className="hero__text">{UI.heroText}</p>

            <dl className="hero__stats">
              {stats.map((stat) => (
                <div key={stat.label} className="hero__stat">
                  <dt>{stat.label}</dt>
                  <dd>{stat.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <RouteIllustration />
        </div>

        <h3 className="hero__browse">{UI.browseSections}</h3>
        <ol className="hero__tiles">
          {sections.map((section, index) => (
            <li key={section.id}>
              <a
                className="tile"
                href={`#${sectionDomId(section.id)}`}
                onClick={(e) => {
                  e.preventDefault();
                  onSelectSection(section.id);
                }}
              >
                <span className="tile__index" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="tile__title" dir="auto">
                  {section.title}
                </span>
                <span className="tile__meta">{UI.questionsCount(section.questions.length)}</span>
                <svg className="tile__arrow" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M19 12H5m6-6-6 6 6 6" />
                </svg>
              </a>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
});

const ROUTE = 'M58 232 C 112 118, 214 274, 300 92';

/** Decorative "parcel on its way" map card. */
function RouteIllustration() {
  const animate = !prefersReducedMotion();

  return (
    <div className="route" aria-hidden="true">
      <svg viewBox="0 0 360 300" className="route__svg">
        <defs>
          <pattern id="route-dots" width="18" height="18" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.4" fill="#e7d9d6" />
          </pattern>
          <linearGradient id="route-line" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#ff6a3d" />
            <stop offset="1" stopColor="#d4141b" />
          </linearGradient>
        </defs>

        <rect width="360" height="300" fill="url(#route-dots)" />
        <path d={ROUTE} fill="none" stroke="#fde3df" strokeWidth="16" strokeLinecap="round" />
        <path
          className="route__dash"
          d={ROUTE}
          fill="none"
          stroke="url(#route-line)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="2 12"
        />

        {/* origin */}
        <circle cx="58" cy="232" r="16" fill="#fff" stroke="#f1d6d2" strokeWidth="2" />
        <circle cx="58" cy="232" r="7" fill="#d4141b" />

        {/* destination pin */}
        <g transform="translate(300 92)">
          <circle r="24" fill="#d4141b" opacity="0.12" className="route__ping" />
          <path d="M0 6 C -14 -8 -14 -30 0 -30 C 14 -30 14 -8 0 6 Z" fill="#d4141b" />
          <circle cy="-18" r="5.5" fill="#fff" />
        </g>

        {/* parcel travelling along the route */}
        <g>
          <g transform="translate(-13 -13)">
            <rect width="26" height="26" rx="6" fill="#c98a55" />
            <rect x="10.5" width="5" height="26" fill="#f3d3a8" />
            <rect y="9" width="26" height="3" fill="#b0743f" opacity="0.5" />
          </g>
          {animate && <animateMotion dur="6s" repeatCount="indefinite" rotate="0" path={ROUTE} keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.45 0 0.55 1" />}
          {!animate && <animateMotion dur="0.01s" fill="freeze" path={ROUTE} keyPoints="0.55;0.55" keyTimes="0;1" />}
        </g>
      </svg>

      <div className="route__chip route__chip--status">
        <span className="route__dot" />
        في الطريق
      </div>
      <div className="route__chip route__chip--done">
        <svg viewBox="0 0 24 24">
          <path d="m5 12.5 4.5 4.5L19 7.5" />
        </svg>
        تم التسليم
      </div>
    </div>
  );
}
