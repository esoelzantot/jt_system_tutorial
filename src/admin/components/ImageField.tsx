import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { toDisplayableImageUrl } from '../../utils/imageUrl';
import { ACCEPTED_IMAGE_TYPES, uploadImage } from '../services/imageUpload';
import { A } from '../strings';
import { Icon } from './Icon';

export interface ImageValue {
  url: string;
  alt: string;
  width?: number;
  height?: number;
}

interface Props {
  value: ImageValue;
  onChange: (value: ImageValue) => void;
  onBusyChange: (busy: boolean) => void;
  urlError?: string;
}

/** Drag & drop, file picker, clipboard paste (Ctrl+V) or a pasted link. Files go to Vercel Blob. */
export function ImageField({ value, onChange, onBusyChange, urlError }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const altId = useId();
  const latest = useRef(value);
  latest.current = value;

  const handleFile = async (file: File | undefined) => {
    if (!file || progress !== null) return;
    setError(null);
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return setError(A.imageErrors.type);
    setProgress(0);
    onBusyChange(true);
    try {
      const { url, width, height } = await uploadImage(file, setProgress);
      onChange({ ...latest.current, url, width, height });
    } catch (e) {
      const code = e instanceof Error ? e.message : '';
      setError(code === 'size' ? A.imageErrors.size : code === 'type' ? A.imageErrors.type : A.imageErrors.failed);
      console.error('Image upload failed', e);
    } finally {
      setProgress(null);
      onBusyChange(false);
    }
  };

  // Paste a screenshot anywhere in the editor.
  const handleFileRef = useRef(handleFile);
  handleFileRef.current = handleFile;
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'));
      if (!file) return;
      e.preventDefault();
      void handleFileRef.current(file);
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, []);

  const uploading = progress !== null;

  return (
    <div className="image-field">
      {value.url && !uploading ? (
        <div className="image-field__preview">
          <img src={toDisplayableImageUrl(value.url)} alt="" />
          <div className="image-field__preview-actions">
            <button type="button" className="adm-btn" onClick={() => fileRef.current?.click()}>
              <Icon name="upload" />
              {A.replaceImage}
            </button>
            <button type="button" className="adm-btn adm-btn--ghost" onClick={() => onChange({ url: '', alt: '' })}>
              <Icon name="trash" />
              {A.removeImage}
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`image-field__drop${dragging ? ' image-field__drop--over' : ''}${uploading ? ' image-field__drop--busy' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void handleFile(e.dataTransfer.files[0]);
          }}
        >
          {uploading ? (
            <>
              <span className="image-field__progress" style={{ '--p': `${progress}%` } as CSSProperties} />
              <span>{A.uploading(progress)}</span>
            </>
          ) : (
            <>
              <span className="image-field__icon">
                <Icon name="image" />
              </span>
              <span>
                {A.dropImage}{' '}
                <button type="button" className="image-field__browse" onClick={() => fileRef.current?.click()}>
                  {A.browse}
                </button>
              </span>
              <span className="adm-hint">{A.pasteHint}</span>
            </>
          )}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        hidden
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      {!value.url && !uploading && (
        <input
          className="adm-input"
          type="url"
          dir="ltr"
          placeholder={A.imageUrlPlaceholder}
          aria-label={A.imageUrlPlaceholder}
          aria-invalid={urlError ? true : undefined}
          onBlur={(e) => {
            const url = e.target.value.trim();
            if (url) onChange({ ...value, url, width: undefined, height: undefined });
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
        />
      )}
      {(error || urlError) && <p className="adm-error">{error ?? urlError}</p>}

      {value.url && (
        <div className="adm-field">
          <label htmlFor={altId} className="adm-label">
            {A.imageAlt}
          </label>
          <input
            id={altId}
            className="adm-input"
            dir="auto"
            value={value.alt}
            placeholder={A.imageAltPlaceholder}
            onChange={(e) => onChange({ ...value, alt: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}
