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
},t=>[
  index('employee_country_department').on(t.country,t.department),
  index('employee_department').on(t.department),
  check('salary_range',sql`${t.salaryMinor} BETWEEN 1 AND 10000000000 AND typeof(${t.salaryMinor}) = 'integer'`),
  check('currency_country',sql`(${t.country} = 'India' AND ${t.currency} = 'INR') OR (${t.country} = 'United States' AND ${t.currency} = 'USD') OR (${t.country} = 'United Kingdom' AND ${t.currency} = 'GBP') OR (${t.country} = 'Germany' AND ${t.currency} = 'EUR')`),
  check('revision_nonnegative',sql`${t.revision} >= 0`),
]);
