import { languageInfo, type TranslationLang } from '../../i18n/config';
import type { SubtypeTranslation } from '../../types/tutorial';
import { A } from '../strings';
import type { StepItem } from './StepsEditor';
import type { SubtypeItem } from './SubtypesEditor';

export interface TextTranslation {
  title: string;
  answerText: string;
  imageAlt: string;
}

interface Props {
  lang: TranslationLang;
  title: string;
  answerText: string;
  hasImage: boolean;
  isSteps: boolean;
  isTypes: boolean;
  text: TextTranslation;
  steps: StepItem[];
  subtypes: SubtypeItem[];
  onTextChange: (patch: Partial<TextTranslation>) => void;
  onStepsChange: (steps: StepItem[]) => void;
  onSubtypesChange: (subtypes: SubtypeItem[]) => void;
}

/** A text box for the translation under the Arabic text it translates. */
function Field({
  lang,
  label,
  reference,
  value,
  onChange,
}: {
  lang: TranslationLang;
  label: string;
  reference: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const { dir, htmlLang } = languageInfo(lang);
  return (
    <label className="tr-field">
      <span className="adm-label">{label}</span>
      <span className="tr-field__reference" dir="auto">
        {reference}
      </span>
      <textarea
        className="adm-textarea"
        rows={1}
        dir={dir}
        lang={htmlLang}
        value={value}
        placeholder={A.translationPlaceholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

/**
 * Only texts change here. Structure (answer type, section, image, adding or reordering steps)
 * stays in the Arabic tab, and each translated step moves together with its Arabic step.
 */
export function TranslationFields({ lang, title, answerText, hasImage, isSteps, isTypes, text, steps, subtypes, onTextChange, onStepsChange, onSubtypesChange }: Props) {
  const filledSteps = steps.filter((s) => s.text.trim());
  const filledSubtypes = subtypes.filter((s) => s.title.trim());

  const setSubtype = (key: number, patch: SubtypeTranslation) =>
    onSubtypesChange(subtypes.map((s) => (s.key === key ? { ...s, tr: { ...s.tr, [lang]: { ...s.tr[lang], ...patch } } } : s)));

  return (
    <div className="qe__fields">
      <p className="tr-note">{A.translationNote(languageInfo(lang).name)}</p>

      <Field lang={lang} label={A.questionTitle} reference={title} value={text.title} onChange={(v) => onTextChange({ title: v })} />

      {answerText.trim() && (
        <Field
          lang={lang}
          label={isSteps || isTypes ? A.intro : A.answerText}
          reference={answerText}
          value={text.answerText}
          onChange={(v) => onTextChange({ answerText: v })}
        />
      )}

      {isSteps &&
        filledSteps.map((step, i) => (
          <Field
            key={step.key}
            lang={lang}
            label={A.stepPlaceholder(i + 1)}
            reference={step.text}
            value={step.tr[lang]}
            onChange={(v) => onStepsChange(steps.map((s) => (s.key === step.key ? { ...s, tr: { ...s.tr, [lang]: v } } : s)))}
          />
        ))}

      {isTypes &&
        filledSubtypes.map((s, i) => (
          <fieldset key={s.key} className="subtype-card">
            <legend className="visually-hidden">{`${A.subtype} ${i + 1}`}</legend>
            <Field lang={lang} label={A.subtypeTitle} reference={s.title} value={s.tr[lang].title ?? ''} onChange={(v) => setSubtype(s.key, { title: v })} />
            <Field lang={lang} label={A.subtypeMeaning} reference={s.meaning} value={s.tr[lang].meaning ?? ''} onChange={(v) => setSubtype(s.key, { meaning: v })} />
            {s.whenToUse.trim() && (
              <Field lang={lang} label={A.subtypeWhen} reference={s.whenToUse} value={s.tr[lang].whenToUse ?? ''} onChange={(v) => setSubtype(s.key, { whenToUse: v })} />
            )}
          </fieldset>
        ))}

      {hasImage && (
        <label className="tr-field">
          <span className="adm-label">
            {A.imageAlt} <small>{A.introOptional}</small>
          </span>
          <input
            className="adm-input"
            dir={languageInfo(lang).dir}
            value={text.imageAlt}
            placeholder={A.translationPlaceholder}
            onChange={(e) => onTextChange({ imageAlt: e.target.value })}
          />
        </label>
      )}
    </div>
  );
}
