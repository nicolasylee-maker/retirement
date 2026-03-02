// ---------------------------------------------------------------------------
// taxTables.js — 2025 Canadian tax constants
//
// All bracket/credit data lives in data/provinces/*.json and data/federal.json.
// This file imports those files, re-exports the named constants that engines
// already depend on (backward compat), and exposes PROVINCE_DATA for
// province-aware calculations.
//
// To update for a new tax year: edit the JSON files, run `npm run update:tax`.
// ---------------------------------------------------------------------------

import FEDERAL   from '../../data/federal.json';
import ON_DATA   from '../../data/provinces/ON.json';
import BC_DATA   from '../../data/provinces/BC.json';
import AB_DATA   from '../../data/provinces/AB.json';
import SK_DATA   from '../../data/provinces/SK.json';
import MB_DATA   from '../../data/provinces/MB.json';
import NB_DATA   from '../../data/provinces/NB.json';
import NS_DATA   from '../../data/provinces/NS.json';
import NL_DATA   from '../../data/provinces/NL.json';
import PE_DATA   from '../../data/provinces/PE.json';

// ---------------------------------------------------------------------------
// Bracket normalization: JSON uses null for "no upper limit"; engines use Infinity
// ---------------------------------------------------------------------------
function normalizeBrackets(brackets) {
  return brackets.map(b => ({ ...b, max: b.max ?? Infinity }));
}

function normalizeProvince(data) {
  return { ...data, brackets: normalizeBrackets(data.brackets) };
}

// ---------------------------------------------------------------------------
// All provinces keyed by code — used by province-aware engine functions
// ---------------------------------------------------------------------------
export const PROVINCE_DATA = {
  ON: normalizeProvince(ON_DATA), BC: normalizeProvince(BC_DATA),
  AB: normalizeProvince(AB_DATA), SK: normalizeProvince(SK_DATA),
  MB: normalizeProvince(MB_DATA), NB: normalizeProvince(NB_DATA),
  NS: normalizeProvince(NS_DATA), NL: normalizeProvince(NL_DATA),
  PE: normalizeProvince(PE_DATA),
};

export const PROVINCE_CODES = Object.keys(PROVINCE_DATA);

export const PROVINCE_NAMES = Object.fromEntries(
  Object.entries(PROVINCE_DATA).map(([k, v]) => [k, v.name])
);

// ---------------------------------------------------------------------------
// Federal — named exports for backward compat with existing engine imports
// ---------------------------------------------------------------------------
export const FEDERAL_BRACKETS = normalizeBrackets(FEDERAL.brackets);
export const FEDERAL_CREDITS  = FEDERAL.credits;

// Ontario brackets/credits/surtax — kept for backward compat
export const ONTARIO_BRACKETS = PROVINCE_DATA.ON.brackets;
export const ONTARIO_CREDITS  = ON_DATA.credits;
export const ONTARIO_SURTAX   = ON_DATA.surtax;

// Federal benefit program params
export const OAS_PARAMS = {
  maxAnnual:        FEDERAL.oas.maxAnnual,
  clawbackStart:    FEDERAL.oas.clawbackThreshold,
  clawbackRate:     FEDERAL.oas.clawbackRate,
  clawbackFullRepay: Math.round(
    FEDERAL.oas.clawbackThreshold + FEDERAL.oas.maxAnnual / FEDERAL.oas.clawbackRate
  ),
  startAge:         FEDERAL.oas.startAge,
  deferralBonus:    FEDERAL.oas.deferralBonusPerMonth,
  maxDeferAge:      FEDERAL.oas.maxDeferAge,
  maxMonthlyAge65to74: FEDERAL.oas.maxMonthlyAge65to74,
  maxMonthlyAge75plus: FEDERAL.oas.maxMonthlyAge75plus,
};

export const CPP_PARAMS = {
  maxAt65:       FEDERAL.cpp.maxAnnualAt65,
  earlyReduction: FEDERAL.cpp.earlyReductionPerMonth,
  lateIncrease:   FEDERAL.cpp.lateIncreasePerMonth,
  earliestAge:    FEDERAL.cpp.earliestAge,
  latestAge:      FEDERAL.cpp.latestAge,
};

export const GIS_PARAMS = {
  maxAnnual:         FEDERAL.gis.maxAnnual,
  incomeThreshold:   FEDERAL.gis.singleIncomeThreshold,
  clawbackRate:      FEDERAL.gis.clawbackRate,
};

export const GAINS_PARAMS = {
  maxAnnual:               ON_DATA.lowIncomeSupplement.maxAnnual,
  singleIncomeThreshold:   ON_DATA.lowIncomeSupplement.singleIncomeThreshold,
  clawbackRate:            ON_DATA.lowIncomeSupplement.clawbackRate,
  minAge:                  ON_DATA.lowIncomeSupplement.minAge,
};

export const RRIF_MIN_RATES = Object.fromEntries(
  Object.entries(FEDERAL.rrifMinRates).map(([k, v]) => [Number(k), v])
);

export const CAPITAL_GAINS = {
  inclusionRate: FEDERAL.capitalGains.inclusionRate,
};

export const TFSA_PARAMS = {
  annualLimit: FEDERAL.tfsa.annualLimit,
};

// Ontario-specific probate — kept for backward compat with auditAnalysis.js
export const PROBATE = {
  firstThreshold: ON_DATA.probate.tiers[0].upTo,
  firstRate:      ON_DATA.probate.tiers[0].ratePerThousand / 1000,
  aboveRate:      ON_DATA.probate.tiers[1].ratePerThousand / 1000,
};

// Ontario-specific intestacy — kept for backward compat
export const INTESTACY = {
  spousePreferentialShare: ON_DATA.intestacy.spousePreferentialShare,
};
