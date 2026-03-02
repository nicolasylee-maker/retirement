# Calculation Audit Report

**Scenario**: Mom's Plan (With Assets)
**Generated**: 2026-03-02
**Engine version**: projectionEngine.js + taxEngine.js + estateEngine.js + withdrawalCalc.js

---

## 1. Input Snapshot

| Field | Value |
|---|---|
| Current age | 64 |
| Retirement age | 68 |
| Life expectancy | 95 |
| Employment income | $50,000/yr (inflation-adjusted until retirement) |
| CPP | $800/mo, start age 68 |
| OAS | $713/mo, start age 68 |
| Pension type | DC (balance rolled into RRSP pool) |
| DC pension balance | $150,000 |
| RRSP balance | $300,000 |
| **Combined RRSP pool** | **$450,000** (RRSP + DC + RRIF + LIRA) |
| TFSA balance | $10,000 |
| Cash savings | $10,000 |
| Non-reg investments | $0 |
| **Combined non-reg** | **$10,000** (investments + cash) |
| Real estate | $1,100,000 (primary residence) |
| Consumer debt | $90,000 @ 3.5% |
| Consumer debt payoff age | 74 (default: currentAge + 10) |
| Monthly expenses | $5,000 |
| Expense reduction at retirement | 20% |
| Inflation rate | 2.5% |
| Real return (all accounts) | 4.0% |
| Withdrawal order | RRSP > TFSA > Non-Reg > Other |
| RRSP meltdown | Enabled, $20,000/yr until age 90 |
| Will | Yes, beneficiary: children |
| Real estate in estate | Yes |

---

## 2. Year-by-Year Projection

### Pre-Retirement (Ages 64-67)

| Age | Year | Emp Inc | RRSP Wd | Expenses | Debt Pmt | Tax | Surplus | RRSP Bal | TFSA Bal | Portfolio | Net Worth |
|-----|------|---------|---------|----------|----------|-----|---------|----------|----------|-----------|-----------|
| 64 | 2026 | $50,000 | $20,822 | $60,000 | $10,822 | $12,779 | -$12,779 | $446,345 | $10,400 | $467,145 | $1,484,817 |
| 65 | 2027 | $51,250 | $21,072 | $61,500 | $10,822 | $12,480 | -$12,480 | $442,285 | $10,816 | $463,917 | $1,489,529 |
| 66 | 2028 | $52,531 | $21,328 | $63,037 | $10,822 | $12,982 | -$12,982 | $437,795 | $11,249 | $460,292 | $1,494,122 |
| 67 | 2029 | $53,845 | $21,591 | $64,613 | $10,822 | $13,497 | -$13,497 | $432,852 | $11,699 | $456,250 | $1,498,586 |

**Key observations (pre-retirement)**:
- Employment income + RRSP meltdown ($20K/yr) provides ~$70-75K gross income
- Expenses ($60K) + debt ($10.8K) = $70.8K need; income covers it but taxes create a deficit
- RRSP declines slowly: $450K -> $433K (meltdown withdrawals offset by 4% growth)
- TFSA and non-reg grow untouched at 4%/yr
- Net worth rises from $1.48M to $1.50M (debt paydown + real estate holds steady)

### Retirement & Drawdown (Ages 68-80)

| Age | Year | CPP | OAS | RRSP Wd | Expenses | Debt Pmt | Tax | Surplus | RRSP Bal | Portfolio | Net Worth |
|-----|------|-----|-----|---------|----------|----------|-----|---------|----------|-----------|-----------|
| 68 | 2030 | $12,019 | $10,404 | $41,381 | $52,983 | $10,822 | $9,699 | -$9,699 | $407,130 | $431,463 | $1,482,602 |
| 70 | 2032 | $12,019 | $10,404 | $44,064 | $55,665 | $10,822 | $10,575 | -$10,575 | $348,335 | $374,653 | $1,444,335 |
| 72 | 2034 | $12,019 | $10,404 | $46,882 | $58,483 | $10,822 | $11,112 | -$11,112 | $278,837 | $307,303 | $1,396,848 |
| 74 | 2036 | $12,019 | $10,404 | $39,021 | $61,444 | $0 | $8,545 | -$8,545 | $208,720 | $239,509 | $1,339,509 |
| 76 | 2038 | $12,019 | $10,404 | $42,131 | $64,555 | $0 | $9,561 | -$9,561 | $138,069 | $171,370 | $1,271,370 |
| 78 | 2040 | $12,019 | $10,404 | $45,399 | $67,823 | $0 | $10,628 | -$10,628 | $54,805 | $90,824 | $1,190,824 |
| 80 | 2042 | $12,019 | $10,404 | $8,018 | $71,256 | $0 | $2,040 | -$5,396 | $0 | $0 | $1,100,000 |

**Key observations (drawdown)**:
- At 68, employment stops; CPP ($12,019) + OAS ($10,404) begin
- RRSP withdrawals rise to ~$40-47K/yr to cover the gap
- Debt paid off at age 74 (total lifetime debt payments: ~$108K on $90K principal)
- RRIF conversion at 72: minimum rates (5.4%) are below meltdown amount ($20K), so meltdown drives withdrawals
- **Portfolio depleted at age 80** — all RRSP, TFSA, and non-reg accounts reach $0
- At age 80, remaining RRSP ($8,018) + TFSA ($18,730) + non-reg ($18,730) all withdrawn in final year

### Post-Depletion (Ages 81-95)

| Age | Year | CPP | OAS | Total Income | Expenses | Shortfall |
|-----|------|-----|-----|-------------|----------|-----------|
| 81 | 2043 | $12,019 | $10,404 | $22,172 | $73,038 | -$50,865 |
| 85 | 2047 | $12,019 | $10,404 | $22,172 | $80,620 | -$58,448 |
| 90 | 2052 | $12,019 | $10,404 | $22,172 | $91,214 | -$69,042 |
| 95 | 2057 | $12,019 | $10,404 | $22,172 | $103,200 | -$81,028 |

**Key observations (post-depletion)**:
- Only CPP + OAS remain: $22,423/yr taxable, $22,172/yr after tax
- Expenses grow 2.5%/yr from inflation: $73K at 81 -> $103K at 95
- Annual shortfall grows from $51K to $81K
- Net worth = $1,100,000 (house equity only)
- This scenario requires house downsizing, reverse mortgage, or family support to remain viable

---

## 3. CPP & OAS Verification

### CPP Calculation
```
Monthly at 65:           $800
Start age:               68 (3 years late)
Months deferred:         36
Late bonus per month:    0.7%
Total bonus:             36 × 0.7% = 25.2%
Adjustment factor:       1.252
Annual CPP:              $800 × 12 × 1.252 = $12,019.20
```

### OAS Calculation
```
Monthly at 65:           $713
Start age:               68 (3 years deferred)
Months deferred:         36
Deferral bonus/month:    0.6%
Total bonus:             36 × 0.6% = 21.6%
Adjustment factor:       1.216
Annual OAS:              $713 × 12 × 1.216 = $10,404.10
```

### OAS Clawback Check
```
Clawback threshold:      $90,997
Max income in scenario:  ~$70,800 (age 64)
Clawback triggered?      No (income always below threshold)
```

---

## 4. Tax Verification

### Test Case: $40,000 income, age 68, pension income

**Federal Tax**:
```
Bracket tax:             $40,000 × 15% = $6,000.00
Basic personal credit:   $15,705 × 15% = -$2,355.75
Age amount (68+):        $8,790 × 15% = -$1,318.50
  (No clawback: $40K < $44,325 threshold)
Pension credit:          $2,000 × 15% = -$300.00
Federal tax:             $6,000 - $2,356 - $1,319 - $300 = $2,025.75
```

**Ontario Tax**:
```
Bracket tax:             $40,000 × 5.05% = $2,020.00
Basic personal credit:   $11,865 × 5.05% = -$599.18
Age amount (68+):        $5,586 × 5.05% = -$282.09
  (No clawback: $40K < $42,335 threshold)
Pension credit:          $1,640 × 5.05% = -$82.82
Basic Ontario tax:       $2,020 - $599 - $282 - $83 = $1,055.90
Surtax:                  $0 (basic tax $1,056 < $4,991 threshold)
Ontario tax:             $1,055.90
```

**Total**: $2,025.75 + $1,055.90 = **$3,081.65** (effective rate: 7.7%)

### Additional Tax Data Points

| Taxable Income | Age 68 Tax | Age 50 Tax | Notes |
|----------------|-----------|-----------|-------|
| $20,000 | $129 | $1,055 | Age/pension credits eliminate most tax at 68 |
| $40,000 | $3,082 | $5,065 | |
| $60,000 | $8,456 | $9,570 | Second federal bracket (20.5%) kicks in |
| $80,000 | $14,984 | $15,500 | Ontario surtax may apply |
| $100,000 | $21,674 | $21,740 | |
| $150,000 | $42,543 | $42,543 | Age credits fully clawed back at this level |

---

## 5. Debt Amortization Trace

**Consumer debt: $90,000 @ 3.5% — payoff target age 74 (10 years)**

| Age | Balance | Annual Payment | Interest | Principal | Remaining |
|-----|---------|---------------|----------|-----------|-----------|
| 64 | $90,000 | $10,822 | $3,150 | $7,672 | $82,328 |
| 65 | $82,328 | $10,822 | $2,881 | $7,940 | $74,388 |
| 66 | $74,388 | $10,822 | $2,604 | $8,218 | $66,170 |
| 67 | $66,170 | $10,822 | $2,316 | $8,506 | $57,664 |
| 68 | $57,664 | $10,822 | $2,018 | $8,803 | $48,861 |
| 69 | $48,861 | $10,822 | $1,710 | $9,112 | $39,749 |
| 70 | $39,749 | $10,822 | $1,391 | $9,431 | $30,319 |
| 71 | $30,319 | $10,822 | $1,061 | $9,761 | $20,558 |
| 72 | $20,558 | $10,822 | $720 | $10,102 | $10,456 |
| 73 | $10,456 | $10,822 | $366 | $10,456 | $0 |

**Totals**: $108,218 total payments, $18,218 total interest on $90,000 principal

---

## 6. Estate Verification

### Estate at Age 75 (accounts still have balances)

```
RRSP/RRIF balance:       $174,890
TFSA balance:            $16,010
Non-reg balance:         $16,010
Real estate:             $1,100,000 (primary residence)
Gross estate:            $1,306,910

RRSP deemed income:      $174,890 (no spouse rollover — beneficiary is children)
  Tax on deemed income:  $64,733 (incremental tax on $174K added to base CPP+OAS income)

Non-reg capital gains:   Gain = $16,010 - $16,010 cost basis = $0
  Capital gains tax:     $1,441

Real estate gains:       $0 (primary residence exempt)

Probateable assets:      $174,890 + $16,010 + $0 + $1,100,000 = $1,306,910
  (RRSP included because no spouse beneficiary)
Probate fees:            $250 (first $50K) + $18,854 (above) = $18,864

Total estate tax:        $64,733 + $1,441 + $18,864 = $85,038
Net to heirs:            $1,306,910 - $85,038 = $1,221,872
Distribution:            100% to children (per will)
```

### Estate at Age 80+ (portfolio depleted)

```
All investment accounts: $0 (depleted at age 80)
Real estate:             $1,100,000
Gross estate:            $1,100,000

RRSP deemed income:      $0 (nothing to deem)
Capital gains:           $0 (primary residence exempt)

Probateable assets:      $1,100,000 (real estate only)
Probate fees:            $250 + $15,750 = $16,000

Total estate tax:        $16,000
Net to heirs:            $1,084,000
```

### Ontario Probate Fee Formula
```
First $50,000:           $5 per $1,000 = $250
Above $50,000:           $15 per $1,000
Example ($1,100,000):    $250 + ($1,050,000 × $15/$1,000) = $250 + $15,750 = $16,000
```

---

## 7. Sustainable Withdrawal

```
Method:          Binary search (20 iterations)
Search range:    $0 — $30,000/month
Target age:      95
Solvency test:   Portfolio > $0 AND surplus >= -$1 for all years past currentAge

Result:          $3,155/month maximum sustainable expenses
                 (vs. scenario setting of $5,000/month)

Gap:             $1,845/month ($22,140/year) overspend
Implication:     At $5,000/month, portfolio depletes at age 80
                 At $3,155/month, portfolio survives to age 95
```

---

## 8. RRIF Minimum Withdrawal Schedule

Prescribed minimum withdrawal percentages (applied to Jan 1 balance):

| Age | Rate | On $100K | On $200K |
|-----|------|----------|----------|
| 71 | 5.28% | $5,280 | $10,560 |
| 72 | 5.40% | $5,400 | $10,800 |
| 75 | 5.82% | $5,820 | $11,640 |
| 80 | 6.82% | $6,820 | $13,640 |
| 85 | 8.51% | $8,510 | $17,020 |
| 90 | 11.92% | $11,920 | $23,840 |
| 95+ | 20.00% | $20,000 | $40,000 |

In this scenario, the RRSP meltdown withdrawal ($20,000/yr) exceeds RRIF minimums until the RRSP is depleted at age 80, so RRIF minimums never become the binding constraint.

---

## 9. Known Gaps & Simplifications

| Area | Simplification | Impact |
|------|---------------|--------|
| **CPP/OAS not indexed** | Benefits stay flat in nominal terms (conservative) | Understates real income by ~2.5%/yr. At age 85, CPP+OAS could be ~30% higher in reality |
| **No TFSA contributions** | Model doesn't add annual TFSA room ($7K/yr) | Understates TFSA growth, especially pre-retirement |
| **Real estate static** | House value stays at initial amount, no appreciation | Could understate net worth significantly over 30 years |
| **No tax bracket indexing** | Federal/Ontario brackets don't adjust for inflation | Overstates taxes in later years (bracket creep) |
| **Single tax year** | Uses 2024 brackets for all future years | Tax rates may change |
| **Debt payment from income** | Debt payments come from gross income, not savings | Accurate if income covers payments; if not, withdrawals fill the gap |
| **No CPP survivor benefit** | Not modeled (single scenario) | N/A for single filer |
| **No health/care costs** | Model uses flat expense growth | May understate expenses significantly after age 80 |
| **Employment income stops abruptly** | No part-time or gradual retirement option | May overstate withdrawal needs in early retirement |
| **Non-reg cost basis tracks proportionally** | Assumes uniform gain distribution across portfolio | Slightly inaccurate if actual holdings have varying ACBs |

---

## 10. Dashboard KPI Derivations

### Net Worth (at retirement, age 68)
```
Total portfolio:    $431,463 (RRSP $407,130 + TFSA $12,167 + NonReg $12,167)
Real estate:        $1,100,000
Consumer debt:      -$48,861
Net worth:          $1,482,602
```

### First-Year Retirement Income (age 68)
```
CPP:                $12,019 (taxable)
OAS:                $10,404 (taxable, after any clawback)
RRSP withdrawal:    $41,381 (taxable)
Total gross:        $63,805 taxable + tax-free withdrawals
Tax:                $9,699
After-tax:          $54,106
```

### Surplus/Shortfall (age 68)
```
After-tax income:   $54,106
Expenses:           $52,983
Debt payments:      $10,822
Surplus:            $54,106 - $52,983 - $10,822 = -$9,699
```

### RRSP Change Explanation
```
Starting RRSP:      $450,000 (age 64)
RRSP at 68:         $407,130
Change:             -$42,870

Reason: RRSP meltdown withdrawals ($20K+/yr for 4 years ≈ $85K withdrawn)
        partially offset by 4% annual growth ($18K/yr average ≈ $72K gained)
        Net effect: ~$43K reduction
        Additional shortfall withdrawals of ~$800/yr also contribute
```
