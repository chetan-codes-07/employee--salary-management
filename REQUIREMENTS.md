# ACME Compensation | Product requirements

ACME’s HR manager maintains salaries for 10,000 employees across four countries in spreadsheets. When HR approves a raise, they need to confirm the right employee received it and answer questions such as “What does Engineering in India now spend on annual base pay?” The dashboard should answer both in one workflow.

## The HR workflow

HR selects India and Engineering in Insights and notes the INR total. In Employees, HR finds the person by name or stable ID, confirms their identity and currency, and saves the new annual salary. Back in Insights, the same country and department define the comparison. Searching for one person or moving to another directory page must preserve the team being measured.

## Acceptance criteria

1. HR can find an employee by name or ID among 10,000 records and narrow the list by country and department.
2. HR can update an employee’s annual base salary in their recorded currency. Invalid amounts produce an error, and a successful edit survives a refresh.
3. HR can see headcount, average salary, and total salary for a filtered group. Different currencies appear separately, and a saved edit updates the figures.

**Worked example.** Two India Engineering employees earn ₹100,000 and ₹200,000 annually. Raising the first salary to ₹110,000 takes the team total from ₹300,000 to ₹310,000 and its average from ₹150,000 to ₹155,000. Headcount stays at two. A US Engineering employee contributes only to the USD group.

## Decisions and boundaries

- **Comparable pay.** Use annual base salary in the recorded currency (INR, USD, GBP or EUR). Store integer minor units and round the average once, after dividing the group total by headcount. A single global total would depend on an exchange rate and valuation date.
- **Reliable edits.** Accept amounts from 0.01 to 100,000,000.00 with up to two decimal places. If two HR sessions edit the same record, the second save must surface the conflict so the editor can review the latest value.
- **Repeatable demo.** Seed exactly 10,000 fictional employees with stable IDs. Rerunning the seed preserves saved raises and additional employees.
- **Deliberate exclusions.** Payroll, tax withholding and bank payments require pay schedules, statutory rules and payment controls. Bonuses and benefits require a broader definition of compensation. None are needed to answer the annual base-pay question.

The [original brief](https://github.com/chetan-codes-07/employee--salary-management/blob/a1cd326/REQUIREMENTS.md) predates implementation. Sign-in, employee administration, CSV tools, charts and a USD display estimate were added later. The estimate uses fixed fictional rates and does not enter reported totals. See the [decision log](docs/DECISIONS.md) for those additions.
