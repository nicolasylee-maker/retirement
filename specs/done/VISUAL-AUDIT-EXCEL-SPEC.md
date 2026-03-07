# Visual Audit Report + Excel Export — Feature Spec

## What This Is

Two deliverables:
1. **Visual Audit** — Interactive, phase-by-phase visual breakdown of any scenario with Sankey diagrams, bar charts, pie charts, and expandable math cards
2. **Excel Export** — Multi-sheet .xlsx where every number is an Excel FORMULA (not hardcoded), so changing any assumption recalculates the entire plan

---

## Part 1: Interactive Visual Audit (React)

### Architecture

```
src/views/audit/
  VisualAudit.jsx          — Main container with phase navigation
  PhaseTimeline.jsx        — Horizontal timeline with milestone markers
  PhasePage.jsx            — Single phase view (wraps charts + cards)
  SankeyDiagram.jsx        — Money flow visualization (D3)
  IncomeExpenseBar.jsx     — Stacked bar chart (Recharts)
  IncomePie.jsx            — Pie chart for income sources at a given age
  MathCard.jsx             — Expandable "show me the math" card
  AuditSummaryPage.jsx     — Page 1: one-page executive summary
  PhasePreRetirement.jsx   — Page 2: working years
  PhaseEarlyRetirement.jsx — Page 3: retirement to 71
  PhaseRRIF.jsx            — Page 4: 72 to estate
  PhaseEstate.jsx          — Page 5: what's left and who gets it
  PhaseOptimizer.jsx       — Page 6: what could be better
```

Data source: Same `projectionData` from `projectScenario()`. No new engine work.

Libraries: Recharts (installed), D3 (installed), Lucide (installed).

### Page Navigation

Horizontal timeline bar at top, always visible:

```
[Summary] ── [Working Years] ── [Early Retirement] ── [72+] ── [Estate] ── [Optimize]
   34            34-64              65-71             72-90      Death          ✨
```

Click any phase to jump. Milestones shown dynamically:
"Retire at 65", "RRIF at 72", "CPP at 65", "OAS at 65", "Mortgage Paid at 53"

---

### Page 1: Summary (Your Plan at a Glance)

4 big numbers at top:
- RETIREMENT AT {age}
- MONEY LASTS TO {age} or "Forever ✓"
- MONTHLY INCOME ${avg}/mo (average in retirement)
- NET TO HEIRS ${amount} (after all tax)

4 horizontal phase cards below (click to navigate). Each shows:
phase name, age range, one-sentence summary, key metric, sparkline.

Expandable KEY ASSUMPTIONS strip at bottom.

---

### Page 2: Working Years (Age {currentAge} to {retirementAge-1})

**Left 60% — Sankey Diagram:**
Shows money flows for a SELECTED YEAR (age slider/dropdown).
Income sources on left → outflows on right.
Color coded: green=income, red=outflows, blue=savings.
Hover for exact amounts.

Example at age 34:
```
Salary $100K ═══╗
                ╠══► Expenses $36K
                ╠══► Mortgage $29K
                ╠══► Tax $21K
                ╚══► Savings $14K → TFSA $7K + Non-reg $7K
```

**Right 40% — Expandable Math Cards:**

SALARY card:
- Shows: "$100,000 at age 34"
- Expand: Base × 1.025^years formula, examples at ages 50 and 64

MORTGAGE card:
- Shows: "$29,088/yr — paid off at age 53"
- Expand: PMT formula, interest/principal split, total interest

TAX card:
- Shows: "$21,182 total (21.2% effective)"
- Expand: Full federal + provincial bracket-by-bracket calculation

SURPLUS → INVESTMENTS card:
- Shows: "$13,730 invested this year"
- Expand: After-tax income - expenses - mortgage = surplus,
  TFSA room allocation, non-reg overflow

**Bottom — Stacked Bar Chart:**
Green bars (income, growth) above axis, red bars (expenses, mortgage, tax) below.

**Key Insight callout:**
"89% of your retirement portfolio comes from compounding, not original savings."

---

### Page 3: Early Retirement (Age {retirementAge} to 71)

**Sankey:** CPP + OAS + TFSA draws → expenses + tax
**Math Cards:** CPP benefit calc, OAS benefit + clawback check, withdrawal order reasoning
**Pie Chart:** Income sources at age 65
**Key Insight:** "Government benefits cover 73% of expenses. TFSA fills the gap tax-free."

---

### Page 4: Age 72+ (RRIF & Mandatory Withdrawals)

**Sankey:** CPP + OAS + RRIF minimum → expenses + tax + OAS clawback
**Math Cards:** RRIF minimum calc with rate table, OAS clawback arithmetic, tax bracket change
**Bar Chart:** Ages 72-90 stacked income vs expenses
**Key Insight:** "RRIF minimums push income above clawback threshold. You lose ~$2-4K/yr of OAS."

---

### Page 5: Estate

**Waterfall Chart:** Gross estate → RRSP tax → Cap gains tax → Probate → Net to heirs
**Math Cards:** RRSP deemed disposition, capital gains calc, probate fee formula
**Pie Chart:** Estate composition (TFSA, non-reg, real estate, RRIF after tax)

---

### Page 6: Optimizer

Side-by-side Sankey diagrams: current plan vs recommended.
Before/after comparison with monthly dollar impact.

---

## Part 2: Excel Export with Formulas

### Overview

Export button: "Export to Excel — with formulas."
Generates a multi-sheet .xlsx where EVERY number (except inputs 
and lookup tables) is an Excel formula referencing the Assumptions sheet.

Change any assumption → entire plan recalculates.

### Sheet 1: Assumptions (ALL inputs)

The ONLY sheet with hardcoded values (blue text).
Every other sheet references this sheet.

```
PERSONAL                          Cell
─────────────────────────────────
Current Age                  34   B3
Retirement Age               65   B4
Life Expectancy              90   B5
Province                     ON   B6

INCOME
─────────────────────────────────
Employment Income       100,000   B9
Inflation Rate            2.5%   B10
Real Return               4.0%   B11

GOVERNMENT BENEFITS
─────────────────────────────────
CPP Monthly at 65         1,365   B14
CPP Start Age                65   B15
CPP Early Reduction/mo    0.6%   B16
CPP Late Increase/mo      0.7%   B17
OAS Monthly at 65           713   B19
OAS Start Age                65   B20
OAS Deferral Bonus/mo     0.6%   B21
OAS Clawback Threshold  93,454   B22

EXPENSES
─────────────────────────────────
Monthly Expenses          3,000   B25
Expense Reduction at Ret   10%   B26

SAVINGS
─────────────────────────────────
RRSP Balance            200,000   B29
TFSA Balance             80,000   B30
Cash Savings             10,000   B31
Non-Reg Investments          0   B32
TFSA Annual Room          7,000   B33

REAL ESTATE
─────────────────────────────────
Property Value          800,000   B36
Is Primary Residence      TRUE   B37

DEBT
─────────────────────────────────
Mortgage Balance        375,000   B40
Mortgage Rate             5.0%   B41
Mortgage Years Left         25   B42
Consumer Debt                0   B44
Consumer Debt Rate        8.0%   B45
Consumer Debt Payoff Age    70   B46
Other Debt                   0   B48
Other Debt Rate            5.0%  B49
Other Debt Payoff Age       70   B50

WITHDRAWAL
─────────────────────────────────
RRSP Meltdown Enabled    FALSE   B53
Meltdown Annual              0   B54
Meltdown Start Age          65   B55
Meltdown End Age            71   B56
```

All B column cells = blue text (inputs).
Yellow background on B10, B11, B26 (key sensitivity assumptions).

### Sheet 2: CPP & OAS Formulas

```
CPP CALCULATION
A                              B (FORMULA)
───────────────────────────────────────────
Monthly at 65                  =Assumptions!B14
Start Age                      =Assumptions!B15
Months from 65                 =(B4-65)*12
Adjustment Factor              =IF(B5<0, 1+B5*Assumptions!B16,
                                IF(B5>0, 1+B5*Assumptions!B17, 1))
Annual CPP (today $)           =B3*12*B6
Inflation Factor at Start      =(1+Assumptions!B10)^(B4-Assumptions!B3)
Annual CPP (first year $)      =B7*B8

Quick Compare:
  At age 60                    =B3*12*(1+((60-65)*12)*Assumptions!B16)
  At age 65                    =B3*12
  At age 70                    =B3*12*(1+((70-65)*12)*Assumptions!B17)

OAS CALCULATION
[Same structure with deferral bonus]

OAS CLAWBACK CHECK
Threshold                      =Assumptions!B22
Income at Start Age            [VLOOKUP to Projection sheet]
Excess                         =MAX(0, B21-B20)
Clawback                       =B22*15%
Net OAS                        =B9-B23
```

### Sheet 3: Tax Engine

Full bracket tables for Federal and Ontario (hardcoded rates — 
these ARE constants, not user inputs).

Interactive tax calculator section:
- Cell B20 = "Enter any taxable income" (yellow background)
- Formulas below compute federal + provincial tax bracket by bracket
- Uses MIN/MAX chains for progressive brackets
- Age credit formula with clawback
- Ontario surtax formula
- Total tax and effective rate

User types any income → sees full breakdown instantly.

### Sheet 4: Projection (Year-by-Year)

One row per year (age 34 to 90). Every cell is a FORMULA.

Columns:
```
A: Age           =Assumptions!B3+ROW()-2  (or seed + increment)
B: Year          =2026+(A2-Assumptions!B3)
C: Emp Income    =IF(A2<Assumptions!B4,
                   Assumptions!B9*(1+Assumptions!B10)^(A2-Assumptions!B3), 0)
D: CPP           =IF(A2>=Assumptions!B15,
                   'CPP & OAS'!B9*(1+Assumptions!B10)^(A2-Assumptions!B15), 0)
E: OAS           =IF(A2>=Assumptions!B20,
                   'CPP & OAS'!$B$[oasFirstYear]*(1+Assumptions!B10)^(A2-Assumptions!B20), 0)
F: RRIF Min      =IF(A2>=72,
                   VLOOKUP(A2,'RRIF Rates'!A:B,2,TRUE)*L1, 0)
G: Meltdown      =IF(AND(Assumptions!B53=TRUE,
                   A2>=Assumptions!B55, A2<Assumptions!B56),
                   Assumptions!B54, 0)
H: Total Taxable =C2+D2+E2+F2+G2
I: Tax           ='Tax Engine'![formula referencing H2]
J: After-Tax Inc =H2-I2+[TFSA withdrawal, tax-free]
K: Expenses      =IF(A2>=Assumptions!B4,
                   Assumptions!B25*12*(1-Assumptions!B26)*(1+Assumptions!B10)^(A2-Assumptions!B3),
                   Assumptions!B25*12*(1+Assumptions!B10)^(A2-Assumptions!B3))
L: Mortgage Pmt  =IF(A2-Assumptions!B3<Assumptions!B42,
                   PMT(Assumptions!B41, Assumptions!B42-(A2-Assumptions!B3), -M1), 0)
M: Mortgage Bal  =IF(L2>0, M1*(1+Assumptions!B41)-(L2-M1*Assumptions!B41), 0)
N: RRSP Balance  =N1*(1+Assumptions!B11)-F2-G2-[RRSP withdrawal]
O: TFSA Balance  =O1*(1+Assumptions!B11)-[TFSA withdrawal]+[TFSA deposit]
P: NonReg Bal    =P1*(1+Assumptions!B11)-[NonReg withdrawal]+[overflow]
Q: Portfolio     =N2+O2+P2
R: Net Worth     =Q2+Assumptions!B36-M2
S: Surplus       =J2-K2-L2
T: TFSA Wd       [formula based on withdrawal order]
U: RRSP Wd       [formula based on withdrawal order]
V: NonReg Wd     [formula based on withdrawal order]
W: NonReg Basis  [cost basis tracking formula]
```

Key formula rules:
- =IF() for conditional logic (retirement, benefit ages)
- =PMT() for mortgage (native Excel function)
- =VLOOKUP() for RRIF minimum rates
- =MAX()/=MIN() for clawback calculations
- Absolute refs (Assumptions!$B$10) for shared constants
- Relative refs for year-over-year compounding (N1, M1)

### Sheet 5: RRIF Rates

Lookup table (hardcoded — CRA prescribed rates):
```
Age    Minimum Rate
71     5.28%
72     5.40%
73     5.53%
...
94     18.79%
95     20.00%
```

### Sheet 6: Estate Calculator

```
Death Age                       [yellow input cell, default =Assumptions!B5]
RRIF at Death                   =VLOOKUP(B3, Projection!A:N, [col], FALSE)
TFSA at Death                   =VLOOKUP(B3, Projection!A:O, [col], FALSE)
Non-Reg at Death                =VLOOKUP(B3, Projection!A:P, [col], FALSE)
Non-Reg Cost Basis              =VLOOKUP(B3, Projection!A:W, [col], FALSE)
Real Estate                     =Assumptions!B36

Gross Estate                    =SUM(B4:B8)

RRSP Deemed Tax                 [tax formula on B4]
Capital Gains                   =MAX(0, B6-B7)
Cap Gains Inclusion (66.67%)    =B13*2/3
Cap Gains Tax                   [tax formula on B14]

Probateable Assets              =B4+B6+B8
Probate First $50K              =MIN(B17, 50000)*5/1000
Probate Above $50K              =MAX(0, B17-50000)*15/1000
Total Probate                   =B18+B19

Total Deductions                =B12+B15+B20
Net to Heirs                    =B10-B21
```

User changes Death Age → entire estate recalculates.
Try 75, 80, 85, 90, 95 to see impact of longevity.

### Sheet 7: Optimizer Comparison

Side-by-side columns: Current vs each recommendation.
Formulas reference Assumptions + modified values.

### Excel Formatting Standards

- Blue text: Hardcoded inputs (Sheet 1 only)
- Black text: All formulas (Sheets 2-7)
- Green text: Cross-sheet references
- Yellow background: Key sensitivity cells
- Conditional formatting on Projection:
  - Red when Portfolio <= 0 (depletion)
  - Green when Surplus > 0
  - Orange on OAS clawback years
- Freeze panes: Row 1 headers + Column A ages on Projection
- Named ranges for readability:
  inflation, realReturn, currentAge, retirementAge, lifeExpectancy,
  cppMonthly, oasMonthly, monthlyExpenses, etc.

### Excel Build Notes for Claude Code

```
Build using openpyxl. Requirements:

1. EVERY number on Sheets 2-7 MUST be an Excel formula.
   Only Assumptions (Sheet 1) and RRIF Rates (Sheet 5) 
   have hardcoded values.

2. Define named ranges on the Assumptions sheet for all 
   key cells. Use named ranges in formulas for readability.

3. Tax Engine must use MIN/MAX bracket chains, not a single
   hardcoded tax number. The user should be able to type 
   any income and see the full breakdown.

4. Projection sheet: exactly (lifeExpectancy - currentAge + 1)
   rows. Identical formula structure per row (drag-down 
   compatible).

5. Mortgage uses =PMT() (native Excel function).

6. After generating:
   python /mnt/skills/public/xlsx/scripts/recalc.py output.xlsx
   Verify ZERO formula errors.

7. File name: RetirePlanner_Audit_{name}_{date}.xlsx

8. Add an Excel chart sheet: Portfolio Over Time line chart
   sourced from Projection!A:Q. Updates when assumptions change.

9. Add a second chart: Income vs Expenses stacked bar from 
   Projection data.

10. Export function lives at:
    src/utils/exportAuditExcel.js
    Called from the Visual Audit view's export button.
    Receives scenario + projectionData as inputs.
```

---

## Implementation Order

1. **Excel export** — highest personal value for checking math.
   Build `exportAuditExcel.js` with all 7 sheets. Test by 
   changing inflation 2.5%→3% and verifying recalculation.

2. **Visual Audit Page 1-2** — Summary + Working Years with 
   Sankey and math cards. Validate layout.

3. **Visual Audit Pages 3-6** — Remaining phases.

4. **Connect both** — "Visual Audit" button on dashboard opens 
   the interactive view. "Export to Excel" button downloads .xlsx.

5. **Premium gating** — Both are premium features. Free users 
   see Page 1 (Summary) only, no Excel export.

---

## What This Becomes

For users (premium):
- "Download Your Financial Plan" — visual report
- "Download Excel Model" — formulas, not numbers
- Financial advisors would pay for this alone

For you (dev tool):
- Change any assumption → verify every downstream calc
- Compare Excel output vs JS engine = regression testing
- Spot-check any single year's math
- Debug edge cases by tracing formulas cell by cell
