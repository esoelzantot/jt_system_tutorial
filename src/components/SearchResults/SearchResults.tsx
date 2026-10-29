import { UI } from '../../constants/ui';
import type { SearchResult } from '../../types/tutorial';
import { Highlight } from '../Highlight/Highlight';
import { StatusMessage } from '../StatusMessage/StatusMessage';
import './SearchResults.css';

interface Props {
  query: string;
  results: SearchResult[];
  onSelect: (result: SearchResult) => void;
}

export function SearchResults({ query, results, onSelect }: Props) {
  return (
    <section className="search-results" aria-labelledby="search-results-heading">
      <header className="search-results__header">
        <h2 id="search-results-heading" className="search-results__title">
          {UI.resultsFor} «<bdi>{query.trim()}</bdi>»
        </h2>
        <p className="search-results__count" role="status" aria-live="polite">
          {UI.resultsCount(results.length)}
        </p>
      </header>

      {results.length === 0 ? (
        <StatusMessage kind="empty" title={UI.noResultsTitle} hint={UI.noResultsHint} />
      ) : (
        <ul className="search-results__list">
          {results.map((result) => (
            <li key={result.question.id}>
              <button type="button" className="search-result" onClick={() => onSelect(result)}>
                <span className="search-result__section" dir="auto">
                  <Highlight {...result.sectionTitle} />
                </span>
                <span className="search-result__question" dir="auto">
                  <Highlight {...result.questionTitle} />
                </span>
                {result.snippet && (
                  <span className="search-result__snippet" dir="auto">
                    {result.snippet.stepNumber !== undefined && (
                      <span className="search-result__step">{UI.stepLabel(result.snippet.stepNumber)}</span>
                    )}
                    <Highlight {...result.snippet} />
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
