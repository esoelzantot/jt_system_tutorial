import { useId, useState, type FormEvent } from 'react';
import { languageInfo, TRANSLATION_LANGS } from '../../i18n/config';
import type { SectionTranslation, Translations } from '../../types/tutorial';
import { A } from '../strings';
import type { AdminSection } from '../types';
import { Dialog } from './Dialog';
import { Icon } from './Icon';

interface Props {
  section: AdminSection | null;
  onClose: () => void;
  onSave: (title: string, translations: Translations<SectionTranslation>) => Promise<void>;
}

export function SectionEditor({ section, onClose, onSave }: Props) {
  const [title, setTitle] = useState(section?.title ?? '');
  const [translated, setTranslated] = useState({
    en: section?.translations?.en?.title ?? '',
    zh: section?.translations?.zh?.title ?? '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const headingId = useId();
  const inputId = useId();
  const invalid = submitted && !title.trim();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSave(title, { en: { title: translated.en }, zh: { title: translated.zh } });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onRequestClose={() => !saving && onClose()} labelledBy={headingId}>
      <form className="adm-dialog__body" onSubmit={submit} noValidate>
        <span className="adm-dialog__icon adm-dialog__icon--brand">
          <Icon name="folder" />
        </span>
        <h2 id={headingId} className="adm-dialog__title">
          {section ? A.editSection : A.newSection}
        </h2>
        <div className="adm-field">
          <label htmlFor={inputId} className="adm-label">
            {A.sectionTitle}
          </label>
          <input
            id={inputId}
            className="adm-input"
            dir="auto"
            value={title}
            placeholder={A.sectionTitlePlaceholder}
            aria-invalid={invalid || undefined}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
          {invalid && <p className="adm-error">{A.required}</p>}
        </div>
        {TRANSLATION_LANGS.map((lang) => (
          <label key={lang} className="adm-field">
            <span className="adm-label">
              {A.sectionTitleIn(languageInfo(lang).name)} <small>{A.introOptional}</small>
            </span>
            <input
              className="adm-input"
              dir={languageInfo(lang).dir}
              lang={languageInfo(lang).htmlLang}
              value={translated[lang]}
              onChange={(e) => setTranslated((t) => ({ ...t, [lang]: e.target.value }))}
            />
          </label>
        ))}
        <div className="adm-dialog__actions">
          <button type="button" className="adm-btn adm-btn--ghost" onClick={onClose} disabled={saving}>
            {A.cancel}
          </button>
          <button type="submit" className="adm-btn adm-btn--primary" disabled={saving}>
            {saving ? <span className="adm-spinner" /> : <Icon name="check" />}
            {saving ? A.saving : A.save}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
