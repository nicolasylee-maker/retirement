# Calculation Audit Report

**Scenario**: My Plan
**Generated**: 2026-03-04 04:20:55
**Engine files**: projectionEngine.js + taxEngine.js + estateEngine.js + withdrawalCalc.js
**Bug fix status**: CPP/OAS inflation-indexed, tax gross-up loop, estate $0 cap gains guard — all applied

---

## 1. Input Snapshot

| Field | Value |
| --- | --- |
| Current age | 34 |
| Retirement age | 65 |
| Life expectancy | 90 |
| Employment income | $100,000/yr (inflation-adjusted until retirement) |
| CPP | $1,365/mo, start age 65 |
| OAS | $713/mo, start age 65 |
| RRSP balance | $200,000 |
| **Combined RRSP pool** | **$200,000** |
| TFSA balance | $80,000 |
| Cash savings | $10,000 |
| Non-reg investments | $0 |
| **Combined non-reg** | **$10,000** |
| Real estate | $800,000 (primary residence) |
| Mortgage | $400,000 @ 4.0%, 20 yrs left |
| Monthly expenses | $3,000 |
| Expense reduction at retirement | 10.0% |
| Inflation rate | 2.5% |
| Real return (RRSP) | 4.0% |
| Withdrawal order | tfsa > nonReg > rrsp > other |
| Will | No |
| Primary beneficiary | other |
| Real estate in estate | Yes |
---

## 2. Year-by-Year Projection

### Pre-Retirement (Ages 34–64)

| Age | Year | Emp Inc | RRSP Wd | Expenses | Debt Pmt | Tax | Surplus | RRSP Bal | TFSA Bal | Portfolio | Net Worth |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 34 | 2026 | $100,000 | $0 | $36,000 | $29,433 | $21,182 | $0 | $208,000 | $90,480 | $315,520 | $728,953 |
| 35 | 2027 | $102,500 | $0 | $36,900 | $29,433 | $21,969 | $0 | $216,320 | $101,379 | $342,907 | $770,310 |
| 36 | 2028 | $105,062 | $0 | $37,823 | $29,433 | $22,776 | $0 | $224,973 | $112,714 | $372,256 | $814,187 |
| 37 | 2029 | $107,689 | $0 | $38,768 | $29,433 | $23,649 | $0 | $233,972 | $124,503 | $403,619 | $860,660 |
| 38 | 2030 | $110,381 | $0 | $39,737 | $29,433 | $24,588 | $0 | $243,331 | $136,763 | $437,052 | $909,808 |
| 39 | 2031 | $113,141 | $0 | $40,731 | $29,433 | $25,634 | $0 | $253,064 | $149,514 | $472,571 | $961,670 |
| 40 | 2032 | $115,969 | $0 | $41,749 | $29,433 | $26,773 | $0 | $263,186 | $162,774 | $510,209 | $1,016,304 |
| 41 | 2033 | $118,869 | $0 | $42,793 | $29,433 | $28,032 | $0 | $273,714 | $176,565 | $549,973 | $1,073,745 |
| 42 | 2034 | $121,840 | $0 | $43,863 | $29,433 | $29,322 | $0 | $284,662 | $190,908 | $591,964 | $1,134,120 |
| 43 | 2035 | $124,886 | $0 | $44,959 | $29,433 | $30,644 | $0 | $296,049 | $205,824 | $636,287 | $1,197,561 |
| 44 | 2036 | $128,008 | $0 | $46,083 | $29,433 | $32,000 | $0 | $307,891 | $221,337 | $683,051 | $1,264,210 |
| 45 | 2037 | $131,209 | $0 | $47,235 | $29,433 | $33,389 | $0 | $320,206 | $237,470 | $732,372 | $1,334,209 |
| 46 | 2038 | $134,489 | $0 | $48,416 | $29,433 | $34,813 | $0 | $333,015 | $254,249 | $784,367 | $1,407,711 |
| 47 | 2039 | $137,851 | $0 | $49,626 | $29,433 | $36,272 | $0 | $346,335 | $271,699 | $839,163 | $1,484,872 |
| 48 | 2040 | $141,297 | $0 | $50,867 | $29,433 | $37,768 | $0 | $360,189 | $289,847 | $896,888 | $1,565,859 |
| 49 | 2041 | $144,830 | $0 | $52,139 | $29,433 | $39,302 | $0 | $374,596 | $308,721 | $957,678 | $1,650,841 |
| 50 | 2042 | $148,451 | $0 | $53,442 | $29,433 | $40,873 | $0 | $389,580 | $328,350 | $1,021,676 | $1,739,997 |
| 51 | 2043 | $152,162 | $0 | $54,778 | $29,433 | $42,518 | $0 | $405,163 | $348,764 | $1,088,993 | $1,833,480 |
| 52 | 2044 | $155,966 | $0 | $56,148 | $29,433 | $44,229 | $0 | $421,370 | $369,994 | $1,159,756 | $1,931,455 |
| 53 | 2045 | $159,865 | $0 | $57,551 | $29,433 | $45,982 | $0 | $438,225 | $392,074 | $1,234,120 | $2,034,120 |
| 54 | 2046 | $163,862 | $0 | $58,990 | $0 | $47,779 | $0 | $455,754 | $415,037 | $1,342,861 | $2,142,861 |
| 55 | 2047 | $167,958 | $0 | $60,465 | $0 | $49,622 | $0 | $473,984 | $438,919 | $1,456,762 | $2,256,762 |
| 56 | 2048 | $172,157 | $0 | $61,977 | $0 | $51,510 | $0 | $492,943 | $463,755 | $1,576,050 | $2,376,050 |
| 57 | 2049 | $176,461 | $0 | $63,526 | $0 | $53,445 | $0 | $512,661 | $489,586 | $1,700,961 | $2,500,961 |
| 58 | 2050 | $180,873 | $0 | $65,114 | $0 | $55,519 | $0 | $533,167 | $516,449 | $1,831,649 | $2,631,649 |
| 59 | 2051 | $185,394 | $0 | $66,742 | $0 | $57,688 | $0 | $554,494 | $544,387 | $1,968,317 | $2,768,317 |
| 60 | 2052 | $190,029 | $0 | $68,411 | $0 | $59,911 | $0 | $576,674 | $573,443 | $2,111,226 | $2,911,226 |
| 61 | 2053 | $194,780 | $0 | $70,121 | $0 | $62,190 | $0 | $599,741 | $603,660 | $2,260,643 | $3,060,643 |
| 62 | 2054 | $199,650 | $0 | $71,874 | $0 | $64,526 | $0 | $623,730 | $635,087 | $2,416,848 | $3,216,848 |
| 63 | 2055 | $204,641 | $0 | $73,671 | $0 | $66,920 | $0 | $648,680 | $667,770 | $2,580,133 | $3,380,133 |
| 64 | 2056 | $209,757 | $0 | $75,512 | $0 | $69,375 | $0 | $674,627 | $701,761 | $2,750,803 | $3,550,803 |

### Retirement & Drawdown (Ages 65–90)

| Age | Year | CPP | OAS | RRSP Wd | TFSA Wd | NonReg Wd | Expenses | Debt Pmt | Tax | Surplus | RRSP Bal | Portfolio | Net Worth |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 65 | 2057 | $35,217 | $18,395 | $0 | $22,184 | $0 | $69,660 | $0 | $6,136 | $0 | $701,612 | $2,837,764 | $3,637,764 |
| 66 | 2058 | $36,098 | $18,855 | $0 | $22,942 | $0 | $71,402 | $0 | $6,493 | $0 | $729,676 | $2,927,415 | $3,727,415 |
| 67 | 2059 | $37,000 | $19,327 | $0 | $23,718 | $0 | $73,187 | $0 | $6,858 | $0 | $758,863 | $3,019,845 | $3,819,845 |
| 68 | 2060 | $37,925 | $19,810 | $0 | $24,535 | $0 | $75,016 | $0 | $7,254 | $0 | $789,218 | $3,115,122 | $3,915,122 |
| 69 | 2061 | $38,873 | $20,305 | $0 | $25,438 | $0 | $76,892 | $0 | $7,724 | $0 | $820,787 | $3,213,272 | $4,013,272 |
| 70 | 2062 | $39,845 | $20,813 | $0 | $26,363 | $0 | $78,814 | $0 | $8,206 | $0 | $853,618 | $3,314,386 | $4,114,386 |
| 71 | 2063 | $40,841 | $21,333 | $0 | $27,311 | $0 | $80,784 | $0 | $8,700 | $0 | $887,763 | $3,418,558 | $4,218,558 |
| 72 | 2064 | $41,862 | $19,134 | $47,939 | $0 | $0 | $82,804 | $0 | $23,675 | $0 | $873,416 | $3,507,999 | $4,307,999 |
| 73 | 2065 | $42,909 | $19,388 | $48,300 | $0 | $0 | $84,874 | $0 | $24,241 | $0 | $858,121 | $3,599,627 | $4,399,627 |
| 74 | 2066 | $43,981 | $19,650 | $48,655 | $0 | $0 | $86,996 | $0 | $24,881 | $0 | $841,844 | $3,693,436 | $4,493,436 |
| 75 | 2067 | $45,081 | $19,922 | $48,995 | $703 | $0 | $89,171 | $0 | $25,530 | $0 | $824,563 | $3,789,488 | $4,589,488 |
| 76 | 2068 | $46,208 | $20,207 | $49,309 | $1,915 | $0 | $91,400 | $0 | $26,238 | $0 | $806,264 | $3,887,795 | $4,687,795 |
| 77 | 2069 | $47,363 | $20,481 | $49,747 | $3,143 | $0 | $93,685 | $0 | $27,048 | $0 | $786,778 | $3,988,301 | $4,788,301 |
| 78 | 2070 | $48,547 | $20,785 | $50,039 | $4,478 | $0 | $96,027 | $0 | $27,821 | -$0 | $766,209 | $4,091,136 | $4,891,136 |
| 79 | 2071 | $49,761 | $21,085 | $50,417 | $5,808 | $0 | $98,428 | $0 | $28,642 | $0 | $744,424 | $4,196,308 | $4,996,308 |
| 80 | 2072 | $51,005 | $21,398 | $50,770 | $7,188 | $0 | $100,889 | $0 | $29,471 | $0 | $721,401 | $4,303,884 | $5,103,884 |
| 81 | 2073 | $52,280 | $21,727 | $51,075 | $8,629 | $0 | $103,411 | $0 | $30,300 | $0 | $697,138 | $4,413,947 | $5,213,947 |
| 82 | 2074 | $53,587 | $22,055 | $51,449 | $10,078 | $0 | $105,996 | $0 | $31,172 | -$0 | $671,517 | $4,526,517 | $5,326,517 |
| 83 | 2075 | $54,927 | $22,400 | $51,774 | $11,590 | $0 | $108,646 | $0 | $32,045 | $0 | $644,533 | $4,641,679 | $5,441,679 |
| 84 | 2076 | $56,300 | $22,758 | $52,078 | $13,155 | $0 | $111,362 | $0 | $32,928 | $0 | $616,153 | $4,759,504 | $5,559,504 |
| 85 | 2077 | $57,707 | $23,118 | $52,435 | $14,737 | $0 | $114,146 | $0 | $33,851 | -$0 | $586,267 | $4,880,026 | $5,680,026 |
| 86 | 2078 | $59,150 | $23,502 | $52,705 | $16,403 | $0 | $117,000 | $0 | $34,761 | $0 | $554,904 | $5,003,354 | $5,803,354 |
| 87 | 2079 | $60,629 | $23,894 | $52,993 | $18,107 | $0 | $119,925 | $0 | $35,698 | -$0 | $521,987 | $5,129,544 | $5,929,544 |
| 88 | 2080 | $62,144 | $24,294 | $53,295 | $19,850 | $0 | $122,923 | $0 | $36,660 | $0 | $487,440 | $5,258,655 | $6,058,655 |
| 89 | 2081 | $63,698 | $24,709 | $53,570 | $21,654 | $0 | $125,996 | $0 | $37,634 | $0 | $451,225 | $5,390,769 | $6,190,769 |
| 90 | 2082 | $65,291 | $25,223 | $53,786 | $23,489 | $0 | $129,146 | $0 | $38,643 | -$0 | $413,337 | $5,526,033 | $6,326,033 |

---

## 3. CPP & OAS Verification

### CPP Calculation
```
Monthly at 65:           $1,365
Start age:               65 (At 65 (no adjustment))
Adjustment:              Factor = 1.000
Adjustment factor:       1.000
Annual CPP (base):       $1,365 x 12 x 1.000 = $16,380
Inflation indexed:       Yes (2.5%/yr)
  At age 70:          $16,380 x 2.433 = $39,845
```

### OAS Calculation
```
Monthly at 65:           $713
Start age:               65
Adjustment factor:       1.000
Annual OAS (base):       $713 x 12 x 1.000 = $8,556
Inflation indexed:       Yes (2.5%/yr)
```

### OAS Clawback Check
```
Clawback threshold:      $93,454
Highest taxable income:  ~$144,300 (age 90, during OAS-receiving years)
Clawback triggered?      Yes
```

---

## 4. Tax Verification

### Worked Example: $53,613 taxable income, age 65

**Federal Tax**:
```
  $0–$57,375: $53,613 x 14.5% = $7,774
Bracket tax:             $7,774
Basic personal credit:   $16,129 x 14.499999999999998% = -$2,339
Age amount:              $9,028 - $1,214 clawback = $7,814 x 14.499999999999998% = -$1,133
Federal tax:             $4,302
```

**Ontario Tax**:
```
  $0–$52,886: $52,886 x 5.05% = $2,671
  $52,886–$105,775: $727 x 9.15% = $67
Bracket tax:             $2,737
Basic personal credit:   $12,747 x 5.05% = -$644
Age amount:              $6,223 - $1,092 clawback = $5,131 x 5.05% = -$259
Basic Ontario tax:       $1,834
Surtax:                  $0 (basic tax $1,834 < $5,710 threshold)
Ontario tax:             $1,834
```

**Total**: $4,302 + $1,834 = **$6,137** (effective rate: 11.4%)


**Engine verification**: calcTotalTax($53,613, 65, false) = $6,137
**Projection row tax**: $6,136

### Worked Example: $209,757 taxable income, age 64

**Federal Tax**:
```
  $0–$57,375: $57,375 x 14.5% = $8,319
  $57,375–$114,750: $57,375 x 20.5% = $11,762
  $114,750–$177,882: $63,132 x 26.0% = $16,414
  $177,882–$253,414: $31,875 x 29.0% = $9,244
Bracket tax:             $45,739
Basic personal credit:   $16,129 x 14.499999999999998% = -$2,339
Federal tax:             $43,401
```

**Ontario Tax**:
```
  $0–$52,886: $52,886 x 5.05% = $2,671
  $52,886–$105,775: $52,889 x 9.15% = $4,839
  $105,775–$150,000: $44,225 x 11.16% = $4,936
  $150,000–$220,000: $59,757 x 12.16% = $7,266
Bracket tax:             $19,712
Basic personal credit:   $12,747 x 5.05% = -$644
Basic Ontario tax:       $19,068
Surtax:                  $6,906
Ontario tax:             $25,974
```

**Total**: $43,401 + $25,974 = **$69,375** (effective rate: 33.1%)


**Engine verification**: calcTotalTax($209,757, 64, false) = $69,375
**Projection row tax**: $69,375

### Tax Reference Table

| Taxable Income | Age 65 Tax | Age 50 Tax |
| --- | --- | --- |
| $20,000 | $0 | $928 |
| $40,000 | $2,835 | $4,838 |
| $60,000 | $7,613 | $9,197 |
| $80,000 | $14,129 | $15,127 |
| $100,000 | $20,661 | $21,182 |
| $150,000 | $41,117 | $41,546 |

---

## 5. Debt Amortization Trace

**Mortgage: $400,000 @ 4.0%, 20 years remaining**

| Age | Balance | Annual Payment | Interest | Principal | Remaining |
| --- | --- | --- | --- | --- | --- |
| 34 | $400,000 | $36,000 | $16,000 | $20,000 | $380,000 |
| 35 | $380,000 | $35,200 | $15,200 | $20,000 | $360,000 |
| 36 | $360,000 | $34,400 | $14,400 | $20,000 | $340,000 |
| 37 | $340,000 | $33,600 | $13,600 | $20,000 | $320,000 |
| 38 | $320,000 | $32,800 | $12,800 | $20,000 | $300,000 |
| 39 | $300,000 | $32,000 | $12,000 | $20,000 | $280,000 |
| 40 | $280,000 | $31,200 | $11,200 | $20,000 | $260,000 |
| 41 | $260,000 | $30,400 | $10,400 | $20,000 | $240,000 |
| 42 | $240,000 | $29,600 | $9,600 | $20,000 | $220,000 |
| 43 | $220,000 | $28,800 | $8,800 | $20,000 | $200,000 |
| 44 | $200,000 | $28,000 | $8,000 | $20,000 | $180,000 |
| 45 | $180,000 | $27,200 | $7,200 | $20,000 | $160,000 |
| 46 | $160,000 | $26,400 | $6,400 | $20,000 | $140,000 |
| 47 | $140,000 | $25,600 | $5,600 | $20,000 | $120,000 |
| 48 | $120,000 | $24,800 | $4,800 | $20,000 | $100,000 |
| 49 | $100,000 | $24,000 | $4,000 | $20,000 | $80,000 |
| 50 | $80,000 | $23,200 | $3,200 | $20,000 | $60,000 |
| 51 | $60,000 | $22,400 | $2,400 | $20,000 | $40,000 |
| 52 | $40,000 | $21,600 | $1,600 | $20,000 | $20,000 |
| 53 | $20,000 | $20,800 | $800 | $20,000 | $0 |

---

## 6. Estate Verification

*Estate analyzed at age 35 (portfolio drops to 50% of peak $5,526,033) and age 90 (life expectancy).*

### Estate at Age 35

```
RRSP/RRIF balance:       $216,320
TFSA balance:            $101,379
Non-reg balance:         $25,208
Real estate:             $800,000 (primary residence)
Gross estate:            $770,310

RRSP deemed income:      $216,320 (no spouse rollover — beneficiary is other)
  Tax on deemed income:  $72,523
Non-reg capital gains:   $25,208 - $23,583 cost basis = $1,625 gain
  (Cost basis: tracked from projection)
  Capital gains tax:     $390
Real estate gains:       $0 (primary residence exempt)

Probateable assets:      $1,041,528
  (RRSP included — no spouse beneficiary)
Probate fees:            $15,123

Total estate tax:        $88,036
Net to heirs:            $682,274
Distribution:            100% to other heirs
```

### Estate at Age 90 (life expectancy)

```
RRSP/RRIF balance:       $413,337
TFSA balance:            $1,302,171
Non-reg balance:         $3,810,526
Real estate:             $800,000 (primary residence)
Gross estate:            $6,326,034

RRSP deemed income:      $413,337 (no spouse rollover — beneficiary is other)
  Tax on deemed income:  $206,982
Non-reg capital gains:   $3,810,526 - $868,162 cost basis = $2,942,364 gain
  (Cost basis: tracked from projection)
  Capital gains tax:     $787,518
Real estate gains:       $0 (primary residence exempt)

Probateable assets:      $5,023,863
  (RRSP included — no spouse beneficiary)
Probate fees:            $74,858

Total estate tax:        $1,069,358
Net to heirs:            $5,256,676
Distribution:            100% to other heirs
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

Result:          $3,876/month maximum sustainable expenses
                 (vs. scenario setting of $3,000/month)

Headroom:        $876/month under the sustainable limit
Implication:     Current expenses are sustainable to age 95
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
| **No proactive TFSA top-up** | Surplus cash is routed to TFSA, but no independent annual contribution ($7K/yr) is made regardless of surplus | Slightly understates TFSA growth when surplus is low or negative |
| **Real estate static** | House value stays at initial amount, no appreciation | Could understate net worth significantly over 30 years |
| **No tax bracket indexing** | Federal/Ontario brackets don't adjust for inflation | Overstates taxes in later years (bracket creep) |
| **Single tax year** | Uses 2024 brackets for all future years | Tax rates may change |
| **Debt payment from income** | Debt payments come from gross income, not savings | Accurate if income covers payments; if not, withdrawals fill the gap |
| **Mortgage amortization** | Uses constant-principal repayment (declining total payment) instead of standard Canadian fixed-payment amortization. Early-year payments are overstated, later-year payments understated. | Total interest understated by ~8% over mortgage life. Modest effect on retirement portfolio — conservative in early years, slightly optimistic in later years. v2 improvement candidate. |
| **No CPP survivor benefit** | Not modeled (single scenario) | N/A for single filer |
| **No health/care costs** | Model uses flat expense growth | May understate expenses significantly after age 80 |
| **Employment income stops abruptly** | No part-time or gradual retirement option | May overstate withdrawal needs in early retirement |
| **Non-reg cost basis tracks proportionally** | Assumes uniform gain distribution across portfolio | Slightly inaccurate if actual holdings have varying ACBs |
| **Estate capital gains guard** | Capital gains tax is $0 when non-reg gain is $0 (fixed in v2) | Prevents phantom tax on depleted accounts |
| **Tax gross-up loop** | Iterative gross-up (10 iterations) ensures withdrawals cover taxes on withdrawals (fixed in v2) | Convergence within $50 tolerance |

---

## 10. Dashboard KPI Derivations

### Net Worth (at retirement, age 65)
```
Total portfolio:    $2,837,764 (RRSP $701,612 + TFSA $706,760 + NonReg $1,429,392)
Real estate:        $800,000
Net worth:          $3,637,764
```

### First-Year Retirement Income (age 65)
```
CPP:                $35,217 (taxable)
OAS:                $18,395 (taxable, after any clawback)
TFSA withdrawal:    $22,184 (tax-free)
Total gross:        $75,797
Tax:                $6,136
After-tax:          $69,660
```

### Surplus/Shortfall (age 65)
```
After-tax income:   $69,660
Expenses:           $69,660
Surplus:            $0
```

### Portfolio Depletion
```
Portfolio survives to age 90 (never depleted)
Sustainable monthly: $3,876/month
```


---

## 11. Optimizer Recommendations

Optimizer not yet run — navigate to the Optimize tab first to generate recommendations.

