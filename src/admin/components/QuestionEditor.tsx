import { useId, useMemo, useState, type FormEvent } from 'react';
import { QuestionAccordion } from '../../components/QuestionAccordion/QuestionAccordion';
import { FixedLanguage } from '../../i18n/I18nContext';
import { LANGUAGES, languageInfo, TRANSLATION_LANGS, type Lang, type TranslationLang } from '../../i18n/config';
import { localizeQuestion, translationStatus } from '../../i18n/localizeContent';
import type { AnswerType, Question, QuestionTranslation, Translations } from '../../types/tutorial';
import { toDisplayableImageUrl } from '../../utils/imageUrl';
import { A } from '../strings';
import type { AdminQuestion, AdminSection, QuestionInput } from '../types';
import { Dialog } from './Dialog';
import { useFeedback } from './feedback';
import { GuideEditor, ItemList, makeGuideItem, makeGuideNote, type ClaimEditState, type GuideEditItem, type GuideEditState } from './GuideEditor';
import { Icon } from './Icon';
import { ImageField, type ImageValue } from './ImageField';
import { makeStep, StepsEditor, type StepItem } from './StepsEditor';
import { makeSubtype, SubtypesEditor, type SubtypeItem } from './SubtypesEditor';
import { TranslationFields, type TextTranslation } from './TranslationFields';
import './QuestionEditor.css';

interface Props {
  /** The question being edited, or null to create one. */
  question: AdminQuestion | null;
  defaultSectionId: string;
  sections: AdminSection[];
  onClose: () => void;
  onSave: (input: QuestionInput) => Promise<void>;
}

interface FormState {
  sectionId: string;
  title: string;
  answerType: AnswerType;
  answerText: string;
  intro: string;
  steps: StepItem[];
  subtypes: SubtypeItem[];
  guide: GuideEditState;
  claim: ClaimEditState;
  image: ImageValue;
  /** Question-level translated texts; step and subtype translations live on their items. */
  text: Record<TranslationLang, TextTranslation>;
}

function initialForm(q: AdminQuestion | null, sectionId: string): FormState {
  const hasIntro = q?.answerType === 'steps' || q?.answerType === 'types' || q?.answerType === 'guide' || q?.answerType === 'claim';
  const tr = q?.translations;
  const textOf = (lang: TranslationLang): TextTranslation => ({
    title: tr?.[lang]?.title ?? '',
    answerText: tr?.[lang]?.answerText ?? '',
    imageAlt: tr?.[lang]?.imageAlt ?? '',
  });
  const guideItems = (kind: 'examples' | 'materials' | 'steps') =>
    (q?.guide?.[kind] ?? []).map((item, i) => makeGuideItem(item, { en: tr?.en?.guide?.[kind]?.[i], zh: tr?.zh?.guide?.[kind]?.[i] }));
  const claimItems = (kind: 'terms' | 'documents') =>
    (q?.claim?.[kind] ?? []).map((item, i) => makeGuideItem(item, { en: tr?.en?.claim?.[kind]?.[i], zh: tr?.zh?.claim?.[kind]?.[i] }));
  return {
    sectionId,
    title: q?.title ?? '',
    answerType: q?.answerType ?? 'paragraph',
    answerText: hasIntro ? '' : (q?.answerText ?? ''),
    intro: hasIntro ? (q?.answerText ?? '') : '',
    steps: q?.steps.length ? q.steps.map((s, i) => makeStep(s, { en: tr?.en?.steps?.[i], zh: tr?.zh?.steps?.[i] })) : [makeStep()],
    subtypes: q?.subtypes.length
      ? q.subtypes.map((s, i) => makeSubtype(s, { en: tr?.en?.subtypes?.[i], zh: tr?.zh?.subtypes?.[i] }))
      : [makeSubtype()],
    guide: {
      examples: guideItems('examples'),
      materials: guideItems('materials'),
      steps: guideItems('steps'),
      notes: (q?.guide?.notes ?? []).map((n, i) => makeGuideNote(n, { en: tr?.en?.guide?.notes?.[i], zh: tr?.zh?.guide?.notes?.[i] })),
      warning: q?.guide?.warning ?? '',
      warningTr: { en: tr?.en?.guide?.warning ?? '', zh: tr?.zh?.guide?.warning ?? '' },
    },
    claim: {
      deadline: q?.claim?.deadline ?? '',
      deadlineTr: { en: tr?.en?.claim?.deadline ?? '', zh: tr?.zh?.claim?.deadline ?? '' },
      terms: claimItems('terms'),
      anyTerm: q?.claim?.anyTerm === true,
      documents: claimItems('documents'),
    },
    text: { en: textOf('en'), zh: textOf('zh') },
    image: { url: q?.imageUrl ?? '', alt: q?.imageAlt ?? '', width: q?.imageWidth, height: q?.imageHeight },
  };
}

function toInput(f: FormState): QuestionInput {
  // Blank rows are dropped here, so translation indexes always match the saved Arabic list.
  const steps = f.answerType === 'steps' ? f.steps.filter((s) => s.text.trim()) : [];
  const subtypes = f.answerType === 'types' ? f.subtypes.filter((s) => s.title.trim()) : [];
  const isGuide = f.answerType === 'guide';
  const filled = (items: GuideEditItem[]) => (isGuide ? items.filter((i) => i.text.trim()) : []);
  const examples = filled(f.guide.examples);
  const materials = filled(f.guide.materials);
  const guideSteps = filled(f.guide.steps);
  const notes = isGuide ? f.guide.notes.filter((n) => n.text.trim()) : [];
  const isClaim = f.answerType === 'claim';
  const claimTerms = isClaim ? f.claim.terms.filter((i) => i.text.trim()) : [];
  const claimDocuments = isClaim ? f.claim.documents.filter((i) => i.text.trim()) : [];
  const translations: Translations<QuestionTranslation> = {};
  for (const lang of TRANSLATION_LANGS) {
    translations[lang] = {
      ...f.text[lang],
      steps: steps.map((s) => s.tr[lang]),
      subtypes: subtypes.map((s) => s.tr[lang]),
      ...(isGuide
        ? {
            guide: {
              examples: examples.map((i) => i.tr[lang]),
              materials: materials.map((i) => i.tr[lang]),
              steps: guideSteps.map((i) => i.tr[lang]),
              notes: notes.map((n) => n.tr[lang]),
              warning: f.guide.warningTr[lang],
            },
          }
        : {}),
      ...(isClaim
        ? {
            claim: {
              deadline: f.claim.deadlineTr[lang],
              terms: claimTerms.map((i) => i.tr[lang]),
              documents: claimDocuments.map((i) => i.tr[lang]),
            },
          }
        : {}),
    };
  }
  const plain = ({ text, note, imageUrl }: GuideEditItem) => ({ text, ...(note ? { note } : {}), ...(imageUrl ? { imageUrl } : {}) });
  return {
    sectionId: f.sectionId,
    title: f.title,
    answerType: f.answerType,
    answerText: f.answerType === 'paragraph' ? f.answerText : f.intro,
    steps: steps.map((s) => s.text),
    subtypes: subtypes.map(({ key: _key, tr: _tr, ...s }) => s),
    ...(isGuide
      ? {
          guide: {
            examples: examples.map(plain),
            materials: materials.map(plain),
            steps: guideSteps.map(plain),
            notes: notes.map((n) => n.text),
            warning: f.guide.warning,
          },
        }
      : {}),
    ...(isClaim
      ? {
          claim: {
            deadline: f.claim.deadline,
            terms: claimTerms.map(({ text, note }) => ({ text, ...(note ? { note } : {}) })),
            ...(f.claim.anyTerm ? { anyTerm: true } : {}),
            documents: claimDocuments.map(({ text, note }) => ({ text, ...(note ? { note } : {}) })),
          },
        }
      : {}),
    translations,
    ...(f.image.url ? { imageUrl: f.image.url, imageAlt: f.image.alt, imageWidth: f.image.width, imageHeight: f.image.height } : {}),
  };
}

/** Comparable snapshot for "unsaved changes" detection (ignores step keys and blank steps). */
const snapshot = (f: FormState) => JSON.stringify(toInput(f));

/** Side sheet for creating / editing a question, with a live preview. */
export function QuestionEditor({ question, defaultSectionId, sections, onClose, onSave }: Props) {
  // Orphaned questions (section deleted) start on the default section so the select is valid.
  const [form, setForm] = useState(() =>
    initialForm(question, sections.some((s) => s.id === question?.sectionId) ? question!.sectionId : defaultSectionId),
  );
  const [initial] = useState(() => snapshot(form));
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [editLang, setEditLang] = useState<Lang>('ar');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { confirm } = useFeedback();
  const ids = { title: useId(), section: useId(), text: useId(), intro: useId(), heading: useId() };

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const errors = {
    title: !form.title.trim() ? A.required : null,
    answerText: form.answerType === 'paragraph' && !form.answerText.trim() ? A.required : null,
    steps: form.answerType === 'steps' && !form.steps.some((s) => s.text.trim()) ? A.needOneStep : null,
    subtypes:
      form.answerType === 'types' &&
      (!form.subtypes.some((s) => s.title.trim()) || form.subtypes.some((s) => s.title.trim() && !s.meaning.trim()))
        ? A.needSubtype
        : null,
    guide:
      form.answerType === 'guide' &&
      ![...form.guide.examples, ...form.guide.materials, ...form.guide.steps, ...form.guide.notes].some((i) => i.text.trim()) &&
      !form.guide.warning.trim()
        ? A.needGuideContent
        : null,
    claim: form.answerType === 'claim' && ![...form.claim.terms, ...form.claim.documents].some((i) => i.text.trim()) ? A.needClaimContent : null,
    imageUrl: form.image.url && !/^https:\/\//i.test(form.image.url) ? A.invalidUrl : null,
  };
  const hasErrors = Object.values(errors).some(Boolean);
  const show = (key: keyof typeof errors) => (submitted ? errors[key] : null);

  const requestClose = async () => {
    if (saving) return;
    if (snapshot(form) !== initial) {
      const discard = await confirm({ title: A.discardTitle, text: A.discardText, confirmLabel: A.discard, cancelLabel: A.keepEditing, danger: true });
      if (!discard) return;
    }
    onClose();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (hasErrors) {
      // All required fields are the Arabic ones.
      setTab('edit');
      setEditLang('ar');
      return;
    }
    setSaving(true);
    try {
      await onSave(toInput(form));
    } finally {
      setSaving(false);
    }
  };

  const preview = useMemo((): Question => {
    const input = toInput(form);
    return {
      id: 'preview',
      sectionId: input.sectionId,
      title: input.title.trim() || A.questionTitlePlaceholder,
      answerType:
        input.answerType === 'claim' && input.claim
          ? 'claim'
          : input.answerType === 'guide' && input.guide
          ? 'guide'
          : input.answerType === 'types' && input.subtypes.some((s) => s.title.trim())
          ? 'types'
          : input.answerType === 'steps' && input.steps.some((s) => s.trim())
            ? 'steps'
            : 'paragraph',
      answerText: input.answerText.trim(),
      steps: input.steps.map((s) => s.trim()),
      subtypes: input.subtypes,
      guide: input.guide && {
        ...input.guide,
        examples: input.guide.examples.map((i) => ({ ...i, imageUrl: i.imageUrl && toDisplayableImageUrl(i.imageUrl) })),
        materials: input.guide.materials.map((i) => ({ ...i, imageUrl: i.imageUrl && toDisplayableImageUrl(i.imageUrl) })),
        steps: input.guide.steps.map((i) => ({ ...i, imageUrl: i.imageUrl && toDisplayableImageUrl(i.imageUrl) })),
      },
      claim: input.claim,
      translations: input.translations,
      image: input.imageUrl ? { url: toDisplayableImageUrl(input.imageUrl), alt: input.imageAlt || input.title, width: input.imageWidth, height: input.imageHeight } : null,
      order: 1,
    };
  }, [form]);

  return (
    <Dialog open onRequestClose={() => void requestClose()} labelledBy={ids.heading} className="qe">
      <form className="qe__form" onSubmit={submit} noValidate>
        <header className="qe__header">
          <div>
            <h2 id={ids.heading} className="qe__title">
              {question ? A.editQuestion : A.newQuestion}
            </h2>
          </div>
          <div className="qe__tabs" role="tablist">
            {(['edit', 'preview'] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                className="qe__tab"
                onClick={() => setTab(t)}
              >
                <Icon name={t === 'edit' ? 'edit' : 'eye'} />
                {t === 'edit' ? A.tabEdit : A.tabPreview}
              </button>
            ))}
          </div>
          <button type="button" className="adm-icon-btn" onClick={() => void requestClose()} aria-label={A.close}>
            <Icon name="close" />
          </button>
        </header>

        <div className="qe__langs" role="group" aria-label={A.contentLanguage}>
          {LANGUAGES.map((l) => {
            const status = l.code === 'ar' ? null : translationStatus(toInput(form), l.code);
            return (
              <button
                key={l.code}
                type="button"
                className="qe__lang"
                aria-pressed={editLang === l.code}
                lang={l.htmlLang}
                title={status ? { complete: A.statusComplete, partial: A.statusPartial, none: A.statusNone }[status] : undefined}
                onClick={() => setEditLang(l.code)}
              >
                {l.name}
                {status && <span className={`qe__lang-dot qe__lang-dot--${status}`} aria-hidden="true" />}
              </button>
            );
          })}
        </div>

        <div className="qe__scroll">
          {tab === 'preview' ? (
            <div className="qe__preview">
              <p className="adm-hint">{A.previewHint}</p>
              <FixedLanguage lang={editLang}>
                <QuestionAccordion
                  question={localizeQuestion(preview, editLang)}
                  number={1}
                  isOpen
                  isHighlighted={false}
                  onToggle={() => {}}
                  onOpenImage={() => {}}
                />
              </FixedLanguage>
            </div>
          ) : editLang !== 'ar' ? (
            <TranslationFields
              key={languageInfo(editLang).code}
              lang={editLang}
              title={form.title}
              answerText={form.answerType === 'paragraph' ? form.answerText : form.intro}
              hasImage={!!form.image.url}
              isSteps={form.answerType === 'steps'}
              isTypes={form.answerType === 'types'}
              guide={form.answerType === 'guide' ? form.guide : null}
              onGuideChange={(guide) => update('guide', guide)}
              claim={form.answerType === 'claim' ? form.claim : null}
              onClaimChange={(claim) => update('claim', claim)}
              text={form.text[editLang]}
              steps={form.steps}
              subtypes={form.subtypes}
              onTextChange={(patch) => update('text', { ...form.text, [editLang]: { ...form.text[editLang], ...patch } })}
              onStepsChange={(steps) => update('steps', steps)}
              onSubtypesChange={(subtypes) => update('subtypes', subtypes)}
            />
          ) : (
            <div className="qe__fields">
              <div className="adm-field">
                <label htmlFor={ids.section} className="adm-label">
                  {A.section}
                </label>
                <select id={ids.section} className="adm-select" value={form.sectionId} onChange={(e) => update('sectionId', e.target.value)}>
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="adm-field">
                <label htmlFor={ids.title} className="adm-label">
                  {A.questionTitle}
                </label>
                <textarea
                  id={ids.title}
                  className="adm-textarea qe__title-input"
                  dir="auto"
                  rows={1}
                  value={form.title}
                  placeholder={A.questionTitlePlaceholder}
                  aria-invalid={show('title') ? true : undefined}
                  onChange={(e) => update('title', e.target.value.replace(/\n/g, ' '))}
                  autoFocus={!question}
                />
                {show('title') ? (
                  <p className="adm-error">{show('title')}</p>
                ) : (
                  form.answerType === 'types' && <p className="adm-hint">{A.mainTypeHint}</p>
                )}
              </div>

              <fieldset className="adm-field qe__fieldset">
                <legend className="adm-label">{A.answerType}</legend>
                <div className="qe__types">
                  {(['paragraph', 'steps', 'types', 'guide', 'claim'] as const).map((type) => (
                    <label key={type} className={`qe__type${form.answerType === type ? ' qe__type--active' : ''}`}>
                      <input
                        type="radio"
                        name="answerType"
                        value={type}
                        checked={form.answerType === type}
                        onChange={() => update('answerType', type)}
                      />
                      <span className="qe__type-icon">
                        <Icon name={type === 'steps' ? 'steps' : type === 'types' ? 'cards' : type === 'guide' ? 'package' : type === 'claim' ? 'check' : 'paragraph'} />
                      </span>
                      <span>
                        <strong>{type === 'steps' ? A.typeSteps : type === 'types' ? A.typeTypes : type === 'guide' ? A.typeGuide : type === 'claim' ? A.typeClaim : A.typeParagraph}</strong>
                        <small>{type === 'steps' ? A.typeStepsHint : type === 'types' ? A.typeTypesHint : type === 'guide' ? A.typeGuideHint : type === 'claim' ? A.typeClaimHint : A.typeParagraphHint}</small>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {form.answerType === 'paragraph' ? (
                <div className="adm-field">
                  <label htmlFor={ids.text} className="adm-label">
                    {A.answerText}
                  </label>
                  <textarea
                    id={ids.text}
                    className="adm-textarea qe__answer"
                    dir="auto"
                    rows={6}
                    value={form.answerText}
                    aria-invalid={show('answerText') ? true : undefined}
                    onChange={(e) => update('answerText', e.target.value)}
                  />
                  {show('answerText') ? <p className="adm-error">{show('answerText')}</p> : <p className="adm-hint">{A.answerTextHint}</p>}
                </div>
              ) : (
                <>
                  <div className="adm-field">
                    <label htmlFor={ids.intro} className="adm-label">
                      {A.intro} <small>{A.introOptional}</small>
                    </label>
                    <input
                      id={ids.intro}
                      className="adm-input"
                      dir="auto"
                      value={form.intro}
                      placeholder={A.introPlaceholder}
                      onChange={(e) => update('intro', e.target.value)}
                    />
                  </div>
                  {form.answerType === 'claim' ? (
                    <>
                      <label className="adm-field">
                        <span className="adm-label">{A.claimDeadline}</span>
                        <input
                          className="adm-input"
                          dir="auto"
                          value={form.claim.deadline}
                          placeholder={A.claimDeadlinePlaceholder}
                          onChange={(e) => update('claim', { ...form.claim, deadline: e.target.value })}
                        />
                      </label>
                      <ItemList label={A.claimTerms} addLabel={A.claimAddTerm} items={form.claim.terms} withNote withImage={false} onChange={(terms) => update('claim', { ...form.claim, terms })} onBusyChange={setUploading} />
                      <label className="qe__check">
                        <input type="checkbox" checked={form.claim.anyTerm} onChange={(e) => update('claim', { ...form.claim, anyTerm: e.target.checked })} />
                        {A.claimAnyTerm}
                      </label>
                      <p className="adm-hint">{A.claimActionNote}</p>
                      <ItemList label={A.claimDocuments} addLabel={A.claimAddDocument} items={form.claim.documents} withNote withImage={false} onChange={(documents) => update('claim', { ...form.claim, documents })} onBusyChange={setUploading} />
                      {show('claim') && <p className="adm-error">{show('claim')}</p>}
                    </>
                  ) : form.answerType === 'guide' ? (
                    <>
                      <GuideEditor guide={form.guide} onChange={(guide) => update('guide', guide)} onBusyChange={setUploading} />
                      {show('guide') && <p className="adm-error">{show('guide')}</p>}
                    </>
                  ) : (
                  <div className="adm-field">
                    <span className="adm-label">{form.answerType === 'types' ? A.subtypes : A.steps}</span>
                    {form.answerType === 'types' ? (
                      <SubtypesEditor subtypes={form.subtypes} onChange={(subtypes) => update('subtypes', subtypes)} invalid={!!show('subtypes')} />
                    ) : (
                      <StepsEditor steps={form.steps} onChange={(steps) => update('steps', steps)} invalid={!!show('steps')} />
                    )}
                    {show('steps') && <p className="adm-error">{show('steps')}</p>}
                    {show('subtypes') && <p className="adm-error">{show('subtypes')}</p>}
                  </div>
                  )}
                </>
              )}

              <div className="adm-field">
                <span className="adm-label">
                  {A.image} <small>{A.imageOptional}</small>
                </span>
                <ImageField
                  value={form.image}
                  onChange={(image) => update('image', image)}
                  onBusyChange={setUploading}
                  urlError={show('imageUrl') ?? undefined}
                />
              </div>
            </div>
          )}
        </div>

        <footer className="qe__footer">
          <button type="button" className="adm-btn adm-btn--ghost" onClick={() => void requestClose()} disabled={saving}>
            {A.cancel}
          </button>
          <button type="submit" className="adm-btn adm-btn--primary" disabled={saving || uploading}>
            {saving ? <span className="adm-spinner" /> : <Icon name="check" />}
            {saving ? A.saving : A.save}
          </button>
        </footer>
      </form>
    </Dialog>
  );
}
