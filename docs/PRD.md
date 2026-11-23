# ACME Compensation

**Draft for review · 23 November 2026.** The [original requirements](../REQUIREMENTS.md) were committed before implementation. This companion describes how an HR manager will use the dashboard and how a reviewer can verify it.

## Problem and user

ACME’s HR manager maintains salary spreadsheets for 10,000 employees across four countries. When one employee’s salary changes, HR needs to find the right record, save the new annual base salary, and answer a question such as “What does Engineering in India spend on annual base pay now?”

## Release priorities

| Priority | Product decision |
| --- | --- |
| P0 | Find an employee by name or stable ID, combine country and department filters, and page through matching records. |
| P0 | Show the employee’s current annual base salary and currency, accept a validated change, and prevent a stale edit from overwriting a newer one. |
| P0 | Show headcount, total and average annual base salary for the selected group, with a separate row for each currency. |
| P1 | No additional feature is scheduled. Deployment, persistence checks and the demo are required release work. |
| P2 | Revisit salary history and HR access roles if the product progresses to real employee data. |

Payroll runs, tax calculations and payments belong to payroll execution. Bonuses and benefits need a different compensation model. Currency conversion would require a rate source and valuation date. All are outside this release.

## Workflow and screens

Open the pay insight, choose **India** and **Engineering**, and note the INR total. Open **Employees**, search by name or ID, and confirm the employee’s identity. Open the salary editor, increase the annual base salary by ₹10,000 and save. Return to the insight with the same country and department, and compare the new total with the original. Pagination on the employee page must never change the group being measured.

## Acceptance checks

- [ ] **Find.** Among exactly 10,000 fictional employees, a name or ID search combined with country and department returns the matching records. An empty result offers a way to clear the filters.
- [ ] **Edit.** A valid decimal amount saves in the recorded currency and survives refresh. An invalid amount leaves the stored salary unchanged. A conflicting edit tells HR to reload the latest record.
- [ ] **Report.** A ₹10,000 raise increases the India Engineering INR total by exactly ₹10,000. Headcount stays constant. The average reflects the new total divided by headcount and rounds to the nearest minor unit. Other currencies retain their own totals.

## Decision

Name or ID search narrows the employee directory only. The insight stays scoped to country and department, so the group total stays put while HR finds one person. Both pages share that country and department.
