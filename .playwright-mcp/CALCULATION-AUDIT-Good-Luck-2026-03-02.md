# Calculation Audit Report

**Scenario**: Good Luck
**Generated**: 2026-03-02 13:49:37
**Engine files**: projectionEngine.js + taxEngine.js + estateEngine.js + withdrawalCalc.js
**Bug fix status**: CPP/OAS inflation-indexed, tax gross-up loop, estate $0 cap gains guard — all applied

---

## 1. Input Snapshot

| Field | Value |
| --- | --- |
| Current age | 64 |
| Retirement age | 68 |
| Life expectancy | 95 |
| Employment income | $60,000/yr (inflation-adjusted until retirement) |
| CPP | $800/mo, start age 68 |
| OAS | $713/mo, start age 68 |
| Pension type | DC — $150,000 balance (rolled into RRSP pool) |
| RRSP balance | $350,000 |
| DC pension balance | $150,000 |
| **Combined RRSP pool** | **$500,000** |
| TFSA balance | $10,000 |
| Cash savings | $10,000 |
| Non-reg investments | $0 |
| **Combined non-reg** | **$10,000** |
| Real estate | $1,100,000 (primary residence) |
| Consumer debt | $90,000 @ 3.5% |
| Consumer debt payoff age | 68 |
| Monthly expenses | $5,000 |
| Expense reduction at retirement | 20.0% |
| Inflation rate | 2.5% |
| Real return (RRSP) | 4.0% |
| Withdrawal order | rrsp > tfsa > nonReg > other |
| RRSP meltdown | $20,000/yr from age 68 to 90 |
| Will | Yes |
| Primary beneficiary | children |
| Real estate in estate | Yes |
---

## 2. Year-by-Year Projection

### Pre-Retirement (Ages 64–67)

| Age | Year | Emp Inc | RRSP Wd | Expenses | Debt Pmt | Tax | Surplus | RRSP Bal | TFSA Bal | Portfolio | Net Worth |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 64 | 2026 | $60,000 | $49,842 | $60,000 | $24,503 | $25,380 | -$41 | $468,165 | $10,400 | $488,965 | $1,520,317 |
| 65 | 2027 | $61,500 | $50,750 | $61,500 | $24,503 | $26,293 | -$46 | $434,111 | $10,816 | $455,743 | $1,509,196 |
| 66 | 2028 | $63,037 | $51,686 | $63,037 | $24,503 | $27,231 | -$48 | $397,723 | $11,249 | $420,220 | $1,496,546 |
| 67 | 2029 | $64,613 | $52,915 | $64,613 | $24,503 | $28,447 | -$35 | $358,600 | $11,699 | $381,997 | $1,481,997 |

### Retirement & Drawdown (Ages 68–95)

| Age | Year | CPP | OAS | RRSP Wd | TFSA Wd | NonReg Wd | Expenses | Debt Pmt | Tax | Surplus | RRSP Bal | Portfolio | Net Worth |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 68 | 2030 | $13,267 | $11,484 | $37,355 | $0 | $0 | $52,983 | $0 | $9,144 | -$21 | $334,095 | $358,428 | $1,458,428 |
| 69 | 2031 | $13,599 | $11,771 | $38,700 | $0 | $0 | $54,308 | $0 | $9,785 | -$23 | $307,212 | $332,518 | $1,432,518 |
| 70 | 2032 | $13,939 | $12,066 | $40,078 | $0 | $0 | $55,665 | $0 | $10,442 | -$25 | $277,819 | $304,138 | $1,404,138 |
| 71 | 2033 | $14,287 | $12,367 | $41,491 | $0 | $0 | $57,057 | $0 | $11,116 | -$28 | $245,781 | $273,152 | $1,373,152 |
| 72 | 2034 | $14,644 | $12,676 | $42,374 | $0 | $0 | $58,483 | $0 | $11,239 | -$28 | $211,544 | $240,010 | $1,340,010 |
| 73 | 2035 | $15,010 | $12,993 | $43,859 | $0 | $0 | $59,945 | $0 | $11,947 | -$30 | $174,392 | $203,997 | $1,303,997 |
| 74 | 2036 | $15,386 | $13,318 | $45,382 | $0 | $0 | $61,444 | $0 | $12,673 | -$32 | $134,170 | $164,959 | $1,264,959 |
| 75 | 2037 | $15,770 | $13,651 | $46,943 | $0 | $0 | $62,980 | $0 | $13,417 | -$34 | $90,717 | $122,738 | $1,222,738 |
| 76 | 2038 | $16,164 | $13,992 | $48,542 | $0 | $0 | $64,555 | $0 | $14,180 | -$36 | $43,862 | $77,163 | $1,177,163 |
| 77 | 2039 | $16,569 | $14,342 | $43,862 | $4,294 | $0 | $66,169 | $0 | $12,898 | $0 | $0 | $30,168 | $1,130,168 |
| 78 | 2040 | $16,983 | $14,701 | $0 | $12,851 | $17,317 | $67,823 | $0 | $2,531 | -$8,502 | $0 | $0 | $1,100,000 |
| 79 | 2041 | $17,407 | $15,068 | $0 | $0 | $0 | $69,518 | $0 | $1,956 | -$38,999 | $0 | $0 | $1,100,000 |
| 80 | 2042 | $17,843 | $15,445 | $0 | $0 | $0 | $71,256 | $0 | $2,119 | -$40,087 | $0 | $0 | $1,100,000 |
| 81 | 2043 | $18,289 | $15,831 | $0 | $0 | $0 | $73,038 | $0 | $2,285 | -$41,203 | $0 | $0 | $1,100,000 |
| 82 | 2044 | $18,746 | $16,227 | $0 | $0 | $0 | $74,864 | $0 | $2,456 | -$42,347 | $0 | $0 | $1,100,000 |
| 83 | 2045 | $19,214 | $16,633 | $0 | $0 | $0 | $76,735 | $0 | $2,632 | -$43,520 | $0 | $0 | $1,100,000 |
| 84 | 2046 | $19,695 | $17,048 | $0 | $0 | $0 | $78,654 | $0 | $2,811 | -$44,722 | $0 | $0 | $1,100,000 |
| 85 | 2047 | $20,187 | $17,475 | $0 | $0 | $0 | $80,620 | $0 | $2,996 | -$45,954 | $0 | $0 | $1,100,000 |
| 86 | 2048 | $20,692 | $17,911 | $0 | $0 | $0 | $82,635 | $0 | $3,184 | -$47,217 | $0 | $0 | $1,100,000 |
| 87 | 2049 | $21,209 | $18,359 | $0 | $0 | $0 | $84,701 | $0 | $3,378 | -$48,511 | $0 | $0 | $1,100,000 |
| 88 | 2050 | $21,739 | $18,818 | $0 | $0 | $0 | $86,819 | $0 | $3,576 | -$49,838 | $0 | $0 | $1,100,000 |
| 89 | 2051 | $22,283 | $19,289 | $0 | $0 | $0 | $88,989 | $0 | $3,780 | -$51,197 | $0 | $0 | $1,100,000 |
| 90 | 2052 | $22,840 | $19,771 | $0 | $0 | $0 | $91,214 | $0 | $3,990 | -$52,593 | $0 | $0 | $1,100,000 |
| 91 | 2053 | $23,411 | $20,265 | $0 | $0 | $0 | $93,494 | $0 | $4,212 | -$54,030 | $0 | $0 | $1,100,000 |
| 92 | 2054 | $23,996 | $20,772 | $0 | $0 | $0 | $95,832 | $0 | $4,449 | -$55,513 | $0 | $0 | $1,100,000 |
| 93 | 2055 | $24,596 | $21,291 | $0 | $0 | $0 | $98,228 | $0 | $4,707 | -$57,047 | $0 | $0 | $1,100,000 |
| 94 | 2056 | $25,211 | $21,823 | $0 | $0 | $0 | $100,683 | $0 | $4,971 | -$58,620 | $0 | $0 | $1,100,000 |
| 95 | 2057 | $25,841 | $22,369 | $0 | $0 | $0 | $103,200 | $0 | $5,243 | -$60,233 | $0 | $0 | $1,100,000 |

**Portfolio depleted at age 78.**

---

## 3. CPP & OAS Verification

### CPP Calculation
```
Monthly at 65:           $800
Start age:               68 (Late by 36 months)
Adjustment:              36 x 0.7% = 25.2% bonus
Adjustment factor:       1.252
Annual CPP (base):       $800 x 12 x 1.252 = $12,019
Inflation indexed:       Yes (2.5%/yr)
  At age 73:          $12,019 x 1.249 = $15,010
```

### OAS Calculation
```
Monthly at 65:           $713
Start age:               68
Months deferred:         36
Deferral bonus/month:    0.6%
Total bonus:             36 x 0.6% = 21.6%
Adjustment factor:       1.216
Annual OAS (base):       $713 x 12 x 1.216 = $10,404
Inflation indexed:       Yes (2.5%/yr)
```

### OAS Clawback Check
```
Clawback threshold:      $90,997
Highest taxable income:  ~$78,699 (age 76, during OAS-receiving years)
Clawback triggered?      No
```

---

## 4. Tax Verification

### Worked Example: $62,106 taxable income, age 68

**Federal Tax**:
```
  $0–$57,375: $57,375 x 15.0% = $8,606
  $57,375–$114,750: $4,731 x 20.5% = $970
Bracket tax:             $9,576
Basic personal credit:   $15,705 x 15% = -$2,356
Age amount:              $8,790 - $2,667 clawback = $6,123 x 15% = -$918
Federal tax:             $6,302
```

**Ontario Tax**:
```
  $0–$51,446: $51,446 x 5.05% = $2,598
  $51,446–$102,894: $10,660 x 9.15% = $975
Bracket tax:             $3,573
Basic personal credit:   $11,865 x 5.05% = -$599
Age amount:              $5,586 - $2,966 clawback = $2,620 x 5.05% = -$132
Basic Ontario tax:       $2,842
Surtax:                  $0 (basic tax $2,842 < $4,991 threshold)
Ontario tax:             $2,842
```

**Total**: $6,302 + $2,842 = **$9,144** (effective rate: 14.7%)


**Engine verification**: calcTotalTax($62,106, 68, false) = $9,144
**Projection row tax**: $9,144

### Worked Example: $117,528 taxable income, age 67

**Federal Tax**:
```
  $0–$57,375: $57,375 x 15.0% = $8,606
  $57,375–$114,750: $57,375 x 20.5% = $11,762
  $114,750–$158,468: $2,778 x 26.0% = $722
Bracket tax:             $21,090
Basic personal credit:   $15,705 x 15% = -$2,356
Age amount:              $8,790 - $10,980 clawback = $0 x 15% = -$0
Federal tax:             $18,735
```

**Ontario Tax**:
```
  $0–$51,446: $51,446 x 5.05% = $2,598
  $51,446–$102,894: $51,448 x 9.15% = $4,707
  $102,894–$150,000: $14,634 x 11.16% = $1,633
Bracket tax:             $8,939
Basic personal credit:   $11,865 x 5.05% = -$599
Age amount:              $5,586 - $11,279 clawback = $0 x 5.05% = -$0
Basic Ontario tax:       $8,339
Surtax:                  $1,373
Ontario tax:             $9,712
```

**Total**: $18,735 + $9,712 = **$28,447** (effective rate: 24.2%)


**Engine verification**: calcTotalTax($117,528, 67, false) = $28,447
**Projection row tax**: $28,447

### Tax Reference Table

| Taxable Income | Age 68 Tax | Age 50 Tax |
| --- | --- | --- |
| $20,000 | $46 | $1,055 |
| $40,000 | $3,082 | $5,065 |
| $60,000 | $8,073 | $9,570 |
| $80,000 | $14,602 | $15,500 |
| $100,000 | $21,255 | $21,740 |
| $150,000 | $42,114 | $42,543 |

---

## 5. Debt Amortization Trace

**Consumer debt: $90,000 @ 3.5% — payoff target age 68 (4 years)**

| Age | Balance | Annual Payment | Interest | Principal | Remaining |
| --- | --- | --- | --- | --- | --- |
| 64 | $90,000 | $24,503 | $3,150 | $21,353 | $68,647 |
| 65 | $68,647 | $24,503 | $2,403 | $22,100 | $46,547 |
| 66 | $46,547 | $24,503 | $1,629 | $22,873 | $23,674 |
| 67 | $23,674 | $24,503 | $829 | $23,674 | $0 |

**Totals**: $98,010 total payments, $8,010 total interest on $90,000 principal

---

## 6. Estate Verification

*Estate analyzed at age 72 (portfolio drops to 50% of peak $488,965) and age 95 (life expectancy).*

### Estate at Age 72

```
RRSP/RRIF balance:       $211,544
TFSA balance:            $14,233
Non-reg balance:         $14,233
Real estate:             $1,100,000 (primary residence)
Gross estate:            $1,340,010

RRSP deemed income:      $211,544 (no spouse rollover — beneficiary is children)
  Tax on deemed income:  $84,975
Non-reg capital gains:   $14,233 - $10,000 cost basis = $4,233 gain
  (Cost basis: tracked from projection)
  Capital gains tax:     $1,133
Real estate gains:       $0 (primary residence exempt)

Probateable assets:      $1,325,777
  (RRSP included — no spouse beneficiary)
Probate fees:            $19,387

Total estate tax:        $105,494
Net to heirs:            $1,234,516
Distribution:            100% to children (per will)
```

### Estate at Age 95 (life expectancy)

```
RRSP/RRIF balance:       $0
TFSA balance:            $0
Non-reg balance:         $0
Real estate:             $1,100,000 (primary residence)
Gross estate:            $1,100,000

RRSP deemed income:      $0 (no balance)
Non-reg capital gains:   $0 (cost basis $0)
  (Cost basis: inferred from initial deposit)
  Capital gains tax:     $0
Real estate gains:       $0 (primary residence exempt)

Probateable assets:      $1,100,000
Probate fees:            $16,000

Total estate tax:        $16,000
Net to heirs:            $1,084,000
Distribution:            100% to children (per will)
```

### Ontario Probate Fee Formula
```
First $50,000:           $5 per $1,000 = $250
Above $50,000:           $15 per $1,000
```

---

## 7. Sustainable Withdrawal

```
Method:          Binary search (20 iterations)
Search range:    $0 — $30,000/month
Target age:      95
Solvency test:   Portfolio > $0 AND surplus >= -$1 for all years past currentAge

Result:          $3,733/month maximum sustainable expenses
                 (vs. scenario setting of $5,000/month)

Gap:             $1,267/month ($15,204/year) overspend
Implication:     At $5,000/month, portfolio may deplete early
                 At $3,733/month, portfolio survives to age 95
```

---

## 8. RRIF Minimum Withdrawal Schedule

Prescribed minimum withdrawal percentages (applied to Jan 1 balance):

| Age | Rate | On $100K | On $200K |
| --- | --- | --- | --- |
| 71 | 5.28% | $5,280 | $10,560 |
| 72 | 5.40% | $5,400 | $10,800 |
| 75 | 5.82% | $5,820 | $11,640 |
| 80 | 6.82% | $6,820 | $13,640 |
| 85 | 8.51% | $8,510 | $17,020 |
| 90 | 11.92% | $11,920 | $23,840 |
| 95 | 20.00% | $20,000 | $40,000 |

---

## 9. Known Gaps & Simplifications

| Area | Simplification | Impact |
| --- | --- | --- |
| **CPP/OAS inflation-indexed** | Benefits are indexed to inflation (fixed in v2). Realistic income growth modeled. | Accurate representation of real benefit growth |
| **No TFSA contributions** | Model doesn't add annual TFSA room ($7K/yr) | Understates TFSA growth, especially pre-retirement |
| **Real estate static** | House value stays at initial amount, no appreciation | Could understate net worth significantly over 30 years |
| **No tax bracket indexing** | Federal/Ontario brackets don't adjust for inflation | Overstates taxes in later years (bracket creep) |
| **Single tax year** | Uses 2024 brackets for all future years | Tax rates may change |
| **Debt payment from income** | Debt payments come from gross income, not savings | Accurate if income covers payments; if not, withdrawals fill the gap |
| **No CPP survivor benefit** | Not modeled (single scenario) | N/A for single filer |
| **No health/care costs** | Model uses flat expense growth | May understate expenses significantly after age 80 |
| **Employment income stops abruptly** | No part-time or gradual retirement option | May overstate withdrawal needs in early retirement |
| **Non-reg cost basis tracks proportionally** | Assumes uniform gain distribution across portfolio | Slightly inaccurate if actual holdings have varying ACBs |
| **Estate capital gains guard** | Capital gains tax is $0 when non-reg gain is $0 (fixed in v2) | Prevents phantom tax on depleted accounts |
| **Tax gross-up loop** | Iterative gross-up (10 iterations) ensures withdrawals cover taxes on withdrawals (fixed in v2) | Convergence within $50 tolerance |

---

## 10. Dashboard KPI Derivations

### Net Worth (at retirement, age 68)
```
Total portfolio:    $358,428 (RRSP $334,095 + TFSA $12,167 + NonReg $12,167)
Real estate:        $1,100,000
Net worth:          $1,458,428
```

### First-Year Retirement Income (age 68)
```
CPP:                $13,267 (taxable)
OAS:                $11,484 (taxable, after any clawback)
RRSP withdrawal:    $37,355 (taxable)
Total gross:        $62,106
Tax:                $9,144
After-tax:          $52,962
```

### Surplus/Shortfall (age 68)
```
After-tax income:   $52,962
Expenses:           $52,983
Surplus:            -$21
```

### Portfolio Depletion
```
Depletion age:      78
Sustainable monthly: $3,733/month (to age 95)
Current expenses:   $5,000/month
```

