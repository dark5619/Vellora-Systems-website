import { useRef, type KeyboardEvent } from 'react';
import { FILTERS, type FilterId } from '../data/projects';
import { Glyph } from './primitives';

/**
 * Project category controls. A radio group: one Tab stop, arrow keys / Home / End move the
 * selection (and update the collection), the active choice is shown visually and via
 * aria-checked. Controls never move when the collection changes.
 */
export function FilterBar({
  value,
  onChange,
  controls,
}: {
  value: FilterId;
  onChange: (id: FilterId) => void;
  controls: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const move = (to: number) => {
    const i = (to + FILTERS.length) % FILTERS.length;
    refs.current[i]?.focus();
    onChange(FILTERS[i].id);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        move(index + 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        move(index - 1);
        break;
      case 'Home':
        e.preventDefault();
        move(0);
        break;
      case 'End':
        e.preventDefault();
        move(FILTERS.length - 1);
        break;
    }
  };

  return (
    <div className="filters" role="radiogroup" aria-label="Filter projects by category" aria-controls={controls}>
      {FILTERS.map((f, i) => {
        const checked = f.id === value;
        return (
          <button
            key={f.id}
            ref={(el) => (refs.current[i] = el)}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            className={`filter ${checked ? 'is-active' : ''}`}
            data-filter={f.id}
            onClick={() => onChange(f.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            {f.icon && <Glyph k={f.icon} className="filter__icon" />}
            <span>{f.label}</span>
          </button>
        );
      })}
    </div>
  );
}
