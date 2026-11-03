import { useId, useMemo, useState, type FormEvent } from 'react';
import { QuestionAccordion } from '../../components/QuestionAccordion/QuestionAccordion';
import type { AnswerType, Question } from '../../types/tutorial';
import { toDisplayableImageUrl } from '../../utils/imageUrl';
import { A } from '../strings';
import type { AdminQuestion, AdminSection, QuestionInput } from '../types';
import { Dialog } from './Dialog';
import { useFeedback } from './feedback';
import { Icon } from './Icon';
import { ImageField, type ImageValue } from './ImageField';
import { makeStep, StepsEditor, type StepItem } from './StepsEditor';
import { makeSubtype, SubtypesEditor, type SubtypeItem } from './SubtypesEditor';
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
  image: ImageValue;
}

function initialForm(q: AdminQuestion | null, sectionId: string): FormState {
  const hasIntro = q?.answerType === 'steps' || q?.answerType === 'types';
  return {
    sectionId,
    title: q?.title ?? '',
    answerType: q?.answerType ?? 'paragraph',
    answerText: hasIntro ? '' : (q?.answerText ?? ''),
    intro: hasIntro ? (q?.answerText ?? '') : '',
    steps: q?.steps.length ? q.steps.map((s) => makeStep(s)) : [makeStep()],
    subtypes: q?.subtypes.length ? q.subtypes.map((s) => makeSubtype(s)) : [makeSubtype()],
    image: { url: q?.imageUrl ?? '', alt: q?.imageAlt ?? '', width: q?.imageWidth, height: q?.imageHeight },
  };
}

function toInput(f: FormState): QuestionInput {
  return {
    sectionId: f.sectionId,
    title: f.title,
    answerType: f.answerType,
    answerText: f.answerType === 'paragraph' ? f.answerText : f.intro,
    steps: f.steps.map((s) => s.text),
    subtypes: f.subtypes.map(({ key: _key, ...s }) => s),
    ...(f.image.url ? { imageUrl: f.image.url, imageAlt: f.image.alt, imageWidth: f.image.width, imageHeight: f.image.height } : {}),
  };
}

/** Comparable snapshot for "unsaved changes" detection (ignores step keys and blank steps). */
const snapshot = (f: FormState) =>
  JSON.stringify({
    ...toInput(f),
    steps: f.steps.map((s) => s.text.trim()).filter(Boolean),
    subtypes: toInput(f).subtypes.filter((s) => s.title.trim()),
  });

/** Side sheet for creating / editing a question, with a live preview. */
export function QuestionEditor({ question, defaultSectionId, sections, onClose, onSave }: Props) {
  // Orphaned questions (section deleted) start on the default section so the select is valid.
  const [form, setForm] = useState(() =>
    initialForm(question, sections.some((s) => s.id === question?.sectionId) ? question!.sectionId : defaultSectionId),
  );
  const [initial] = useState(() => snapshot(form));
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
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
      setTab('edit');
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
        input.answerType === 'types' && input.subtypes.some((s) => s.title.trim())
          ? 'types'
          : input.answerType === 'steps' && input.steps.some((s) => s.trim())
            ? 'steps'
            : 'paragraph',
      answerText: input.answerText.trim(),
      steps: input.steps.map((s) => s.trim()).filter(Boolean),
      subtypes: input.subtypes.filter((s) => s.title.trim()),
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

        <div className="qe__scroll">
          {tab === 'preview' ? (
            <div className="qe__preview">
              <p className="adm-hint">{A.previewHint}</p>
              <QuestionAccordion question={preview} number={1} isOpen isHighlighted={false} onToggle={() => {}} onOpenImage={() => {}} />
            </div>
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
                  {(['paragraph', 'steps', 'types'] as const).map((type) => (
                    <label key={type} className={`qe__type${form.answerType === type ? ' qe__type--active' : ''}`}>
                      <input
                        type="radio"
                        name="answerType"
                        value={type}
                        checked={form.answerType === type}
                        onChange={() => update('answerType', type)}
                      />
                      <span className="qe__type-icon">
                        <Icon name={type === 'steps' ? 'steps' : type === 'types' ? 'cards' : 'paragraph'} />
                      </span>
                      <span>
                        <strong>{type === 'steps' ? A.typeSteps : type === 'types' ? A.typeTypes : A.typeParagraph}</strong>
                        <small>{type === 'steps' ? A.typeStepsHint : type === 'types' ? A.typeTypesHint : A.typeParagraphHint}</small>
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
