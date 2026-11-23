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

On the dashboard, choose **India** and **Engineering** and note the INR total. Search by name or ID and confirm the employee’s identity. Open the salary editor, increase the annual base salary by ₹10,000 and save. Refresh, return to the same country and department, and compare the new total with the original. Pagination must never change the group being measured.

## Acceptance checks

- [ ] **Find.** Among exactly 10,000 fictional employees, a name or ID search combined with country and department returns the matching records. An empty result offers a way to clear the filters.
- [ ] **Edit.** A valid decimal amount saves in the recorded currency and survives refresh. An invalid amount leaves the stored salary unchanged. A conflicting edit tells HR to reload the latest record.
- [ ] **Report.** A ₹10,000 raise increases the India Engineering INR total by exactly ₹10,000. Headcount stays constant. The average reflects the new total divided by headcount and rounds to the nearest minor unit. Other currencies retain their own totals.

## Decision for review

Should typing a name or ID narrow only the directory, or also the summary? The original requirements say “same filtered population.” For the demo, the proposed refinement is to keep the summary scoped to country and department while search narrows the directory. Label both scopes explicitly so HR can watch the team total while editing a single employee.
