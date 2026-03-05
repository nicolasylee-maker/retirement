import React from 'react';
import SummaryCard from '../../components/SummaryCard';
import { formatCurrency, formatPercent } from '../../utils/formatters';

export default function EstateSummaryCards({ estateResult }) {
  if (!estateResult) return null;

  const { grossEstate, totalEstateTax, netToHeirs,
    deemedIncomeTax, capitalGainsTax, probateFees } = estateResult;
  const effectiveRate = grossEstate > 0 ? totalEstateTax / grossEstate : 0;
  const retainedPct = grossEstate > 0 ? ((netToHeirs / grossEstate) * 100).toFixed(1) : '0';

  const assetItems = [
    ...(estateResult.rrspRrifBalance > 0 ? [{ label: 'RRSP / RRIF', value: estateResult.rrspRrifBalance, color: '#f97316',
      sub: 'Full balance becomes taxable income at death (unless spouse rollover)' }] : []),
    ...(estateResult.tfsaBalance > 0 ? [{ label: 'TFSA', value: estateResult.tfsaBalance, color: '#22c55e',
      sub: 'Passes to heirs tax-free — no tax on growth' }] : []),
    ...(estateResult.nonRegBalance > 0 ? [{ label: 'Non-Registered', value: estateResult.nonRegBalance, color: '#0ea5e9',
      sub: 'Deemed sold at death — capital gains tax applies' }] : []),
    ...(estateResult.realEstateValue > 0 ? [{ label: 'Real Estate', value: estateResult.realEstateValue, color: '#d97706',
      sub: 'Primary residence is capital gains exempt but still subject to probate' }] : []),
    ...(estateResult.otherBalance > 0 ? [{ label: 'Other', value: estateResult.otherBalance, color: '#8b5cf6' }] : []),
    ...(estateResult.spouseRrspBalance > 0 ? [{ label: 'Spouse RRSP/RRIF', value: estateResult.spouseRrspBalance, color: '#fb923c',
      sub: 'Surviving spouse\'s own RRSP — no tax impact (not part of deceased\'s estate)' }] : []),
    ...(estateResult.spouseTfsaBalance > 0 ? [{ label: 'Spouse TFSA', value: estateResult.spouseTfsaBalance, color: '#86efac',
      sub: 'Surviving spouse\'s own TFSA — tax-free, retained by spouse' }] : []),
  ];
  // If no assets but real estate excluded, explain why
  if (assetItems.length === 0 && estateResult.realEstateExcluded) {
    assetItems.push({ label: 'Investment accounts depleted', value: '$0',
      sub: `All savings drawn down by age ${estateResult.ageAtDeath}` });
  }
  if (estateResult.realEstateExcluded) {
    assetItems.push({ label: `Real Estate (excluded)`, value: formatCurrency(estateResult.excludedRealEstateValue),
      sub: 'Not included — "Include Real Estate" is unchecked in Estate settings. Toggle it on the Estate wizard step to include.' });
  }

  const grossHelp = {
    title: 'Gross Estate Value',
    subtitle: `Everything you own at the time of death (age ${estateResult.ageAtDeath}), before taxes and fees.`,
    sections: [
      {
        heading: 'Assets included',
        items: assetItems,
      },
    ],
    bar: [
      { label: 'RRSP/RRIF', value: estateResult.rrspRrifBalance || 0, color: '#f97316' },
      { label: 'TFSA', value: estateResult.tfsaBalance || 0, color: '#22c55e' },
      { label: 'Non-Reg', value: estateResult.nonRegBalance || 0, color: '#0ea5e9' },
      { label: 'Spouse RRSP', value: estateResult.spouseRrspBalance || 0, color: '#fb923c' },
      { label: 'Spouse TFSA', value: estateResult.spouseTfsaBalance || 0, color: '#86efac' },
      { label: 'Real Estate', value: estateResult.realEstateValue || 0, color: '#d97706' },
    ].filter(i => i.value > 0),
  };

  const taxHelp = {
    title: 'Tax & Fees at Death',
    subtitle: `The government takes ${formatPercent(effectiveRate)} of your estate through income tax, capital gains tax, and probate fees.`,
    sections: [
      {
        heading: 'Tax breakdown',
        items: [
          ...(deemedIncomeTax > 0 ? [{ label: 'Deemed Income Tax (RRSP/RRIF)', value: deemedIncomeTax, negative: true, color: '#ef4444',
            sub: 'The CRA treats your entire RRSP/RRIF as income in your final tax return' }] : []),
          ...(capitalGainsTax > 0 ? [{ label: 'Capital Gains Tax', value: capitalGainsTax, negative: true, color: '#f97316',
            sub: 'Tax on unrealized gains in non-registered accounts' }] : []),
          ...(probateFees > 0 ? [{ label: 'Ontario Probate Fees', value: probateFees, negative: true, color: '#8b5cf6',
            sub: '$5/thousand on first $50K + $15/thousand above that' }] : []),
        ].filter(i => i.value),
      },
      {
        heading: 'Total impact',
        items: [
          { label: 'Total Taxes & Fees', value: totalEstateTax, negative: true, color: '#ef4444' },
          { label: 'Effective Rate', value: formatPercent(effectiveRate),
            sub: 'Percentage of your estate that goes to the government' },
        ],
      },
    ],
    bar: [
      { label: 'Income Tax', value: deemedIncomeTax || 0, color: '#ef4444' },
      { label: 'Cap Gains', value: capitalGainsTax || 0, color: '#f97316' },
      { label: 'Probate', value: probateFees || 0, color: '#8b5cf6' },
    ].filter(i => i.value > 0),
  };

  const netHelp = {
    title: 'Net to Heirs',
    subtitle: 'The real inheritance — what your beneficiaries actually receive.',
    sections: [
      {
        heading: 'Calculation',
        items: [
          { label: 'Gross Estate', value: grossEstate, color: '#22c55e' },
          { label: 'Minus Tax & Fees', value: -totalEstateTax, negative: true, color: '#ef4444' },
          { label: 'Net to Heirs', value: netToHeirs, color: '#22c55e',
            sub: `Your heirs keep ${retainedPct}% of the estate` },
        ],
      },
    ],
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <SummaryCard
        label="Gross Estate"
        value={formatCurrency(grossEstate)}
        richHelp={grossHelp}
        color="sunset"
      />
      <SummaryCard
        label="Total Tax & Fees"
        value={formatCurrency(totalEstateTax)}
        subtitle={`Effective rate: ${formatPercent(effectiveRate)}`}
        richHelp={taxHelp}
        color="danger"
      />
      <SummaryCard
        label="Net to Heirs"
        value={formatCurrency(netToHeirs)}
        richHelp={netHelp}
        color="forest"
      />
    </div>
  );
}
