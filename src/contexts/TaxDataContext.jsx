import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../services/supabaseClient'
import { _injectLiveTaxData } from '../constants/taxTables'

// Static JSON imports — used as fallback if DB is empty or unreachable
import FEDERAL from '../../data/federal.json'
import ON_DATA from '../../data/provinces/ON.json'
import BC_DATA from '../../data/provinces/BC.json'
import AB_DATA from '../../data/provinces/AB.json'
import SK_DATA from '../../data/provinces/SK.json'
import MB_DATA from '../../data/provinces/MB.json'
import NB_DATA from '../../data/provinces/NB.json'
import NS_DATA from '../../data/provinces/NS.json'
import NL_DATA from '../../data/provinces/NL.json'
import PE_DATA from '../../data/provinces/PE.json'

const TaxDataContext = createContext({ loaded: false })

function normalizeBrackets(brackets) {
  if (!Array.isArray(brackets)) return brackets
  return brackets.map(b => ({ ...b, max: b.max ?? Infinity }))
}

function normalizeData(data) {
  return { ...data, brackets: normalizeBrackets(data.brackets ?? []) }
}

/**
 * Transform DB rows [{province, data}] into {federal, provinces}.
 * Normalizes null bracket maxes → Infinity.
 * Exported for unit testing.
 */
export function buildTaxDataFromRows(rows) {
  if (!rows?.length) return { federal: null, provinces: {} }

  const federalRow = rows.find(r => r.province === 'federal')
  const federal = federalRow ? normalizeData(federalRow.data) : null

  const provinces = {}
  for (const row of rows) {
    if (row.province === 'federal') continue
    provinces[row.province] = normalizeData(row.data)
  }

  return { federal, provinces }
}

const BUNDLED_PROVINCES = { ON: ON_DATA, BC: BC_DATA, AB: AB_DATA, SK: SK_DATA, MB: MB_DATA, NB: NB_DATA, NS: NS_DATA, NL: NL_DATA, PE: PE_DATA }

export function TaxDataProvider({ children }) {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    supabase
      .from('tax_data')
      .select('province, data')
      .then(({ data, error }) => {
        if (error) {
          console.warn('[TaxData] DB fetch error — using bundled JSON:', error.message)
          setLoaded(true)
          return
        }
        if (!data?.length) {
          // DB empty (not yet seeded) — bundled JSON already loaded by taxTables.js static imports
          setLoaded(true)
          return
        }
        const { federal, provinces } = buildTaxDataFromRows(data)
        if (federal && Object.keys(provinces).length > 0) {
          _injectLiveTaxData(federal, provinces)
        }
        setLoaded(true)
      })
  }, [])

  return (
    <TaxDataContext.Provider value={{ loaded, bundledProvinces: BUNDLED_PROVINCES, bundledFederal: FEDERAL }}>
      {children}
    </TaxDataContext.Provider>
  )
}

export function useTaxData() {
  return useContext(TaxDataContext)
}
