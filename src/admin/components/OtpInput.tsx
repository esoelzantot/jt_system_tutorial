import { useRef } from 'react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  /** Called once all digits are filled. */
  onComplete: (value: string) => void;
  length?: number;
  disabled?: boolean;
  invalid?: boolean;
  label: string;
}

/** One box per digit; supports typing, Backspace, arrows and pasting the whole code. */
export function OtpInput({ value, onChange, onComplete, length = 6, disabled, invalid, label }: Props) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');
  const focus = (i: number) => refs.current[Math.max(0, Math.min(length - 1, i))]?.focus();

  const update = (next: string) => {
    const clean = next.replace(/\D/g, '').slice(0, length);
    onChange(clean);
    if (clean.length === length) onComplete(clean);
  };

  return (
    <div className="otp" dir="ltr" role="group" aria-label={label}>
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className={`otp__box${digit ? ' otp__box--filled' : ''}`}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={length}
          value={digit}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-label={`${label} ${i + 1}`}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const typed = e.target.value.replace(/\D/g, '');
            if (!typed) return;
            // Typing several digits (autofill / paste into one box) fills forward.
            const next = (value.slice(0, i) + typed).slice(0, length);
            update(next);
            focus(i + typed.length);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace') {
              e.preventDefault();
              if (digit) update(value.slice(0, i) + value.slice(i + 1));
              else if (i > 0) {
                update(value.slice(0, i - 1) + value.slice(i));
                focus(i - 1);
              }
            } else if (e.key === 'ArrowLeft') focus(i - 1);
            else if (e.key === 'ArrowRight') focus(i + 1);
          }}
          onPaste={(e) => {
            e.preventDefault();
            const pasted = e.clipboardData.getData('text').replace(/\D/g, '');
            if (!pasted) return;
            update(pasted);
            focus(pasted.length);
          }}
        />
      ))}
    </div>
  );
}
