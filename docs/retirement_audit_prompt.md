I need you to create a detailed calculation audit report for my retirement planner. Do NOT change any code. Just analyze the existing codebase and produce a markdown file called CALCULATION_AUDIT.md in the docs/ folder that contains:

## 1. INPUT SNAPSHOT
For each scenario in the app, list every single input variable and its current value in a table. Include the variable name as it appears in code, the display label, the value, and the unit ($/month, %, age, etc). Miss nothing — every field from every wizard step.

## 2. PROJECTION ENGINE WALKTHROUGH
For Scenario 2 (the one with $300K RRSP, $150K DC pension, retire at 68):
- Show the COMPLETE year-by-year projection table from age 64 to 95
- Each row must include: age, employment income (if any), CPP income, OAS income, GIS/GAINS income, DB pension income, total gross income, RRSP balance start-of-year, TFSA balance start-of-year, non-reg balance start-of-year, cash balance start-of-year, DC pension balance start-of-year, RRIF minimum withdrawal (if applicable), RRSP meltdown withdrawal (if applicable), portfolio withdrawal needed, which account was drawn from and how much, taxable income for the year, federal tax, ontario tax, OAS clawback amount, total tax, net after-tax income, total expenses (inflation-adjusted), surplus/shortfall for year, all account balances end-of-year after returns applied
- Show your work for at least 3 sample years in detail (age 64, 68, 72) with every formula and intermediate calculation written out

## 3. KPI DERIVATIONS
For every KPI card and number shown on the dashboard, document:
- The exact formula used
- The inputs that feed into it
- A worked example showing the arithmetic
- Specifically cover: Net Worth at Retirement, Safe Monthly Spending (show the binary search bounds and convergence), Annual Tax Estimate, After-Tax Income, Monthly Surplus/Shortfall, Portfolio at Age 85/90/95

## 4. CHART DATA
For each chart in the app (portfolio projection chart, account breakdown chart, estate chart):
- List the exact data arrays being fed to Recharts
- Show at least 5 sample data points with the exact values

## 5. TAX ENGINE VERIFICATION
Show a complete worked example of the tax calculation for one year where taxable income is approximately $40,000:
- Federal brackets applied, line by line
- Ontario brackets applied, line by line
- Ontario surtax calculation
- Age amount credit (if applicable)
- Pension income credit (if applicable)
- Basic personal amount credits
- OAS clawback threshold check
- Final total tax

## 6. ESTATE CALCULATOR VERIFICATION  
Show the estate calculation at age 85 for Scenario 2:
- Deemed disposition on RRSP/RRIF balance
- Capital gains on non-registered
- Ontario probate fees
- Net to beneficiaries
- With vs without spouse rollover comparison

## 7. KNOWN GAPS OR ASSUMPTIONS
List anything the engine does NOT model that could affect accuracy. For example: is employment income modeled? Are RRSP contributions during working years modeled? Is debt paydown modeled year-over-year or just as a lump sum? Are CPP/OAS amounts inflation-indexed in the projection? Is the DC pension balance merged into RRSP or tracked separately?

Format everything in clean markdown tables. This is for an external audit of the math — be exhaustive and hide nothing.