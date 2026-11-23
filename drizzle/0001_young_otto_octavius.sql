CREATE TABLE `salary_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`employee_id` text NOT NULL,
	`effective_on` text NOT NULL,
	`salary_minor` integer NOT NULL,
	`reason` text NOT NULL,
	CONSTRAINT "history_salary_range" CHECK("salary_minor" BETWEEN 1 AND 10000000000 AND typeof("salary_minor") = 'integer')
);
--> statement-breakpoint
CREATE INDEX `salary_history_employee` ON `salary_history` (`employee_id`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_employees` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`department` text NOT NULL,
	`country` text NOT NULL,
	`currency` text NOT NULL,
	`salary_minor` integer NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`job_title` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`level` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'Active' NOT NULL,
	`hired_on` text DEFAULT '' NOT NULL,
	CONSTRAINT "salary_range" CHECK("__new_employees"."salary_minor" BETWEEN 1 AND 10000000000 AND typeof("__new_employees"."salary_minor") = 'integer'),
	CONSTRAINT "currency_country" CHECK(("__new_employees"."country" = 'India' AND "__new_employees"."currency" = 'INR') OR ("__new_employees"."country" = 'United States' AND "__new_employees"."currency" = 'USD') OR ("__new_employees"."country" = 'United Kingdom' AND "__new_employees"."currency" = 'GBP') OR ("__new_employees"."country" = 'Germany' AND "__new_employees"."currency" = 'EUR')),
	CONSTRAINT "revision_nonnegative" CHECK("__new_employees"."revision" >= 0),
	CONSTRAINT "employee_status" CHECK("__new_employees"."status" IN ('Active', 'Inactive'))
);
--> statement-breakpoint
INSERT INTO `__new_employees`("id", "name", "department", "country", "currency", "salary_minor", "revision", "job_title", "email", "level", "status", "hired_on") SELECT "id", "name", "department", "country", "currency", "salary_minor", "revision", '', '', '', 'Active', '' FROM `employees`;--> statement-breakpoint
DROP TABLE `employees`;--> statement-breakpoint
ALTER TABLE `__new_employees` RENAME TO `employees`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `employee_country_department` ON `employees` (`country`,`department`);--> statement-breakpoint
CREATE INDEX `employee_department` ON `employees` (`department`);