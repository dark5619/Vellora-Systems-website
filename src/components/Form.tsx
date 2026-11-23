import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Glyph } from './primitives';
import type { AssetKey } from '../lib/assets';

interface FieldShell {
  id: string;
  label: string;
  required?: boolean;
  optional?: boolean;
  icon?: AssetKey;
  error?: string;
  hint?: ReactNode;
  className?: string;
}

function Label({ id, label, required, optional }: Pick<FieldShell, 'id' | 'label' | 'required' | 'optional'>) {
  return (
    <label className="field__label" htmlFor={id}>
      {label}
      {required && (
        <span className="req" aria-hidden="true">
          {' '}*
        </span>
      )}
      {optional && <span className="opt"> (Optional)</span>}
    </label>
  );
}

function describedBy(id: string, error?: string, hint?: ReactNode) {
  return [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(' ') || undefined;
}

function FieldError({ id, error }: { id: string; error?: string }) {
  return error ? (
    <p id={`${id}-error`} className="field__error">
      {error}
    </p>
  ) : null;
}

type InputProps = FieldShell & Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'className'>;
export const TextField = forwardRef<HTMLInputElement, InputProps>(function TextField(
  { id, label, required, optional, icon, error, hint, className = '', ...rest },
  ref,
) {
  return (
    <div className={`field ${className}`}>
      <Label id={id} label={label} required={required} optional={optional} />
      <div className="field__control">
        {icon && <Glyph k={icon} className="field__icon" />}
        <input
          ref={ref}
          id={id}
          className="input"
          required={required}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, hint)}
          {...rest}
        />
      </div>
      <FieldError id={id} error={error} />
    </div>
  );
});

type SelectProps = FieldShell &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id' | 'className'> & {
    placeholder: string;
    options: readonly { value: string; label: string }[];
    chevron: AssetKey;
  };
export const SelectField = forwardRef<HTMLSelectElement, SelectProps>(function SelectField(
  { id, label, required, optional, icon, error, hint, className = '', placeholder, options, chevron, value, ...rest },
  ref,
) {
  return (
    <div className={`field ${className}`}>
      <Label id={id} label={label} required={required} optional={optional} />
      <div className="field__control">
        {icon && <Glyph k={icon} className="field__icon" />}
        <select
          ref={ref}
          id={id}
          className={`input ${value ? '' : 'is-placeholder'}`}
          required={required}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, hint)}
          value={value}
          {...rest}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <Glyph k={chevron} className="field__chevron" />
      </div>
      <FieldError id={id} error={error} />
    </div>
  );
});

type AreaProps = FieldShell & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id' | 'className'> & { counter?: ReactNode };
export const TextAreaField = forwardRef<HTMLTextAreaElement, AreaProps>(function TextAreaField(
  { id, label, required, optional, icon, error, hint, className = '', counter, ...rest },
  ref,
) {
  return (
    <div className={`field ${className}`}>
      <Label id={id} label={label} required={required} optional={optional} />
      <div className="field__control field__control--area">
        {icon && <Glyph k={icon} className="field__icon" />}
        <textarea
          ref={ref}
          id={id}
          className="input"
          required={required}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, hint)}
          {...rest}
        />
        {counter}
      </div>
      <FieldError id={id} error={error} />
    </div>
  );
});
