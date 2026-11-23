# Dashboard design
The employee dashboard is a compensation ledger built from shadcn/ui. Surfaces stay graphite. Teal is reserved for saving a salary and the focus ring. Money is set in IBM Plex Mono with the currency code in the figure. UI changes follow [unslop](https://github.com/heydamir/unslop) on top of these components. Do not add a second, hand-built control style.

## Layout and hierarchy
A sidebar holds ACME, Insight, and Employees. A floating bottom-right Made by chetangehlot badge (Powered-by style) is injected with the HTML shell and links to https://chetangehlot.com. The opening page is Insights. The title and rate-date line sit on the left. Country, department, and Export CSV sit on the right. Then one card per currency, then two Recharts: a bar chart for headcount by department and a line chart for headcount by level. The Employees page is the directory: search, country, department, level, and status, then the employee list. On a wide screen that list is a table. Below 768px it becomes a card for each employee. A row or card opens that employee’s salary, band, profile, and salary history. Amounts use the currency symbol. Give each employee a visible stable ID beside their name. Label the insight with its country and department. Name search does not change the insight.

Use the full viewport. The employee list fills the height under its filters, and only the rows or cards scroll. The row count and page controls sit under the list. Keep a 24px page inset. Below 768px, keep search beside a filter icon; the country, department, level, and status controls open from that icon. Right-align numeric columns and use tabular numerals.

## Visual tokens
Use Inter with a system sans-serif fallback. Set body text at 16px/24px and field labels at 14px/20px. The page title shares the header so the summary and directory can use the viewport. Use 4, 8, 16, 24 and 32px spacing and 8px control corners.

| Purpose | Light | Dark |
| --- | --- | --- |
| Page / panel | #F3F6F7 / #FFFFFF | #101A20 / #18252C |
| Text / secondary | #182830 / #495C65 | #EDF4F6 / #B8CAD2 |
| Action and focus | #075E60 | #76D7CC |
| Validation error | #A02A27 | #FFAEA6 |

## Interaction
Use labeled inputs and native selects. The editor identifies the employee, country, currency and current annual salary before the amount field. Use “Save salary” and “Cancel”. Disable repeat submissions while saving. On validation errors, preserve the entry and associate the message with the field. On conflicts, offer a reload. Announce success and refresh the figures.

Provide visible keyboard focus, 44px action targets, an empty state with “Clear filters”, and a retry action for failed reads. Distinguish loading from zero employees. Include the currency code on every monetary row and the period in every salary heading. Show import, export, add-employee and remove-employee success or error feedback in a toast at the top-right corner. CSV import accepts up to 10,000 employees in one file. Removing an employee asks for confirmation first.
