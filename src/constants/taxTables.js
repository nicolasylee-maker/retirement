// ---------------------------------------------------------------------------
// taxTables.js — 2025 Canadian tax constants
//
// All bracket/credit data lives in data/provinces/*.json and data/federal.json.
// This file imports those files, re-exports the named constants that engines
// already depend on (backward compat), and exposes PROVINCE_DATA for
// province-aware calculations.
//
// To update for a new tax year: edit the JSON files, run `npm run update:tax`.
// At runtime, admin can push new values from the DB via _injectLiveTaxData().
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
// Builder helpers — used both for initial values and _injectLiveTaxData resets
// ---------------------------------------------------------------------------
function buildOasParams(f) {
  return {
    maxAnnual:           f.oas.maxAnnual,
    clawbackStart:       f.oas.clawbackThreshold,
    clawbackRate:        f.oas.clawbackRate,
    clawbackFullRepay:   Math.round(f.oas.clawbackThreshold + f.oas.maxAnnual / f.oas.clawbackRate),
    startAge:            f.oas.startAge,
    deferralBonus:       f.oas.deferralBonusPerMonth,
    maxDeferAge:         f.oas.maxDeferAge,
    maxMonthlyAge65to74: f.oas.maxMonthlyAge65to74,
    maxMonthlyAge75plus: f.oas.maxMonthlyAge75plus,
  };
}

function buildCppParams(f) {
  return {
    maxAt65:       f.cpp.maxAnnualAt65,
    earlyReduction: f.cpp.earlyReductionPerMonth,
    lateIncrease:   f.cpp.lateIncreasePerMonth,
    earliestAge:    f.cpp.earliestAge,
    latestAge:      f.cpp.latestAge,
  };
}

function buildGisParams(f) {
  return {
    maxAnnual:       f.gis.maxAnnual,
    incomeThreshold: f.gis.singleIncomeThreshold,
    clawbackRate:    f.gis.clawbackRate,
  };
}

function buildRrifRates(f) {
  return Object.fromEntries(Object.entries(f.rrifMinRates).map(([k, v]) => [Number(k), v]));
}

// ---------------------------------------------------------------------------
// Static snapshots — captured once at module load; used by _injectLiveTaxData
// to restore originals when called with (null, null)
// ---------------------------------------------------------------------------
const _STATIC_PROVINCES = {
  ON: normalizeProvince(ON_DATA), BC: normalizeProvince(BC_DATA),
  AB: normalizeProvince(AB_DATA), SK: normalizeProvince(SK_DATA),
  MB: normalizeProvince(MB_DATA), NB: normalizeProvince(NB_DATA),
  NS: normalizeProvince(NS_DATA), NL: normalizeProvince(NL_DATA),
  PE: normalizeProvince(PE_DATA),
};

// ---------------------------------------------------------------------------
// All provinces keyed by code — used by province-aware engine functions
// ---------------------------------------------------------------------------
export let PROVINCE_DATA = _STATIC_PROVINCES;

export const PROVINCE_CODES = Object.keys(_STATIC_PROVINCES);

export const PROVINCE_NAMES = Object.fromEntries(
  Object.entries(_STATIC_PROVINCES).map(([k, v]) => [k, v.name])
);

// ---------------------------------------------------------------------------
// Federal — named exports for backward compat with existing engine imports
// ---------------------------------------------------------------------------
export let FEDERAL_BRACKETS = normalizeBrackets(FEDERAL.brackets);
export let FEDERAL_CREDITS  = FEDERAL.credits;

// Ontario brackets/credits/surtax — kept for backward compat
export let ONTARIO_BRACKETS = _STATIC_PROVINCES.ON.brackets;
export let ONTARIO_CREDITS  = ON_DATA.credits;
export let ONTARIO_SURTAX   = ON_DATA.surtax;

// Federal benefit program params
export let OAS_PARAMS = buildOasParams(FEDERAL);

export let CPP_PARAMS = buildCppParams(FEDERAL);

export let GIS_PARAMS = buildGisParams(FEDERAL);

export let GAINS_PARAMS = {
  maxAnnual:             ON_DATA.lowIncomeSupplement.maxAnnual,
  singleIncomeThreshold: ON_DATA.lowIncomeSupplement.singleIncomeThreshold,
  clawbackRate:          ON_DATA.lowIncomeSupplement.clawbackRate,
  minAge:                ON_DATA.lowIncomeSupplement.minAge,
};

export let RRIF_MIN_RATES = buildRrifRates(FEDERAL);

export let CAPITAL_GAINS = {
  inclusionRate: FEDERAL.capitalGains.inclusionRate,
};

export let TFSA_PARAMS = {
  annualLimit: FEDERAL.tfsa.annualLimit,
};

// Ontario-specific probate — kept for backward compat with auditAnalysis.js
export let PROBATE = {
  firstThreshold: ON_DATA.probate.tiers[0].upTo,
  firstRate:      ON_DATA.probate.tiers[0].ratePerThousand / 1000,
  aboveRate:      ON_DATA.probate.tiers[1].ratePerThousand / 1000,
};

// Ontario-specific intestacy — kept for backward compat
export let INTESTACY = {
  spousePreferentialShare: ON_DATA.intestacy.spousePreferentialShare,
};

// ---------------------------------------------------------------------------
// Runtime injection — called by TaxDataContext after loading from Supabase.
// Passing (null, null) restores all exports to the bundled-JSON baseline.
// ES module `let` exports are live bindings: all importers immediately see
// the updated values without any code changes in engines or components.
// ---------------------------------------------------------------------------
export function _injectLiveTaxData(federal, provinces) {
  if (federal === null && provinces === null) {
    // Reset to static (bundled) values
    PROVINCE_DATA    = _STATIC_PROVINCES;
    FEDERAL_BRACKETS = normalizeBrackets(FEDERAL.brackets);
    FEDERAL_CREDITS  = FEDERAL.credits;
    ONTARIO_BRACKETS = _STATIC_PROVINCES.ON.brackets;
    ONTARIO_CREDITS  = ON_DATA.credits;
    ONTARIO_SURTAX   = ON_DATA.surtax;
    OAS_PARAMS       = buildOasParams(FEDERAL);
    CPP_PARAMS       = buildCppParams(FEDERAL);
    GIS_PARAMS       = buildGisParams(FEDERAL);
    GAINS_PARAMS     = { maxAnnual: ON_DATA.lowIncomeSupplement.maxAnnual, singleIncomeThreshold: ON_DATA.lowIncomeSupplement.singleIncomeThreshold, clawbackRate: ON_DATA.lowIncomeSupplement.clawbackRate, minAge: ON_DATA.lowIncomeSupplement.minAge };
    RRIF_MIN_RATES   = buildRrifRates(FEDERAL);
    CAPITAL_GAINS    = { inclusionRate: FEDERAL.capitalGains.inclusionRate };
    TFSA_PARAMS      = { annualLimit: FEDERAL.tfsa.annualLimit };
    PROBATE          = { firstThreshold: ON_DATA.probate.tiers[0].upTo, firstRate: ON_DATA.probate.tiers[0].ratePerThousand / 1000, aboveRate: ON_DATA.probate.tiers[1].ratePerThousand / 1000 };
    INTESTACY        = { spousePreferentialShare: ON_DATA.intestacy.spousePreferentialShare };
    return;
  }

  if (provinces) {
    PROVINCE_DATA = Object.fromEntries(
      Object.entries(provinces).map(([k, v]) => [k, normalizeProvince(v)])
    );
    const newOn = provinces.ON;
    if (newOn) {
      ONTARIO_BRACKETS = PROVINCE_DATA.ON.brackets;
      ONTARIO_CREDITS  = newOn.credits;
      ONTARIO_SURTAX   = newOn.surtax ?? ONTARIO_SURTAX;
      if (newOn.lowIncomeSupplement) {
        GAINS_PARAMS = { maxAnnual: newOn.lowIncomeSupplement.maxAnnual, singleIncomeThreshold: newOn.lowIncomeSupplement.singleIncomeThreshold, clawbackRate: newOn.lowIncomeSupplement.clawbackRate, minAge: newOn.lowIncomeSupplement.minAge };
      }
      if (newOn.probate?.tiers?.length >= 2) {
        PROBATE = { firstThreshold: newOn.probate.tiers[0].upTo, firstRate: newOn.probate.tiers[0].ratePerThousand / 1000, aboveRate: newOn.probate.tiers[1].ratePerThousand / 1000 };
      }
      if (newOn.intestacy) {
        INTESTACY = { spousePreferentialShare: newOn.intestacy.spousePreferentialShare };
      }
    }
  }

  if (federal) {
    FEDERAL_BRACKETS = normalizeBrackets(federal.brackets);
    FEDERAL_CREDITS  = federal.credits;
    OAS_PARAMS       = buildOasParams(federal);
    CPP_PARAMS       = buildCppParams(federal);
    GIS_PARAMS       = buildGisParams(federal);
    RRIF_MIN_RATES   = buildRrifRates(federal);
    CAPITAL_GAINS    = { inclusionRate: federal.capitalGains.inclusionRate };
    TFSA_PARAMS      = { annualLimit: federal.tfsa.annualLimit };
  }
}
