const currencyFmt = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const currencyFmtCents = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(value, decimals = false) {
  if (value == null || isNaN(value)) return '$0';
  return decimals ? currencyFmtCents.format(value) : currencyFmt.format(value);
}

export function formatCurrencyShort(value) {
  if (value == null || isNaN(value)) return '$0';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

export function formatPercent(value, decimals = 1) {
  if (value == null || isNaN(value)) return '0%';
  return `${(value * 100).toFixed(decimals)}%`;
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function uuid() {
  return crypto.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function sum(...values) {
  return values.reduce((a, b) => a + (Number(b) || 0), 0);
}

/**
 * Build a Markdown table from headers and rows.
 * @param {string[]} headers  Column header labels
 * @param {Array<Array<string|number>>} rows  2D array of cell values
 * @returns {string} Markdown table string
 */
export function mdTable(headers, rows) {
  const sep = headers.map(() => '---');
  const lines = [
    `| ${headers.join(' | ')} |`,
    `| ${sep.join(' | ')} |`,
    ...rows.map((r) => `| ${r.join(' | ')} |`),
  ];
  return lines.join('\n');
}
