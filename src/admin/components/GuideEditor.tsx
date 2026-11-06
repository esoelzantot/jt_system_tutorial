import { useRef, useState } from 'react';
import type { TranslationLang } from '../../i18n/config';
import { ACCEPTED_IMAGE_TYPES, uploadImage } from '../services/imageUpload';
import { A } from '../strings';
import { Icon } from './Icon';

type Tr<T> = Record<TranslationLang, T>;

export interface GuideEditItem {
  key: number;
  text: string;
  note: string;
  imageUrl: string;
  /** Kept on the item so a translation follows its row when rows are reordered. */
  tr: Tr<{ text: string; note: string }>;
}

export interface GuideEditNote {
  key: number;
  text: string;
  tr: Tr<string>;
}

export interface GuideEditState {
  examples: GuideEditItem[];
  materials: GuideEditItem[];
  steps: GuideEditItem[];
  notes: GuideEditNote[];
  warning: string;
  warningTr: Tr<string>;
}

let nextKey = 1;
export const makeGuideItem = (
  item?: { text?: string; note?: string; imageUrl?: string },
  tr: Partial<Tr<{ text?: string; note?: string }>> = {},
): GuideEditItem => ({
  key: nextKey++,
  text: item?.text ?? '',
  note: item?.note ?? '',
  imageUrl: item?.imageUrl ?? '',
  tr: {
    en: { text: tr.en?.text ?? '', note: tr.en?.note ?? '' },
    zh: { text: tr.zh?.text ?? '', note: tr.zh?.note ?? '' },
  },
});

export const makeGuideNote = (text = '', tr: Partial<Tr<string>> = {}): GuideEditNote => ({
  key: nextKey++,
  text,
  tr: { en: tr.en ?? '', zh: tr.zh ?? '' },
});

function moveItem<T>(list: T[], i: number, dir: -1 | 1) {
  const next = [...list];
  [next[i], next[i + dir]] = [next[i + dir], next[i]];
  return next;
}

/** Small picture picker for a row: shows the image, uploads a replacement, or removes it. */
function RowImage({ url, onChange, onBusyChange }: { url: string; onChange: (url: string) => void; onBusyChange: (busy: boolean) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setFailed(false);
    onBusyChange(true);
    try {
      onChange((await uploadImage(file)).url);
    } catch (e) {
      console.error('Image upload failed', e);
      setFailed(true);
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
  };

  return (
    <div className="guide-row__image">
      <button type="button" className="guide-row__thumb" onClick={() => fileRef.current?.click()} disabled={busy} aria-label={A.replaceImage} title={failed ? A.imageErrors.failed : A.replaceImage}>
        {busy ? <span className="adm-spinner" /> : url ? <img src={url} alt="" /> : <Icon name="image" />}
      </button>
      {url && !busy && (
        <button type="button" className="guide-row__image-remove" onClick={() => onChange('')}>
          {A.removeImage}
        </button>
      )}
      {failed && <span className="adm-error">{A.imageErrors.failed}</span>}
      <input
        ref={fileRef}
        type="file"
        hidden
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        onChange={(e) => {
          void pick(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
}

function ItemList({
  label,
  items,
  withNote,
  addLabel,
  onChange,
  onBusyChange,
}: {
  label: string;
  items: GuideEditItem[];
  withNote: boolean;
  addLabel: string;
  onChange: (items: GuideEditItem[]) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const set = (i: number, patch: Partial<GuideEditItem>) => onChange(items.map((item, j) => (j === i ? { ...item, ...patch } : item)));

  return (
    <div className="adm-field">
      <span className="adm-label">{label}</span>
      <div className="guide-list">
        {items.map((item, i) => (
          <div key={item.key} className="guide-row">
            <RowImage url={item.imageUrl} onChange={(imageUrl) => set(i, { imageUrl })} onBusyChange={onBusyChange} />
            <div className="guide-row__fields">
              <textarea
                className="adm-textarea"
                dir="auto"
                rows={1}
                value={item.text}
                aria-label={`${label} ${i + 1}`}
                onChange={(e) => set(i, { text: e.target.value })}
              />
              {withNote && (
                <input className="adm-input" dir="auto" value={item.note} placeholder={A.guideNote} aria-label={A.guideNote} onChange={(e) => set(i, { note: e.target.value })} />
              )}
            </div>
            <span className="steps-editor__actions">
              <button type="button" className="adm-icon-btn" disabled={i === 0} aria-label={A.moveUp} onClick={() => onChange(moveItem(items, i, -1))}>
                <Icon name="up" />
              </button>
              <button type="button" className="adm-icon-btn" disabled={i === items.length - 1} aria-label={A.moveDown} onClick={() => onChange(moveItem(items, i, 1))}>
                <Icon name="down" />
              </button>
              <button type="button" className="adm-icon-btn adm-icon-btn--danger" aria-label={A.delete} onClick={() => onChange(items.filter((_, j) => j !== i))}>
                <Icon name="close" />
              </button>
            </span>
          </div>
        ))}
      </div>
      <button type="button" className="steps-editor__add" onClick={() => onChange([...items, makeGuideItem()])}>
        <Icon name="plus" />
        {addLabel}
      </button>
    </div>
  );
}

interface Props {
  guide: GuideEditState;
  onChange: (guide: GuideEditState) => void;
  onBusyChange: (busy: boolean) => void;
}

/** Structured editor for a packaging guide: examples, materials, steps, notes and a warning. */
export function GuideEditor({ guide, onChange, onBusyChange }: Props) {
  const setNote = (i: number, text: string) => onChange({ ...guide, notes: guide.notes.map((n, j) => (j === i ? { ...n, text } : n)) });

  return (
    <>
      <ItemList label={A.guideExamples} addLabel={A.guideAddExample} items={guide.examples} withNote onChange={(examples) => onChange({ ...guide, examples })} onBusyChange={onBusyChange} />
      <ItemList label={A.guideMaterials} addLabel={A.guideAddMaterial} items={guide.materials} withNote onChange={(materials) => onChange({ ...guide, materials })} onBusyChange={onBusyChange} />
      <ItemList label={A.steps} addLabel={A.addStep} items={guide.steps} withNote={false} onChange={(steps) => onChange({ ...guide, steps })} onBusyChange={onBusyChange} />

      <div className="adm-field">
        <span className="adm-label">{A.guideNotes}</span>
        <div className="guide-list">
          {guide.notes.map((note, i) => (
            <div key={note.key} className="guide-row">
              <div className="guide-row__fields">
                <textarea className="adm-textarea" dir="auto" rows={1} value={note.text} aria-label={`${A.guideNotes} ${i + 1}`} onChange={(e) => setNote(i, e.target.value)} />
              </div>
              <span className="steps-editor__actions">
                <button type="button" className="adm-icon-btn" disabled={i === 0} aria-label={A.moveUp} onClick={() => onChange({ ...guide, notes: moveItem(guide.notes, i, -1) })}>
                  <Icon name="up" />
                </button>
                <button type="button" className="adm-icon-btn" disabled={i === guide.notes.length - 1} aria-label={A.moveDown} onClick={() => onChange({ ...guide, notes: moveItem(guide.notes, i, 1) })}>
                  <Icon name="down" />
                </button>
                <button type="button" className="adm-icon-btn adm-icon-btn--danger" aria-label={A.delete} onClick={() => onChange({ ...guide, notes: guide.notes.filter((_, j) => j !== i) })}>
                  <Icon name="close" />
                </button>
              </span>
            </div>
          ))}
        </div>
        <button type="button" className="steps-editor__add" onClick={() => onChange({ ...guide, notes: [...guide.notes, makeGuideNote()] })}>
          <Icon name="plus" />
          {A.guideAddNote}
        </button>
      </div>

      <label className="adm-field">
        <span className="adm-label">
          {A.guideWarning} <small>{A.introOptional}</small>
        </span>
        <textarea className="adm-textarea" dir="auto" rows={2} value={guide.warning} onChange={(e) => onChange({ ...guide, warning: e.target.value })} />
      </label>
    </>
  );
}
