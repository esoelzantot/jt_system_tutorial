import './BidiText.css';

/** An English name in brackets, such as "(Lost Shipment)". */
const LATIN_IN_BRACKETS = /(\([\x20-\x7E]*[A-Za-z][\x20-\x7E]*\))/;

/**
 * Keeps an English name in brackets together and left-to-right. Inside Arabic text, the browser
 * otherwise mixes up its brackets and slashes when the name wraps onto a second line.
 */
export function BidiText({ text }: { text: string }) {
  return (
    <>
      {text.split(LATIN_IN_BRACKETS).map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} className="bidi-latin" dir="ltr">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}
