import { calcTotalTax, calcRrifMinimum } from '../../engines/taxEngine.js';
import { formatCurrencyShort } from '../../utils/formatters.js';

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

export const WATERFALL_COLORS = {
  growth:      '#3B7A6B', // sage green  — investment growth
  surplus:     '#7BC4A8', // light green — salary surplus deposited
  expenseGap:  '#E07A5F', // coral       — expenses not covered by after-tax income
  debtPayment: '#C05746', // warm red    — debt funded by portfolio
  taxDrain:    '#C4884D', // orange      — portfolio-funded tax (non-meltdown)
  meltdownTax: '#D4A574', // amber       — extra tax from RRSP meltdown strategy
  shortfall:   '#B91C1C', // dark red    — unfunded post-depletion shortfall
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** All non-portfolio income sources (taxable + non-taxable). */
function npiFullFromRow(row) {
  return (row.employmentIncome || 0)
       + (row.nonTaxedIncome   || 0)
       + (row.cppIncome        || 0)
       + (row.oasIncome        || 0)
       + (row.gisIncome        || 0)
       + (row.gainsIncome      || 0)
       + (row.pensionIncome    || 0);
}

/** Taxable non-portfolio income (no portfolio withdrawals, no capital gains). */
function taxableNpiFromRow(row) {
  return (row.employmentIncome || 0)
       + (row.cppIncome        || 0)
       + (row.oasIncome        || 0)
       + (row.pensionIncome    || 0);
}

/** Initial portfolio from scenario fields (used as prevPortfolio for the first row). */
function scenarioStartPortfolio(s) {
  return (s.rrspBalance       || 0)
       + (s.rrifBalance       || 0)
       + (s.dcPensionBalance  || 0)
       + (s.liraBalance       || 0)
       + (s.tfsaBalance       || 0)
       + (s.nonRegInvestments || 0)
       + (s.cashSavings       || 0)
       + (s.otherAssets       || 0);
}

const avg = (rows, key) =>
  rows.length ? rows.reduce((s, r) => s + (r[key] || 0), 0) / rows.length : 0;

const fmtDollar = (n) => formatCurrencyShort(Math.round(Math.abs(n)));

// ---------------------------------------------------------------------------
// buildWaterfallData
// ---------------------------------------------------------------------------

/**
 * Build per-year waterfall segments for the "What's Driving the Change?" chart.
 *
 * Returns one object per projection row. Positive values = green bars (good
 * for portfolio), negative values = red bars (drains). Post-depletion rows
 * carry only _shortfall; all other fields are 0.
 *
 * ── Chart identity (holds for all non-post-depletion rows, within ~$15 rounding) ──
 *
 *   investmentGrowth + salarySurplus
 *     − expenseGap − debtPayment − taxDrain − meltdownTax
 *   = portfolioChange
 *
 * Why investmentGrowth = portfolioChange + W − surplusDeposits is exact:
 *   The engine applies growth AFTER withdrawals and deposits, so
 *   G = (P_start − W + D) × r  →  rearranges to  G = portfolioChange + W − D.
 *
 * Why Identity 1 (sum_of_red = W) FAILS for meltdown years:
 *   In a meltdown year where salary covers expenses, the gross RRSP withdrawal W
 *   includes both the permanent tax cost (meltdownTaxLeakage, a red bar) AND
 *   the after-tax proceeds recycled into TFSA (NOT a red bar — they appear in
 *   surplusDeposits). So sum_of_red = meltdownTaxLeakage ≪ W.
 *   The chart identity still holds because salarySurplus (true employment
 *   surplus, excluding recycled meltdown proceeds) accounts for the difference.
 *
 * ── Tax decomposition invariant ──
 *   taxDrain + meltdownTax = totalTax − T_s    (within ~$15 rounding)
 *   taxDrain ≥ 0,  meltdownTax ≥ 0
 *
 * NOTE: O(n) extra calcTotalTax() calls per render. Keep this computation
 * behind a useMemo guard with activeView as a dependency so it only runs
 * when the Drivers view is active.
 */
export function buildWaterfallData(scenario, projectionData) {
  const s = scenario;
  const realReturn       = s.realReturn || 0.04;
  const meltdownStartAge = s.rrspMeltdownStartAge ?? s.retirementAge;
  const meltdownTargetAge = s.rrspMeltdownTargetAge || 71;
  const initialPortfolio  = scenarioStartPortfolio(s);

  return projectionData.map((row, i) => {
    const prev          = i > 0 ? projectionData[i - 1] : null;
    const prevPortfolio = prev ? prev.totalPortfolio : initialPortfolio;
    const portfolioChange = row.totalPortfolio - prevPortfolio;

    // ── Post-depletion: portfolio at zero (including the first year it depletes) ──
    // The "depletion year" (first time totalPortfolio = 0) has a large solver gap
    // equal to the unfunded shortfall. Treat it the same as subsequent depleted years.
    const isPostDepletion = row.totalPortfolio <= 0;
    if (isPostDepletion) {
      const npi      = npiFullFromRow(row);
      const shortfall = Math.max(0, (row.expenses || 0) + (row.debtPayments || 0) - npi);
      return {
        age: row.age,
        isPostDepletion: true,
        _growth:      0,
        _surplus:     0,
        _expenseGap:  0,
        _debtPayment: 0,
        _taxDrain:    0,
        _meltdownTax: 0,
        _shortfall:  -shortfall,
        portfolioChange: 0,
        // Raw positives for tooltip
        _growthRaw:      0,
        _surplusRaw:     0,
        _expenseGapRaw:  shortfall,
        _debtPaymentRaw: 0,
        _taxDrainRaw:    0,
        _meltdownTaxRaw: 0,
        _shortfallRaw:   shortfall,
        _totalWithdrawals:   0,
        _portfolioFundedTax: 0,
      };
    }

    // ── Investment growth (exact algebraic derivation) ──────────────────────
    const W = (row.rrspWithdrawal  || 0) + (row.tfsaWithdrawal  || 0)
            + (row.nonRegWithdrawal || 0) + (row.otherWithdrawal || 0);
    const surplusDeposits  = (row.tfsaDeposit || 0) + (row.nonRegDeposit || 0);
    const investmentGrowth = portfolioChange + W - surplusDeposits;

    // ── Tax decomposition ────────────────────────────────────────────────────
    const taxableNPI     = taxableNpiFromRow(row);
    // hasPension for T_s: only DB pension qualifies when there are no RRSP withdrawals
    const hasPensionForTs = row.pensionIncome > 0;
    const T_s             = calcTotalTax(taxableNPI, row.age, hasPensionForTs);
    const T               = row.totalTax || 0;
    const portfolioFundedTax = Math.max(0, T - T_s);

    // Meltdown tax leakage: extra tax caused specifically by the meltdown
    // strategy above any RRIF minimum that would be required regardless.
    let meltdownTaxLeakage = 0;
    const meltdownActive = s.rrspMeltdownEnabled
      && row.age >= meltdownStartAge
      && row.age < meltdownTargetAge;

    if (meltdownActive && row.rrspWithdrawal > 0) {
      // Estimate RRSP balance at start of this year by dividing out growth.
      // (RRSP has no deposit path, so rrspEnd = rrspStart_preWithdrawal × (1+r) exactly.)
      const rrspStart = prev
        ? prev.rrspBalance / (1 + realReturn)
        : (s.rrspBalance || 0);
      const rrifMin      = calcRrifMinimum(rrspStart, row.age);
      const meltdownExtra = Math.max(0, row.rrspWithdrawal - rrifMin);
      if (meltdownExtra > 0) {
        const taxWithRrifOnly  = calcTotalTax(taxableNPI + rrifMin,            row.age, hasPensionForTs);
        const taxWithMeltdown  = calcTotalTax(taxableNPI + row.rrspWithdrawal, row.age, hasPensionForTs);
        meltdownTaxLeakage     = Math.max(0, taxWithMeltdown - taxWithRrifOnly);
      }
    }

    // taxDrain = portfolio-funded tax NOT attributable to the meltdown strategy
    // Invariant: taxDrain + meltdownTaxLeakage = portfolioFundedTax  (= T − T_s)
    const taxDrain = Math.max(0, portfolioFundedTax - meltdownTaxLeakage);

    // ── Expense and debt coverage ────────────────────────────────────────────
    const NPI_full    = npiFullFromRow(row);
    const afterTaxNPI = NPI_full - T_s; // after-tax income from non-portfolio sources
    const E           = row.expenses    || 0;
    const D           = row.debtPayments || 0;

    // salarySurplus: true new-money surplus from employment.
    // Important: this is NOT tfsaDeposit + nonRegDeposit in meltdown years,
    // because surplusDeposits also includes recycled meltdown after-tax proceeds.
    const salarySurplus = Math.max(0, afterTaxNPI - E - D);

    // Split portfolio-funded needs: expenses first, then debt.
    const afterTaxNPI_pos   = Math.max(0, afterTaxNPI);
    const salaryCoveredExp  = Math.min(E, afterTaxNPI_pos);
    const salaryCoveredDebt = Math.min(D, Math.max(0, afterTaxNPI_pos - salaryCoveredExp));
    const expenseGap        = E - salaryCoveredExp;
    const debtPayment       = D - salaryCoveredDebt;

    return {
      age: row.age,
      isPostDepletion: false,
      // Recharts values: positive = green stack, negative = red stack
      _growth:      investmentGrowth,
      _surplus:     salarySurplus,
      _expenseGap: -expenseGap,
      _debtPayment:-debtPayment,
      _taxDrain:   -taxDrain,
      _meltdownTax:-meltdownTaxLeakage,
      _shortfall:   0,
      portfolioChange,
      // Raw positives for tooltip display
      _growthRaw:      Math.max(0, investmentGrowth),
      _surplusRaw:     salarySurplus,
      _expenseGapRaw:  expenseGap,
      _debtPaymentRaw: debtPayment,
      _taxDrainRaw:    taxDrain,
      _meltdownTaxRaw: meltdownTaxLeakage,
      _shortfallRaw:   0,
      _totalWithdrawals:    W,
      _portfolioFundedTax:  portfolioFundedTax,
    };
  });
}

// ---------------------------------------------------------------------------
// buildWaterfallInsight
// ---------------------------------------------------------------------------

/**
 * Generate the one-line insight shown above the waterfall chart.
 * Adapts to the user's current life phase.
 */
export function buildWaterfallInsight(scenario, waterfallData, projectionData) {
  if (!waterfallData || waterfallData.length === 0) return '';

  const retAge        = scenario.retirementAge;
  const depletedRows  = waterfallData.filter(r => r.isPostDepletion);
  const activeWFRows  = waterfallData.filter(r => !r.isPostDepletion);

  // All depleted
  if (activeWFRows.length === 0) {
    const avgShortfall = depletedRows.reduce((s, r) => s + r._shortfallRaw, 0) / depletedRows.length;
    return `Portfolio is empty. Annual shortfall: ${fmtDollar(avgShortfall)}/yr`;
  }

  // Post-depletion suffix to append when some years are depleted
  const depletionSuffix = depletedRows.length > 0
    ? ` (depletes at age ${depletedRows[0].age})`
    : '';

  const lastActiveAge = activeWFRows[activeWFRows.length - 1].age;

  // Pre-retirement: show biggest portfolio drain
  if (lastActiveAge < retAge) {
    const drains = [
      { label: 'debt payments', val: avg(activeWFRows, '_debtPaymentRaw') },
      { label: 'taxes',         val: avg(activeWFRows, '_taxDrainRaw') + avg(activeWFRows, '_meltdownTaxRaw') },
      { label: 'expense gap',   val: avg(activeWFRows, '_expenseGapRaw') },
    ].filter(d => d.val > 0);

    if (drains.length === 0) return `Your portfolio is growing pre-retirement${depletionSuffix}.`;
    drains.sort((a, b) => b.val - a.val);
    const top = drains[0];
    return `Your biggest portfolio drain is ${top.label} at ${fmtDollar(top.val)}/yr${depletionSuffix}.`;
  }

  // Post-depletion announced above; if some rows remain active use retirement insight
  const retiredProjRows = projectionData.filter(r => r.age >= retAge && r.totalPortfolio > 0);
  if (retiredProjRows.length === 0) {
    const avgShortfall = depletedRows.reduce((s, r) => s + r._shortfallRaw, 0) / Math.max(1, depletedRows.length);
    return `Portfolio is empty. Annual shortfall: ${fmtDollar(avgShortfall)}/yr`;
  }

  const avgCpp      = avg(retiredProjRows, 'cppIncome');
  const avgOas      = avg(retiredProjRows, 'oasIncome');
  const avgPension  = avg(retiredProjRows, 'pensionIncome');
  const avgExp      = avg(retiredProjRows, 'expenses');
  const benefitsTotal = avgCpp + avgOas + avgPension;
  const pct = avgExp > 0 ? Math.min(100, Math.round((benefitsTotal / avgExp) * 100)) : 0;

  const retiredWFRows = activeWFRows.filter(r => r.age >= retAge);
  const avgGap = retiredWFRows.length
    ? retiredWFRows.reduce((s, r) => s + r._expenseGapRaw + r._debtPaymentRaw, 0) / retiredWFRows.length
    : 0;

  const incomeLabel = [
    avgCpp     > 0 ? 'CPP'     : null,
    avgOas     > 0 ? 'OAS'     : null,
    avgPension > 0 ? 'Pension' : null,
  ].filter(Boolean).join(' + ') || 'Benefits';

  return `${incomeLabel} cover ${pct}% of expenses. Portfolio covers the ${fmtDollar(avgGap)}/yr gap${depletionSuffix}.`;
}

// ---------------------------------------------------------------------------
// buildDriversAnnotations
// ---------------------------------------------------------------------------

/**
 * Build phase-aggregate annotation cards for the Drivers view.
 * Returns cards in the same schema as buildPhaseAnnotations:
 *   { phase, ages, line1, line2, line3?, line4? }
 */
export function buildDriversAnnotations(scenario, waterfallData, projectionData) {
  const retAge   = scenario.retirementAge;
  const cards    = [];

  // ── Working phase ─────────────────────────────────────────────────────────
  const workingWF   = waterfallData.filter(r => !r.isPostDepletion && r.age < retAge);
  const workingProj = projectionData.filter(r => r.age < retAge && r.employmentIncome > 0);

  if (workingWF.length > 0 && workingProj.length > 0) {
    const avgGrowth  = avg(workingWF, '_growthRaw');
    const drainItems = [
      { label: 'debt payments', val: avg(workingWF, '_debtPaymentRaw') },
      { label: 'taxes',         val: avg(workingWF, '_taxDrainRaw') + avg(workingWF, '_meltdownTaxRaw') },
      { label: 'expense gap',   val: avg(workingWF, '_expenseGapRaw') },
    ].filter(d => d.val > 100).sort((a, b) => b.val - a.val);

    const ages = `${workingWF[0].age}\u2013${workingWF[workingWF.length - 1].age}`;
    const card = {
      phase: 'drivers-working',
      ages,
      line1: `Avg investment growth: ${fmtDollar(avgGrowth)}/yr.`,
      line2: drainItems.length > 0
        ? `Biggest drag: ${drainItems[0].label} at ${fmtDollar(drainItems[0].val)}/yr.`
        : 'Salary covers all costs — portfolio growing.',
    };
    if (drainItems.length > 1) {
      card.line3 = `Also: ${drainItems.slice(1).map(d => `${d.label} ${fmtDollar(d.val)}/yr`).join(', ')}.`;
    }
    cards.push(card);
  }

  // ── Retired phase ─────────────────────────────────────────────────────────
  const retiredWF   = waterfallData.filter(r => !r.isPostDepletion && r.age >= retAge);
  const retiredProj = projectionData.filter(r => r.age >= retAge && r.totalPortfolio > 0);

  if (retiredWF.length > 0 && retiredProj.length > 0) {
    const avgGrowth  = avg(retiredWF, '_growthRaw');
    const avgCpp     = avg(retiredProj, 'cppIncome');
    const avgOas     = avg(retiredProj, 'oasIncome');
    const avgPension = avg(retiredProj, 'pensionIncome');
    const avgExp     = avg(retiredProj, 'expenses');
    const benefits   = avgCpp + avgOas + avgPension;
    const pct        = avgExp > 0 ? Math.min(100, Math.round((benefits / avgExp) * 100)) : 0;

    const drainItems = [
      { label: 'taxes',         val: avg(retiredWF, '_taxDrainRaw') + avg(retiredWF, '_meltdownTaxRaw') },
      { label: 'debt payments', val: avg(retiredWF, '_debtPaymentRaw') },
      { label: 'expense gap',   val: avg(retiredWF, '_expenseGapRaw') },
    ].filter(d => d.val > 100).sort((a, b) => b.val - a.val);

    const ages = `${retiredWF[0].age}\u2013${retiredWF[retiredWF.length - 1].age}`;
    cards.push({
      phase: 'drivers-retired',
      ages,
      line1: `Benefits cover ${pct}% of expenses. Avg growth: ${fmtDollar(avgGrowth)}/yr.`,
      line2: drainItems.length > 0
        ? `Biggest drain: ${drainItems[0].label} at ${fmtDollar(drainItems[0].val)}/yr.`
        : 'Benefits cover all costs.',
      line3: drainItems.length > 1
        ? `Also: ${drainItems.slice(1).map(d => `${d.label} ${fmtDollar(d.val)}/yr`).join(', ')}.`
        : undefined,
    });
  }

  // ── Post-depletion phase ──────────────────────────────────────────────────
  const depletedWF = waterfallData.filter(r => r.isPostDepletion);
  if (depletedWF.length > 0) {
    const avgShortfall = avg(depletedWF, '_shortfallRaw');
    cards.push({
      phase: 'drivers-depleted',
      ages: `${depletedWF[0].age}\u2013${depletedWF[depletedWF.length - 1].age}`,
      line1: `Portfolio fully depleted.`,
      line2: `Average annual shortfall: ${fmtDollar(avgShortfall)}/yr.`,
    });
  }

  return cards;
}
