# Dashboard design
The employee dashboard uses a compact flat layout, teal actions and a native salary-edit dialog. For UI changes, consult [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/tree/281e453/.claude/skills/ui-ux-pro-max). The design search used “HR employee management dashboard” with density 8, followed by the React form guidance.

## Layout and hierarchy
Lead with the group selectors and currency summary. Keep search with the group filters and place the directory below the summary. Give each employee a visible stable ID beside their name so HR can distinguish people with the same name. Label each summary with its active scope. The PRD records the open question about name search.

Use a centered layout up to 1120px wide. Below 768px, stack controls and keep the edit action reachable without horizontal scrolling. Right-align numeric columns and use tabular numerals.

## Visual tokens
Use Inter with a system sans-serif fallback. Set body text at 16px/24px, field labels at 14px/20px and the page title at 32px/40px. Use 4, 8, 16, 24 and 32px spacing and 8px control corners.

| Purpose | Light | Dark |
| --- | --- | --- |
| Page / panel | #F3F6F7 / #FFFFFF | #101A20 / #18252C |
| Text / secondary | #182830 / #495C65 | #EDF4F6 / #B8CAD2 |
| Action and focus | #075E60 | #76D7CC |
| Validation error | #A02A27 | #FFAEA6 |

## Interaction
Use labeled inputs and native selects. The editor identifies the employee, country, currency and current annual salary before the amount field. Use “Save salary” and “Cancel”. Disable repeat submissions while saving. On validation errors, preserve the entry and associate the message with the field. On conflicts, offer a reload. Announce success and refresh the figures.

Provide visible keyboard focus, 44px action targets, an empty state with “Clear filters”, and a retry action for failed reads. Distinguish loading from zero employees. Include the currency code on every monetary row and the period in every salary heading.
