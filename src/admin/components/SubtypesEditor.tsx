import { SUBTYPE_ICONS, type SubtypeIcon } from '../../components/TicketExplorer/icons';
import type { TranslationLang } from '../../i18n/config';
import type { SubtypeTranslation, TicketSubtype } from '../../types/tutorial';
import { A } from '../strings';
import { Icon } from './Icon';

export interface SubtypeItem extends TicketSubtype {
  key: number;
  /** Kept on the item so a translation follows its subtype when subtypes are reordered. */
  tr: Record<TranslationLang, SubtypeTranslation>;
}

let nextKey = 1;
export const makeSubtype = (s?: Partial<TicketSubtype>, tr: Partial<Record<TranslationLang, SubtypeTranslation>> = {}): SubtypeItem => ({
  key: nextKey++,
  tr: { en: tr.en ?? {}, zh: tr.zh ?? {} },
  title: s?.title ?? '',
  titleEn: s?.titleEn ?? '',
  meaning: s?.meaning ?? '',
  whenToUse: s?.whenToUse ?? '',
  icon: s?.icon || 'ticket',
});

interface Props {
  subtypes: SubtypeItem[];
  onChange: (subtypes: SubtypeItem[]) => void;
  invalid?: boolean;
}

/** One card per ticket subtype: name, what it means, when to use it, and an icon. */
export function SubtypesEditor({ subtypes, onChange, invalid }: Props) {
  const set = (i: number, patch: Partial<TicketSubtype>) =>
    onChange(subtypes.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const move = (i: number, dir: -1 | 1) => {
    const next = [...subtypes];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    onChange(next);
  };
  const remove = (i: number) => onChange(subtypes.length === 1 ? [makeSubtype()] : subtypes.filter((_, j) => j !== i));

  return (
    <div className="subtypes-editor">
      {subtypes.map((s, i) => (
        <fieldset key={s.key} className="subtype-card">
          <legend className="visually-hidden">{`${A.subtype} ${i + 1}`}</legend>
          <div className="subtype-card__head">
            <span className="steps-editor__num" aria-hidden="true">
              {i + 1}
            </span>
            <span className="subtype-card__actions">
              <button type="button" className="adm-icon-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label={A.moveUp}>
                <Icon name="up" />
              </button>
              <button type="button" className="adm-icon-btn" onClick={() => move(i, 1)} disabled={i === subtypes.length - 1} aria-label={A.moveDown}>
                <Icon name="down" />
              </button>
              <button type="button" className="adm-icon-btn adm-icon-btn--danger" onClick={() => remove(i)} aria-label={A.removeSubtype}>
                <Icon name="close" />
              </button>
            </span>
          </div>

          <div className="subtype-card__row">
            <label className="adm-field">
              <span className="adm-label">{A.subtypeTitle}</span>
              <input
                className="adm-input"
                dir="auto"
                value={s.title}
                placeholder={A.subtypeTitlePlaceholder}
                aria-invalid={invalid && !s.title.trim() ? true : undefined}
                onChange={(e) => set(i, { title: e.target.value })}
              />
            </label>
            <label className="adm-field">
              <span className="adm-label">
                {A.subtypeTitleEn} <small>{A.introOptional}</small>
              </span>
              <input className="adm-input" dir="ltr" value={s.titleEn} placeholder="Change Delivery Time" onChange={(e) => set(i, { titleEn: e.target.value })} />
            </label>
          </div>

          <label className="adm-field">
            <span className="adm-label">{A.subtypeMeaning}</span>
            <textarea
              className="adm-textarea"
              dir="auto"
              rows={2}
              value={s.meaning}
              aria-invalid={invalid && s.title.trim() && !s.meaning.trim() ? true : undefined}
              onChange={(e) => set(i, { meaning: e.target.value })}
            />
          </label>

          <label className="adm-field">
            <span className="adm-label">
              {A.subtypeWhen} <small>{A.introOptional}</small>
            </span>
            <textarea className="adm-textarea" dir="auto" rows={2} value={s.whenToUse} onChange={(e) => set(i, { whenToUse: e.target.value })} />
          </label>

          <div className="adm-field">
            <span className="adm-label">{A.subtypeIcon}</span>
            <div className="subtype-card__icons" role="radiogroup" aria-label={A.subtypeIcon}>
              {(Object.keys(SUBTYPE_ICONS) as SubtypeIcon[]).map((icon) => (
                <button
                  key={icon}
                  type="button"
                  role="radio"
                  aria-checked={s.icon === icon}
                  aria-label={icon}
                  className="subtype-card__icon"
                  onClick={() => set(i, { icon })}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d={SUBTYPE_ICONS[icon]} />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        </fieldset>
      ))}

      <button type="button" className="steps-editor__add" onClick={() => onChange([...subtypes, makeSubtype()])}>
        <Icon name="plus" />
        {A.addSubtype}
      </button>
    </div>
  );
}
