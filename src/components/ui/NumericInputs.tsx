'use client';

import React, { useEffect, useState } from 'react';

/**
 * Formata um número decimal para exibição no padrão brasileiro (ex: 15.5 -> "15,5", 9.1 -> "9,1")
 */
export function formatPtBrNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '';
  return String(value).replace('.', ',');
}

/**
 * Filtra uma string permitindo apenas números (0-9) e no máximo uma vírgula/ponto decimal
 */
export function sanitizeDecimalString(raw: string): string {
  const onlyValid = raw.replace(/[^0-9.,]/g, '').replace(/\./g, ',');
  const parts = onlyValid.split(',');
  if (parts.length <= 1) return onlyValid;
  return `${parts[0]},${parts.slice(1).join('')}`;
}

/**
 * Converte uma string com vírgula ou ponto (ex: "15,5" ou "9,1") em number
 */
export function parseDecimalString(raw: string): number | null {
  const cleaned = sanitizeDecimalString(raw).trim();
  if (!cleaned || cleaned === ',') return null;
  const normalized = cleaned.replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Filtra uma string permitindo exclusivamente dígitos inteiros (0-9)
 */
export function sanitizeIntegerString(raw: string): string {
  return raw.replace(/\D/g, '');
}

interface DecimalInputProps {
  value: number | null | undefined;
  onChange: (nextValue: number | null) => void;
  className?: string;
  placeholder?: string;
  ariaLabel?: string;
}

/**
 * Input numérico decimal otimizado para iPhone (iOS) e Android:
 * - Abre exclusivamente o teclado numérico com vírgula (`inputMode="decimal"`)
 * - Permite digitar valores decimais como "15,5", "9,1", "22,5" livremente sem travar na vírgula
 * - Bloqueia letras e símbolos inválidos
 */
export function DecimalInput({
  value,
  onChange,
  className = '',
  placeholder = '0',
  ariaLabel,
}: DecimalInputProps) {
  const [text, setText] = useState<string>(() => formatPtBrNumber(value));
  const [isFocused, setIsFocused] = useState(false);

  // Sincroniza quando o valor externo muda (ex: preenchimento automático pelo botão "Anterior")
  useEffect(() => {
    if (!isFocused) {
      setText(formatPtBrNumber(value));
    } else {
      const currentParsed = parseDecimalString(text);
      if (value !== currentParsed) {
        setText(formatPtBrNumber(value));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizeDecimalString(e.target.value);
    setText(sanitized);
    const parsed = parseDecimalString(sanitized);
    onChange(parsed);
  };

  const handleBlur = () => {
    setIsFocused(false);
    const parsed = parseDecimalString(text);
    setText(formatPtBrNumber(parsed));
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      pattern="[0-9]*[.,]?[0-9]*"
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      aria-label={ariaLabel}
      placeholder={placeholder}
      value={text}
      onFocus={(e) => {
        setIsFocused(true);
        e.currentTarget.select();
      }}
      onBlur={handleBlur}
      onChange={handleChange}
      className={className}
    />
  );
}

interface IntegerInputProps {
  value: number | null | undefined;
  onChange: (nextValue: number | null) => void;
  className?: string;
  placeholder?: string;
  ariaLabel?: string;
}

/**
 * Input numérico inteiro otimizado para iPhone (iOS) e Android:
 * - Abre exclusivamente o teclado numérico puro de 0 a 9 (`inputMode="numeric"`)
 * - Bloqueia qualquer caractere não numérico
 */
export function IntegerInput({
  value,
  onChange,
  className = '',
  placeholder = '0',
  ariaLabel,
}: IntegerInputProps) {
  const [text, setText] = useState<string>(() =>
    value === null || value === undefined ? '' : String(Math.round(value))
  );
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const formatted =
      value === null || value === undefined ? '' : String(Math.round(value));
    if (!isFocused) {
      setText(formatted);
    } else {
      const currentParsed = text === '' ? null : Number(text);
      if (value !== currentParsed) {
        setText(formatted);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizeIntegerString(e.target.value);
    setText(sanitized);
    onChange(sanitized === '' ? null : Number(sanitized));
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (text === '') {
      setText('');
    } else {
      setText(String(Number(text)));
    }
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      aria-label={ariaLabel}
      placeholder={placeholder}
      value={text}
      onFocus={(e) => {
        setIsFocused(true);
        e.currentTarget.select();
      }}
      onBlur={handleBlur}
      onChange={handleChange}
      className={className}
    />
  );
}
