CREATE TABLE `employees` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`department` text NOT NULL,
	`country` text NOT NULL,
	`currency` text NOT NULL,
	`salary_minor` integer NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	CONSTRAINT "salary_range" CHECK("employees"."salary_minor" BETWEEN 1 AND 10000000000 AND typeof("employees"."salary_minor") = 'integer'),
	CONSTRAINT "currency_country" CHECK(("employees"."country" = 'India' AND "employees"."currency" = 'INR') OR ("employees"."country" = 'United States' AND "employees"."currency" = 'USD') OR ("employees"."country" = 'United Kingdom' AND "employees"."currency" = 'GBP') OR ("employees"."country" = 'Germany' AND "employees"."currency" = 'EUR')),
	CONSTRAINT "revision_nonnegative" CHECK("employees"."revision" >= 0)
);
--> statement-breakpoint
CREATE INDEX `employee_country_department` ON `employees` (`country`,`department`);--> statement-breakpoint
CREATE INDEX `employee_department` ON `employees` (`department`);