import { useMemo, useState } from 'react';
import logoUrl from '../../assets/brand/jt-express-logo.png';
import mascotUrl from '../../assets/brand/jt-rabbit.webp';
import { TRANSLATION_LANGS } from '../../i18n/config';
import { translationStatus } from '../../i18n/localizeContent';
import type { SectionTranslation, Translations } from '../../types/tutorial';
import { toDisplayableImageUrl } from '../../utils/imageUrl';
import { findRanges, normalizeWithMap, tokenize } from '../../utils/textSearch';
import { Highlight } from '../../components/Highlight/Highlight';
import { useAdminContent } from '../hooks/useAdminContent';
import { signOutAdmin } from '../services/adminAuth';
import {
  createSection,
  deleteQuestion,
  deleteSection,
  saveOrder,
  saveQuestion,
  updateSection,
} from '../services/adminContent';
import { A } from '../strings';
import type { AdminQuestion, AdminSection, QuestionInput } from '../types';
import { useFeedback } from './feedback';
import { Icon } from './Icon';
import { QuestionEditor } from './QuestionEditor';
import { SectionEditor } from './SectionEditor';
import './Dashboard.css';

type Editing =
  | { kind: 'section'; section: AdminSection | null }
  | { kind: 'question'; question: AdminQuestion | null }
  | null;

const move = <T,>(list: T[], i: number, dir: -1 | 1) => {
  const next = [...list];
  [next[i], next[i + dir]] = [next[i + dir], next[i]];
  return next;
};

export function Dashboard({ email }: { email: string }) {
  const { status, sections, questions, reload } = useAdminContent();
  const { toast, confirm } = useFeedback();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Editing>(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');

  const selected = sections.find((s) => s.id === selectedId) ?? sections[0] ?? null;
  const sectionIds = useMemo(() => new Set(sections.map((s) => s.id)), [sections]);
  const countBySection = useMemo(() => {
    const map = new Map<string, number>();
    for (const q of questions) map.set(q.sectionId, (map.get(q.sectionId) ?? 0) + 1);
    return map;
  }, [questions]);
  const sectionQuestions = selected ? questions.filter((q) => q.sectionId === selected.id) : [];
  const orphans = questions.filter((q) => !sectionIds.has(q.sectionId));

  const tokens = useMemo(() => tokenize(query), [query]);
  const matches = useMemo(() => {
    if (tokens.length === 0) return [];
    return questions.filter((q) => {
      const subtypes = q.subtypes.flatMap((s) => [s.title, s.titleEn, s.meaning, s.whenToUse]);
      const guide = q.guide
        ? [...q.guide.examples, ...q.guide.materials, ...q.guide.steps].map((i) => i.text).concat(q.guide.notes, q.guide.warning)
        : [];
      const claim = q.claim ? [...q.claim.terms, ...q.claim.documents].map((i) => i.text).concat(q.claim.deadline) : [];
      const haystack = normalizeWithMap([q.title, q.answerText, ...q.steps, ...subtypes, ...guide, ...claim].join(' ')).value;
      return tokens.every((t) => haystack.includes(t));
    });
  }, [questions, tokens]);

  const stats = [
    { label: A.statSections, value: sections.length, icon: 'folder' as const },
    { label: A.statQuestions, value: questions.length, icon: 'paragraph' as const },
    { label: A.statImages, value: questions.filter((q) => q.imageUrl).length, icon: 'image' as const },
    { label: A.statEmpty, value: sections.filter((s) => !countBySection.get(s.id)).length, icon: 'alert' as const },
  ];

  /** Runs a write, refreshes the data and reports the outcome. */
  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await action();
      await reload();
      toast(success);
      return true;
    } catch (error) {
      console.error(error);
      toast(A.actionFailed, 'error');
      await reload().catch(() => {});
      return false;
    } finally {
      setBusy(false);
    }
  };

  const onSaveSection = async (title: string, translations: Translations<SectionTranslation>) => {
    const target = editing?.kind === 'section' ? editing.section : null;
    const ok = await run(() => (target ? updateSection(target, title, translations) : createSection(title, translations, sections)), A.savedSection);
    if (ok) setEditing(null);
  };

  const onDeleteSection = async (section: AdminSection) => {
    const n = countBySection.get(section.id) ?? 0;
    const yes = await confirm({
      title: A.confirmDeleteSection,
      text: A.confirmDeleteSectionText(section.title, n),
      confirmLabel: A.delete,
      danger: true,
    });
    if (yes) await run(() => deleteSection(section.id, questions), A.deletedSection);
  };

  const onSaveQuestion = async (input: QuestionInput) => {
    const target = editing?.kind === 'question' ? editing.question : null;
    const ok = await run(() => saveQuestion(input, questions, target ?? undefined), A.savedQuestion);
    if (ok) {
      setEditing(null);
      setSelectedId(input.sectionId);
    }
  };

  const onDeleteQuestion = async (q: AdminQuestion) => {
    const yes = await confirm({
      title: A.confirmDeleteQuestion,
      text: A.confirmDeleteQuestionText(q.title),
      confirmLabel: A.delete,
      danger: true,
    });
    if (yes) await run(() => deleteQuestion(q.id), A.deletedQuestion);
  };

  const sectionTitle = (id: string) => sections.find((s) => s.id === id)?.title ?? '—';

  const renderQuestion = (q: AdminQuestion, index: number, list: AdminQuestion[], opts: { reorder: boolean; showSection?: boolean }) => {
    const titleNorm = normalizeWithMap(q.title);
    return (
      <li key={q.id} className="dq">
        <span className="dq__num">{index + 1}</span>
        <button type="button" className="dq__main" onClick={() => setEditing({ kind: 'question', question: q })}>
          {opts.showSection && <span className="dq__section">{sectionTitle(q.sectionId)}</span>}
          <span className="dq__title" dir="auto">
            <Highlight text={q.title} ranges={tokens.length ? findRanges(titleNorm, tokens) : []} />
          </span>
          <span className="dq__tags">
            <span className={`dq__tag dq__tag--${q.answerType}`}>
              <Icon name={q.answerType === 'steps' ? 'steps' : q.answerType === 'types' ? 'cards' : q.answerType === 'guide' ? 'package' : q.answerType === 'claim' ? 'check' : 'paragraph'} />
              {q.answerType === 'steps'
                ? `${q.steps.length} ${A.typeSteps}`
                : q.answerType === 'types'
                  ? A.subtypesCount(q.subtypes.length)
                  : q.answerType === 'guide'
                    ? A.typeGuide
                    : q.answerType === 'claim'
                      ? A.typeClaim
                      : A.typeParagraph}
            </span>
            {q.imageUrl && (
              <span className="dq__tag dq__tag--image">
                <Icon name="image" />
                {A.statImages}
              </span>
            )}
            {TRANSLATION_LANGS.map((lang) => {
              const status = translationStatus(q, lang);
              return (
                <span
                  key={lang}
                  className={`dq__tag dq__tag--lang-${status}`}
                  title={{ complete: A.statusComplete, partial: A.statusPartial, none: A.statusNone }[status]}
                >
                  {lang === 'en' ? 'EN' : '中文'}
                </span>
              );
            })}
          </span>
        </button>
        {q.imageUrl && <img className="dq__thumb" src={toDisplayableImageUrl(q.imageUrl)} alt="" loading="lazy" />}
        <span className="dq__actions">
          {opts.reorder && (
            <>
              <button
                type="button"
                className="adm-icon-btn"
                aria-label={A.moveUp}
                disabled={busy || index === 0}
                onClick={() => run(() => saveOrder('questions', move(list, index, -1).map((x) => x.id)), A.reordered)}
              >
                <Icon name="up" />
              </button>
              <button
                type="button"
                className="adm-icon-btn"
                aria-label={A.moveDown}
                disabled={busy || index === list.length - 1}
                onClick={() => run(() => saveOrder('questions', move(list, index, 1).map((x) => x.id)), A.reordered)}
              >
                <Icon name="down" />
              </button>
            </>
          )}
          <button type="button" className="adm-icon-btn" aria-label={A.edit} onClick={() => setEditing({ kind: 'question', question: q })}>
            <Icon name="edit" />
          </button>
          <button type="button" className="adm-icon-btn adm-icon-btn--danger" aria-label={A.delete} disabled={busy} onClick={() => onDeleteQuestion(q)}>
            <Icon name="trash" />
          </button>
        </span>
      </li>
    );
  };

  return (
    <div className="dash">
      <header className="dash__topbar">
        <div className="dash__brand">
          <img src={logoUrl} alt="J&T Express" width={359} height={81} />
          <span className="dash__badge">{A.dashboard}</span>
        </div>
        <div className="dash__account">
          <a className="adm-btn adm-btn--ghost" href="/" target="_blank" rel="noreferrer">
            <Icon name="external" />
            <span className="dash__hide-sm">{A.viewSite}</span>
          </a>
          <span className="dash__user" title={email}>
            <span className="dash__avatar" aria-hidden="true">
              {email.charAt(0).toUpperCase()}
            </span>
            <bdi className="dash__hide-sm">{email}</bdi>
          </span>
          <button type="button" className="adm-icon-btn" onClick={() => void signOutAdmin()} aria-label={A.signOut} title={A.signOut}>
            <Icon name="logout" />
          </button>
        </div>
      </header>

      <div className="dash__container">
        <section className="dash__intro">
          <div>
            <h1 className="dash__title">{A.greeting}</h1>
            <p className="dash__subtitle">{A.greetingText}</p>
          </div>
          <img className="dash__mascot" src={mascotUrl} alt="" aria-hidden="true" width={156} height={216} />
        </section>

        <dl className="dash__stats">
          {stats.map((s) => (
            <div key={s.label} className="dash__stat">
              <span className="dash__stat-icon">
                <Icon name={s.icon} />
              </span>
              <dt>{s.label}</dt>
              <dd>{status === 'loading' ? '–' : s.value}</dd>
            </div>
          ))}
        </dl>

        {status === 'error' ? (
          <div className="dash__empty">
            <p className="dash__empty-title">{A.loadError}</p>
            <button type="button" className="adm-btn adm-btn--primary" onClick={() => reload().catch(() => {})}>
              {A.retry}
            </button>
          </div>
        ) : (
          <div className="dash__grid">
            {/* ---- Sections ---- */}
            <aside className="dpanel dpanel--sections">
              <div className="dpanel__head">
                <h2 className="dpanel__title">{A.sections}</h2>
                <button type="button" className="adm-btn adm-btn--primary dpanel__add" onClick={() => setEditing({ kind: 'section', section: null })}>
                  <Icon name="plus" />
                  {A.addSection}
                </button>
              </div>

              {status === 'loading' ? (
                <div className="dash__skeleton" />
              ) : sections.length === 0 ? (
                <p className="adm-hint dpanel__note">{A.noSectionsHint}</p>
              ) : (
                <ol className="ds-list">
                  {sections.map((s, i) => {
                    const count = countBySection.get(s.id) ?? 0;
                    const active = s.id === selected?.id;
                    return (
                      <li key={s.id} className={`ds${active ? ' ds--active' : ''}`}>
                        <button type="button" className="ds__main" aria-current={active || undefined} onClick={() => setSelectedId(s.id)}>
                          <span className="ds__num">{i + 1}</span>
                          <span className="ds__text">
                            <span className="ds__title" dir="auto">
                              {s.title}
                            </span>
                            <span className="ds__meta">
                              {count} {A.statQuestions}
                              {count === 0 && <span className="ds__hidden"> · {A.hiddenOnSite}</span>}
                            </span>
                          </span>
                        </button>
                        <span className="ds__actions">
                          <button
                            type="button"
                            className="adm-icon-btn"
                            aria-label={A.moveUp}
                            disabled={busy || i === 0}
                            onClick={() => run(() => saveOrder('sections', move(sections, i, -1).map((x) => x.id)), A.reordered)}
                          >
                            <Icon name="up" />
                          </button>
                          <button
                            type="button"
                            className="adm-icon-btn"
                            aria-label={A.moveDown}
                            disabled={busy || i === sections.length - 1}
                            onClick={() => run(() => saveOrder('sections', move(sections, i, 1).map((x) => x.id)), A.reordered)}
                          >
                            <Icon name="down" />
                          </button>
                          <button type="button" className="adm-icon-btn" aria-label={A.edit} onClick={() => setEditing({ kind: 'section', section: s })}>
                            <Icon name="edit" />
                          </button>
                          <button
                            type="button"
                            className="adm-icon-btn adm-icon-btn--danger"
                            aria-label={A.delete}
                            disabled={busy}
                            onClick={() => onDeleteSection(s)}
                          >
                            <Icon name="trash" />
                          </button>
                        </span>
                      </li>
                    );
                  })}
                </ol>
              )}
            </aside>

            {/* ---- Questions ---- */}
            <section className="dpanel dpanel--questions">
              <div className="dpanel__head dpanel__head--questions">
                <div className="dash__search">
                  <Icon name="search" />
                  <input
                    className="adm-input"
                    type="search"
                    dir="auto"
                    placeholder={A.searchAll}
                    aria-label={A.searchAll}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="adm-btn adm-btn--primary dpanel__add"
                  disabled={sections.length === 0}
                  onClick={() => setEditing({ kind: 'question', question: null })}
                >
                  <Icon name="plus" />
                  {A.addQuestion}
                </button>
              </div>

              {tokens.length > 0 ? (
                <>
                  <p className="dpanel__caption">{A.searchResults(matches.length)}</p>
                  {matches.length === 0 ? (
                    <div className="dash__empty dash__empty--inline">
                      <p className="dash__empty-title">{A.noMatches}</p>
                    </div>
                  ) : (
                    <ol className="dq-list">{matches.map((q, i, list) => renderQuestion(q, i, list, { reorder: false, showSection: true }))}</ol>
                  )}
                </>
              ) : (
                <>
                  {orphans.length > 0 && (
                    <div className="dash__orphans">
                      <p className="dash__orphans-title">
                        <Icon name="alert" />
                        {A.orphansTitle}
                      </p>
                      <p className="adm-hint">{A.orphansHint}</p>
                      <ol className="dq-list">{orphans.map((q, i, list) => renderQuestion(q, i, list, { reorder: false }))}</ol>
                    </div>
                  )}

                  {selected && (
                    <div className="dpanel__section-head">
                      <p className="dpanel__caption">{A.questionsIn}</p>
                      <h2 className="dpanel__title dpanel__title--lg" dir="auto">
                        {selected.title}
                      </h2>
                    </div>
                  )}

                  {status === 'loading' ? (
                    <div className="dash__skeleton dash__skeleton--tall" />
                  ) : !selected ? (
                    <div className="dash__empty">
                      <img src={mascotUrl} alt="" aria-hidden="true" width={78} height={108} />
                      <p className="dash__empty-title">{A.noSections}</p>
                      <p className="adm-hint">{A.noSectionsHint}</p>
                    </div>
                  ) : sectionQuestions.length === 0 ? (
                    <div className="dash__empty">
                      <img src={mascotUrl} alt="" aria-hidden="true" width={78} height={108} />
                      <p className="dash__empty-title">{A.noQuestions}</p>
                      <p className="adm-hint">{A.noQuestionsHint}</p>
                      <button type="button" className="adm-btn adm-btn--primary" onClick={() => setEditing({ kind: 'question', question: null })}>
                        <Icon name="plus" />
                        {A.addQuestion}
                      </button>
                    </div>
                  ) : (
                    <ol className="dq-list">{sectionQuestions.map((q, i, list) => renderQuestion(q, i, list, { reorder: true }))}</ol>
                  )}
                </>
              )}
            </section>
          </div>
        )}
      </div>

      {editing?.kind === 'section' && <SectionEditor section={editing.section} onClose={() => setEditing(null)} onSave={onSaveSection} />}
      {editing?.kind === 'question' && (
        <QuestionEditor
          question={editing.question}
          defaultSectionId={selected?.id ?? sections[0]?.id ?? ''}
          sections={sections}
          onClose={() => setEditing(null)}
          onSave={onSaveQuestion}
        />
      )}
    </div>
  );
}
