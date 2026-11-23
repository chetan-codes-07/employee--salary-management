import { sql } from 'drizzle-orm';
import { sqliteTable,text,integer,index,check } from 'drizzle-orm/sqlite-core';
export const employees=sqliteTable('employees',{
  id:text('id').primaryKey(),
  name:text('name').notNull(),
  department:text('department').notNull(),
  country:text('country').notNull(),
  currency:text('currency').notNull(),
  salaryMinor:integer('salary_minor').notNull(),
  revision:integer('revision').notNull().default(0),
  jobTitle:text('job_title').notNull().default(''),
  email:text('email').notNull().default(''),
  level:text('level').notNull().default(''),
  status:text('status').notNull().default('Active'),
  hiredOn:text('hired_on').notNull().default(''),
},t=>[
  index('employee_country_department').on(t.country,t.department),
  index('employee_department').on(t.department),
  check('salary_range',sql`${t.salaryMinor} BETWEEN 1 AND 10000000000 AND typeof(${t.salaryMinor}) = 'integer'`),
  check('currency_country',sql`(${t.country} = 'India' AND ${t.currency} = 'INR') OR (${t.country} = 'United States' AND ${t.currency} = 'USD') OR (${t.country} = 'United Kingdom' AND ${t.currency} = 'GBP') OR (${t.country} = 'Germany' AND ${t.currency} = 'EUR')`),
  check('revision_nonnegative',sql`${t.revision} >= 0`),
  check('employee_status',sql`${t.status} IN ('Active', 'Inactive')`),
]);

export const salaryHistory=sqliteTable('salary_history',{
  id:integer('id').primaryKey({autoIncrement:true}),
  employeeId:text('employee_id').notNull().references(()=>employees.id),
  effectiveOn:text('effective_on').notNull(),
  salaryMinor:integer('salary_minor').notNull(),
  reason:text('reason').notNull(),
},t=>[
  index('salary_history_employee').on(t.employeeId),
  check('history_salary_range',sql`${t.salaryMinor} BETWEEN 1 AND 10000000000 AND typeof(${t.salaryMinor}) = 'integer'`),
]);

export const hrSessions = sqliteTable('hr_sessions', {
  digest: text('digest').primaryKey(),
  expiresAt: integer('expires_at').notNull(),
}, t => [index('hr_sessions_expiry').on(t.expiresAt)]);

export const loginAttempts = sqliteTable('login_attempts', {
  client: text('client').primaryKey(),
  attempts: integer('attempts').notNull(),
  expiresAt: integer('expires_at').notNull(),
});

export const employeeSequence = sqliteTable('employee_sequence', {
  singleton: integer('singleton').primaryKey(),
  lastIssued: integer('last_issued').notNull(),
}, t => [check('single_sequence', sql`${t.singleton} = 1`)]);

export const importReceipts = sqliteTable('import_receipts', {
  batchKey: text('batch_key').primaryKey(),
  digest: text('digest').notNull(),
});
