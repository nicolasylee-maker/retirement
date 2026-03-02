export const COLORS = {
  sunset: { main: '#f97316', light: '#fed7aa', dark: '#c2410c' },
  lake: { main: '#0ea5e9', light: '#bae6fd', dark: '#0369a1' },
  forest: { main: '#22c55e', light: '#bbf7d0', dark: '#15803d' },
  danger: '#ef4444',
  warning: '#f59e0b',
  success: '#22c55e',
  gray: { 50: '#f9fafb', 100: '#f3f4f6', 200: '#e5e7eb', 500: '#6b7280', 700: '#374151', 900: '#111827' },
};

// Recharts color palette for account types
export const CHART_COLORS = {
  rrsp: '#f97316',
  tfsa: '#22c55e',
  nonReg: '#0ea5e9',
  other: '#8b5cf6',
  pension: '#ec4899',
  total: '#374151',
};

// Recharts color palette for income vs expense chart
export const INCOME_COLORS = {
  employment: '#6b7280',  // gray-500
  cpp: '#3b82f6',         // blue-500
  oas: '#14b8a6',         // teal-500
  gis: '#06b6d4',         // cyan-500
  gains: '#a78bfa',       // violet-400
  pension: '#ec4899',     // pink-500
  rrspWithdrawal: '#f97316',  // orange-500
  tfsaWithdrawal: '#22c55e',  // green-500
  nonRegWithdrawal: '#0ea5e9', // sky-500
  otherWithdrawal: '#8b5cf6',  // violet-500
  expenses: '#ef4444',    // red-500
  debtPayments: '#f97316', // orange-500
};

// Recharts color palette for scenario comparison
export const SCENARIO_COLORS = ['#f97316', '#0ea5e9', '#22c55e', '#8b5cf6'];

export const CHART_STYLE = {
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: 12,
  gridColor: '#e5e7eb',
  tooltipBg: '#ffffff',
};
