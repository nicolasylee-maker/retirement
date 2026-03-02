const API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';

// Simple in-memory cache keyed by type+hash
const cache = new Map();

export function getApiKey() {
  return localStorage.getItem('gemini_api_key') || '';
}

export function setApiKey(key) {
  localStorage.setItem('gemini_api_key', key.trim());
}

export function hasApiKey() {
  return !!getApiKey();
}

export function clearApiKey() {
  localStorage.removeItem('gemini_api_key');
}

function hashData(obj) {
  return JSON.stringify(obj).slice(0, 200);
}

function buildPrompt(type, data) {
  const base = [
    'You are a friendly, knowledgeable Canadian financial advisor helping Ontario retirees',
    'understand their retirement plan in plain language — no jargon.',
    'Be specific with dollar amounts. Use Canadian financial terms (RRSP, TFSA, RRIF, CPP, OAS, GIS).',
    'IMPORTANT: Provide exactly 4 numbered recommendations. Each one should be 2-3 sentences explaining the issue,',
    'then a bullet point starting with "- Alternative:" suggesting a different approach.',
    'Start with a one-line overall assessment using: ✅ for solid plans, ⚠️ for needs attention,',
    '🚨 for critical concerns.',
    'Example format:\n\nOverall Assessment: ⚠️ Needs Attention\n\n',
    '1. **First Point:** Explain the issue in 2-3 sentences with specific dollar amounts.',
    '\n- Alternative: Describe a different approach they could consider.\n\n',
    '2. **Second Point:** Details here.\n- Alternative: Another option.\n\n',
    '3. **Third Point:** Details here.\n- Alternative: Another option.\n\n',
    '4. **Fourth Point:** Details here.\n- Alternative: Another option.',
  ].join(' ');

  if (type === 'dashboard') {
    return `${base}

Based on this Ontario retirement scenario, provide exactly 4 numbered recommendations with alternatives:
- Age ${data.currentAge}, retiring at ${data.retirementAge}, plan to age ${data.lifeExpectancy}
- Monthly expenses: $${data.monthlyExpenses}
- Net worth at retirement: $${data.netWorthAtRetirement}
- Annual retirement income: $${data.annualIncome}, Tax: $${data.annualTax}
- Sustainable monthly spending: $${data.sustainableMonthly}
- Portfolio at life expectancy: $${data.portfolioAtEnd}
- RRSP: $${data.rrspBalance}, TFSA: $${data.tfsaBalance}, Non-reg: $${data.nonRegBalance}
- CPP: $${data.cppMonthly}/mo at age ${data.cppStartAge}, OAS: $${data.oasMonthly}/mo at age ${data.oasStartAge}
${data.pensionIncome ? `- Pension: $${data.pensionIncome}/yr` : '- No employer pension'}

For each recommendation, explain the financial impact in dollars and suggest an alternative strategy.`;
  }

  if (type === 'compare') {
    const scenarioText = data.scenarios
      .map(
        (s, i) =>
          `Scenario ${i + 1} "${s.name}": Net worth $${s.netWorthAtRetirement}, ` +
          `Sustainable monthly $${s.sustainableMonthly}, Tax $${s.annualTax}, ` +
          `Portfolio at ${s.lifeExpectancy}: $${s.portfolioAtEnd}`,
      )
      .join('\n');
    return `${base}

Compare these Ontario retirement scenarios and recommend which is better:
${scenarioText}

Highlight key trade-offs with specific dollar amounts. For each point, suggest an alternative approach.`;
  }

  if (type === 'estate') {
    return `${base}

Analyze this Ontario estate plan:
- Death at age ${data.ageAtDeath}
- Gross estate: $${data.grossEstate}, Tax & fees: $${data.totalTax}, Net to heirs: $${data.netToHeirs}
- Has will: ${data.hasWill ? 'Yes' : 'No'}
- Primary beneficiary: ${data.primaryBeneficiary}
- RRSP/RRIF at death: $${data.rrspBalance}, Spouse rollover: ${data.spouseRollover ? 'Yes' : 'No'}

Provide exactly 4 numbered estate planning recommendations with alternatives, focused on Ontario-specific tax reduction strategies.`;
  }

  if (type === 'debt') {
    return `${base}

Analyze this Ontario retiree's debt situation and its impact on retirement:
- Total debt: $${data.totalDebt}, Total lifetime interest: $${data.totalInterest}
- Consumer debt: $${data.consumerDebt || 0} at ${((data.consumerRate || 0.08) * 100).toFixed(1)}%
- Mortgage: $${data.mortgageBalance || 0} at ${((data.mortgageRate || 0.05) * 100).toFixed(1)}%
- Current age: ${data.currentAge}, Retirement age: ${data.retirementAge}, Debt-free by: age ${data.debtFreeAge}
- Monthly debt payments: $${Math.round(data.monthlyPayments || 0)}

Provide exactly 4 numbered recommendations about managing debt before and during retirement, including the opportunity cost of debt payments vs investing.`;
  }

  return `${base}\n\nProvide general Ontario retirement planning advice with alternatives.`;
}

export async function getAiRecommendation(type, data, forceRefresh = false) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('NO_API_KEY');

  const cacheKey = `${type}:${hashData(data)}`;
  if (!forceRefresh && cache.has(cacheKey)) return cache.get(cacheKey);
  if (forceRefresh) cache.delete(cacheKey);

  const prompt = buildPrompt(type, data);

  const response = await fetch(`${API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    if (response.status === 401 || response.status === 403) {
      throw new Error('INVALID_API_KEY');
    }
    throw new Error(err.error?.message || `API error ${response.status}`);
  }

  const result = await response.json();
  const text =
    result.candidates?.[0]?.content?.parts?.[0]?.text ||
    'No recommendation available.';
  cache.set(cacheKey, text);
  return text;
}
