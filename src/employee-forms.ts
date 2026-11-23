import { z } from 'zod'

const MAX_SALARY_MINOR = 10_000_000_000
const LEVELS = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'] as const

const salaryAmountSchema = z
  .string()
  .transform((value) => value.trim())
  .pipe(z.string().regex(/^(0|[1-9]\d{0,8})(\.\d{1,2})?$/, 'Enter a plain amount with up to two decimal places.'))
  .transform((value) => {
    const [whole, fraction = ''] = value.split('.')
    return Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  })
  .refine((minor) => Number.isSafeInteger(minor) && minor >= 1 && minor <= MAX_SALARY_MINOR, {
    message: 'Annual salary must be between 0.01 and 100,000,000.00.',
  })

export function salaryCanSave(raw: string, currentMinor: number): boolean {
  const parsed = salaryAmountSchema.safeParse(raw)
  return parsed.success && parsed.data !== currentMinor
}

const detailsSchema = z.object({
  jobTitle: z.string().trim().min(1, 'Enter a job title.').max(80, 'Job title must be 1 to 80 characters.'),
  email: z
    .string()
    .trim()
    .min(1, 'Enter an email.')
    .max(120, 'Email must be 1 to 120 characters.')
    .email('Enter a valid email address.'),
  level: z.enum(LEVELS),
})

export type DetailsValues = z.infer<typeof detailsSchema>

export function detailsCanSave(
  values: { jobTitle: string; email: string; level: string },
  current: { jobTitle: string; email: string; level: string },
): boolean {
  const parsed = detailsSchema.safeParse(values)
  if (!parsed.success) return false
  return (
    parsed.data.jobTitle !== current.jobTitle.trim() ||
    parsed.data.email !== current.email.trim() ||
    parsed.data.level !== current.level
  )
}

export function parseDetails(values: { jobTitle: string; email: string; level: string }) {
  return detailsSchema.safeParse(values)
}
