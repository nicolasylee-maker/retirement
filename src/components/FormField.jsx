import React, { useState, useRef, useCallback } from 'react';

function addCommas(v) {
  if (v == null || v === '') return '';
  const parts = String(v).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

function stripCommas(s) {
  return s.replace(/,/g, '');
}

// After formatting a number, find the cursor index in the formatted string
// such that rawPos non-comma characters have been passed.
function findCursorInFormatted(formatted, rawPos) {
  if (rawPos === 0) return 0;
  let rawCount = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (formatted[i] !== ',') rawCount++;
    if (rawCount === rawPos) return i + 1;
  }
  return formatted.length;
}

export default function FormField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  helper,
  error,
  prefix,
  suffix,
  min,
  max,
  step,
  disabled = false,
  className = '',
  placeholder,
}) {
  const isNum = type === 'number';
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState('');
  const inputRef = useRef(null);

  const handleChange = useCallback((e) => {
    if (!onChange) return;
    if (isNum) {
      const proposedValue = e.target.value;
      const cursorPos = e.target.selectionStart;
      const raw = stripCommas(proposedValue);
      if (raw === '' || raw === '-') {
        setEditVal(raw);
        onChange(raw === '' ? '' : raw);
        return;
      }
      if (!/^-?\d*\.?\d*$/.test(raw)) return;
      const formatted = addCommas(raw);
      setEditVal(formatted);
      onChange(Number(raw));
      // Restore cursor: count raw chars before cursor in proposed value, then find that
      // position in the reformatted string (accounting for added/removed commas).
      const rawCursorPos = proposedValue.slice(0, cursorPos).replace(/,/g, '').length;
      requestAnimationFrame(() => {
        if (inputRef.current) {
          const newPos = findCursorInFormatted(formatted, rawCursorPos);
          inputRef.current.setSelectionRange(newPos, newPos);
        }
      });
    } else {
      onChange(e.target.value);
    }
  }, [onChange, isNum]);

  const handleFocus = useCallback(() => {
    if (isNum) {
      setEditing(true);
      setEditVal(value == null || value === '' ? '' : addCommas(String(value)));
    }
  }, [isNum, value]);

  const handleBlur = useCallback(() => {
    setEditing(false);
  }, []);

  const displayValue = isNum
    ? (editing ? editVal : addCommas(value))
    : (value ?? '');

  const hasAdornment = prefix || suffix;

  const inputElement = (
    <input
      ref={inputRef}
      id={name}
      name={name}
      type="text"
      inputMode={isNum ? 'decimal' : undefined}
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      disabled={disabled}
      placeholder={placeholder}
      className={
        hasAdornment
          ? `flex-1 min-w-0 border-0 bg-transparent py-0 text-sm focus:outline-none focus:ring-0
             text-gray-900 placeholder-gray-400 ${prefix ? 'pl-0' : 'pl-3'} ${suffix ? 'pr-0' : 'pr-3'}`
          : `input-base ${error ? 'border-red-400 focus:ring-red-400 focus:border-red-400' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`
      }
    />
  );

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}

      {hasAdornment ? (
        <div
          className={`flex items-center input-base ${
            error ? 'border-red-400 focus-within:ring-red-400 focus-within:border-red-400' : ''
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {prefix && (
            <span className="pl-2 text-gray-500 select-none text-sm">{prefix}</span>
          )}
          {inputElement}
          {suffix && (
            <span className="pr-2 text-gray-500 select-none text-sm">{suffix}</span>
          )}
        </div>
      ) : (
        inputElement
      )}

      {error && (
        <p className="text-sm text-red-500 mt-1">{error}</p>
      )}
      {helper && !error && (
        <p className="text-sm text-gray-500 mt-1">{helper}</p>
      )}
    </div>
  );
}
