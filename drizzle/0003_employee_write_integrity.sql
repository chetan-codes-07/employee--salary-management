CREATE TABLE `employee_sequence` (
	`singleton` integer PRIMARY KEY NOT NULL,
	`last_issued` integer NOT NULL,
	CONSTRAINT "single_sequence" CHECK("employee_sequence"."singleton" = 1)
);
--> statement-breakpoint
CREATE TABLE `import_receipts` (
	`batch_key` text PRIMARY KEY NOT NULL,
	`digest` text NOT NULL
);

--> statement-breakpoint
-- The indexed lookup includes legacy employees before the first allocation after upgrade.
CREATE VIEW employee_id_floor AS
SELECT max(10000, coalesce((SELECT last_issued FROM employee_sequence WHERE singleton = 1), 0),
  coalesce((SELECT cast(substr(id, 5) AS INTEGER) FROM employees ORDER BY id DESC LIMIT 1), 0)) AS last_issued;
--> statement-breakpoint
CREATE TRIGGER employee_created AFTER INSERT ON employees BEGIN
  SELECT CASE WHEN length(NEW.id) <> 9 THEN raise(ABORT, 'employee ID space exhausted') END;
  INSERT INTO employee_sequence VALUES (1, cast(substr(NEW.id, 5) AS INTEGER))
  ON CONFLICT(singleton) DO UPDATE SET last_issued = max(last_issued, excluded.last_issued);
  INSERT INTO salary_history (employee_id, effective_on, salary_minor, reason)
  SELECT NEW.id, date(coalesce(nullif(NEW.hired_on, ''), date('2016-01-01', (cast(substr(NEW.id, 5) AS INTEGER) % 2800) || ' days')), days),
         CASE WHEN reason = 'Merit' OR NEW.id > 'EMP-10000' THEN NEW.salary_minor
              ELSE max(100, round(NEW.salary_minor * factor / 100) * 100) END, reason
  FROM (SELECT 'Hire' AS reason, '+0 days' AS days, 0.78 AS factor
        UNION ALL SELECT 'Promotion', '+400 days', 0.89
        UNION ALL SELECT 'Merit', '+900 days', 1)
  WHERE NEW.id <= 'EMP-10000' OR reason = 'Hire';
END;
--> statement-breakpoint
CREATE TRIGGER salary_changed AFTER UPDATE OF salary_minor ON employees WHEN OLD.salary_minor <> NEW.salary_minor BEGIN
  INSERT INTO salary_history (employee_id, effective_on, salary_minor, reason)
  SELECT OLD.id, date('now'), OLD.salary_minor, 'Opening balance'
  WHERE OLD.salary_minor IS NOT (SELECT salary_minor FROM salary_history WHERE employee_id = OLD.id ORDER BY id DESC LIMIT 1);
  INSERT INTO salary_history (employee_id, effective_on, salary_minor, reason)
  VALUES (NEW.id, date('now'), NEW.salary_minor, 'Salary update');
END;
--> statement-breakpoint
CREATE TRIGGER employee_removed AFTER DELETE ON employees BEGIN
  INSERT INTO employee_sequence VALUES (1, cast(substr(OLD.id, 5) AS INTEGER))
  ON CONFLICT(singleton) DO UPDATE SET last_issued = max(last_issued, excluded.last_issued);
  DELETE FROM salary_history WHERE employee_id = OLD.id;
END;
