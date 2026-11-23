import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);

// server/vercel-api.ts
import express2 from "express";

// server/app.ts
import express from "express";

// server/auth.ts
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { Router } from "express";
var lifetime = 8 * 60 * 60 * 1e3;
var attemptWindow = 15 * 60 * 1e3;
var cookieName = "acme_hr_session";
var hash = (value) => createHash("sha256").update(value).digest();
function minimumPasswordLength(config) {
  return config.hosted || process.env.NODE_ENV === "production" ? 16 : 1;
}
function authConfigured(config) {
  const email = config.HR_EMAIL?.trim();
  const password = config.HR_PASSWORD?.trim();
  return Boolean(
    email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && password && password.length >= minimumPasswordLength(config)
  );
}
function requireAuthConfig(config) {
  if (!authConfigured(config))
    throw new Error(
      `Configure HR_EMAIL and HR_PASSWORD of at least ${minimumPasswordLength(config)} characters before starting the service.`
    );
}
function authRouter(db, config = {}) {
  const router = Router();
  const email = config.HR_EMAIL?.trim().toLowerCase();
  const password = config.HR_PASSWORD;
  const configured = authConfigured(config);
  const cookie = {
    httpOnly: true,
    sameSite: "strict",
    secure: !!config.hosted || process.env.NODE_ENV === "production",
    path: "/"
  };
  const digest = (token) => createHmac("sha256", password).update(email + ":" + token).digest("hex");
  function tokenFrom(req) {
    return req.get("cookie")?.split(";").map((s) => s.trim()).find((s) => s.startsWith(cookieName + "="))?.slice(cookieName.length + 1);
  }
  async function valid(req) {
    const token = tokenFrom(req);
    if (!configured || !token || !/^[a-f0-9]{64}$/.test(token)) return false;
    const rows = await db.all("SELECT 1 FROM hr_sessions WHERE digest=? AND expires_at>?", [digest(token), Date.now()]);
    return rows.length > 0;
  }
  router.get("/auth/session", async (req, res) => {
    res.json({ authenticated: await valid(req) });
  });
  router.post("/auth/login", async (req, res) => {
    if (!configured) {
      res.status(503).json({ error: "Sign-in is not configured. Contact the workspace administrator." });
      return;
    }
    const address = config.hosted ? req.get(config.clientAddressHeader || "cf-connecting-ip") : req.socket.remoteAddress;
    const client = hash(address || "unknown").toString("hex");
    const now = Date.now();
    await db.run("DELETE FROM login_attempts WHERE expires_at<=?", [now]);
    const attempts = await db.all(
      "INSERT INTO login_attempts(client,attempts,expires_at) VALUES (?,1,?) ON CONFLICT(client) DO UPDATE SET attempts=attempts+1 WHERE attempts<10 RETURNING attempts",
      [client, now + attemptWindow]
    );
    if (!attempts.length) {
      res.status(429).json({ error: "Too many sign-in attempts. Try again in 15 minutes." });
      return;
    }
    const enteredPassword = typeof req.body?.password === "string" ? req.body.password : "";
    const correct = timingSafeEqual(hash(enteredPassword), hash(password));
    if (!correct || typeof req.body?.email !== "string" || req.body.email.trim().toLowerCase() !== email) {
      res.status(401).json({ error: "Email or password is incorrect." });
      return;
    }
    await db.run("DELETE FROM login_attempts WHERE client=?", [client]);
    await db.run("DELETE FROM hr_sessions WHERE expires_at<=?", [now]);
    const token = randomBytes(32).toString("hex");
    await db.run("INSERT INTO hr_sessions(digest,expires_at) VALUES (?,?)", [digest(token), now + lifetime]);
    res.cookie(cookieName, token, { ...cookie, maxAge: lifetime }).json({ authenticated: true });
  });
  router.post("/auth/logout", async (req, res) => {
    const token = tokenFrom(req);
    if (configured && token) await db.run("DELETE FROM hr_sessions WHERE digest=?", [digest(token)]);
    res.clearCookie(cookieName, cookie).sendStatus(204);
  });
  router.use(async (req, res, next) => {
    if (await valid(req)) {
      next();
      return;
    }
    res.status(401).json({ error: "Sign in to access this workspace." });
  });
  return router;
}

// server/locations.ts
var COUNTRIES = [
  { country: "India", currency: "INR", base: 6e5 },
  { country: "United States", currency: "USD", base: 55e3 },
  { country: "United Kingdom", currency: "GBP", base: 35e3 },
  { country: "Germany", currency: "EUR", base: 45e3 }
];
var DEPARTMENTS = ["Engineering", "Design", "Product", "Sales", "People", "Finance"];

// server/profile.ts
var LEVELS = ["L1", "L2", "L3", "L4", "L5", "L6"];
var STATUSES = ["Active", "Inactive"];
var RATE_DATE = "15 Nov 2026";
var TITLES = {
  Engineering: ["Software Engineer", "Senior Software Engineer", "Staff Engineer", "Engineering Manager"],
  Design: ["Product Designer", "Senior Product Designer", "Design Manager"],
  Product: ["Product Manager", "Senior Product Manager", "Group Product Manager"],
  Sales: ["Account Executive", "Senior Account Executive", "Sales Manager"],
  People: ["People Partner", "Senior People Partner", "People Manager"],
  Finance: ["Financial Analyst", "Senior Financial Analyst", "Finance Manager"]
};
var LEVEL_FACTOR = {
  L1: 0.7,
  L2: 0.9,
  L3: 1.1,
  L4: 1.35,
  L5: 1.7,
  L6: 2.1
};
function deriveProfile(row) {
  const n = Number(row.id.slice(4)) || 1;
  const titles = TITLES[row.department] ?? ["Specialist"];
  const level = LEVELS[n % LEVELS.length];
  const slug = row.name.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "") || "employee";
  const hired = new Date(Date.UTC(2016, 0, 1));
  hired.setUTCDate(hired.getUTCDate() + n % 2800);
  return {
    job_title: titles[n % titles.length],
    email: `${slug}@acme.example`,
    level,
    hired_on: hired.toISOString().slice(0, 10)
  };
}
function usdMinor(minor, currency) {
  if (currency === "USD") return minor;
  if (currency === "EUR") return Math.round(minor * 108 / 100);
  if (currency === "GBP") return Math.round(minor * 127 / 100);
  if (currency === "INR") return Math.round(minor * 12 / 1e3);
  throw new Error(`No USD rate for ${currency}.`);
}
function bandFor(country, level) {
  const place = COUNTRIES.find((item) => item.country === country);
  const factor = LEVEL_FACTOR[level] ?? 1;
  const midMinor = Math.round((place?.base ?? 5e4) * factor) * 100;
  const minMinor = Math.round(midMinor * 0.75);
  const maxMinor = Math.round(midMinor * 1.25);
  return { minMinor, maxMinor, midMinor };
}

// server/seed-data.ts
var first = [
  "Aarav",
  "Ananya",
  "Alex",
  "Amelia",
  "Arjun",
  "Ava",
  "Daniel",
  "Emma",
  "Felix",
  "Hannah",
  "Isha",
  "James",
  "Kabir",
  "Leah",
  "Liam",
  "Maya",
  "Mia",
  "Noah",
  "Priya",
  "Riya",
  "Sam",
  "Sara",
  "Sofia",
  "Theo",
  "Vikram",
  "Zara"
];
var last = [
  "Bennett",
  "Brooks",
  "Carter",
  "Das",
  "Fischer",
  "Gupta",
  "Hart",
  "Hayes",
  "Hoffmann",
  "Joshi",
  "Kapoor",
  "Khan",
  "Kumar",
  "Mehta",
  "Miller",
  "Morgan",
  "Nair",
  "Patel",
  "Rao",
  "Reed",
  "Schmidt",
  "Shah",
  "Sharma",
  "Singh",
  "Taylor",
  "Weber"
];
function employees(seed2 = 20261123) {
  let state = seed2 >>> 0;
  const next = () => {
    state = Math.imul(state, 1664525) + 1013904223 >>> 0;
    return state;
  };
  return Array.from({ length: 1e4 }, (_, i) => {
    const place = COUNTRIES[i % COUNTRIES.length];
    const department = DEPARTMENTS[Math.floor(i / COUNTRIES.length) % DEPARTMENTS.length];
    const name = `${first[next() % first.length]} ${last[next() % last.length]}`;
    const salary = (place.base + next() % (place.base * 2)) * 100;
    return {
      id: `EMP-${String(i + 1).padStart(5, "0")}`,
      name,
      department,
      country: place.country,
      currency: place.currency,
      salary_minor: salary,
      revision: 0
    };
  });
}
async function seed(db, offset = 0, limit = 1e4) {
  const rows = employees().slice(offset, offset + limit);
  const insert = `INSERT INTO employees (id,name,department,country,currency,salary_minor,revision,job_title,email,level,hired_on)
    SELECT value->>'id', value->>'name', value->>'department', value->>'country', value->>'currency', value->>'salary_minor', 0,
           value->>'job_title', value->>'email', value->>'level', value->>'hired_on' FROM json_each(?) WHERE true
    ON CONFLICT(id) DO NOTHING`;
  for (let i = 0; i < rows.length; i += 80) {
    const batch = rows.slice(i, i + 80).map((row) => ({ ...row, ...deriveProfile(row) }));
    await db.run(insert, [JSON.stringify(batch)]);
  }
  return rows.length;
}

// server/money.ts
var MAX_SALARY_MINOR = 1e10;
var InputError = class extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
};
function parseSalary(value) {
  if (typeof value !== "string" || !/^(0|[1-9]\d{0,8})(\.\d{1,2})?$/.test(value))
    throw new InputError("Enter a plain amount with up to two decimal places, without commas or currency symbols.");
  const [whole, fraction = ""] = value.split(".");
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(minor) || minor < 1 || minor > MAX_SALARY_MINOR)
    throw new InputError("Annual salary must be between 0.01 and 100,000,000.00.");
  return minor;
}

// server/employees.ts
var LEVEL_SET = new Set(LEVELS);
var STATUS_SET = new Set(STATUSES);
function filtersFrom(query) {
  const read = (key) => {
    const v = query[key];
    if (v === void 0) return "";
    if (typeof v !== "string") throw new InputError(`Invalid ${key} filter.`);
    return v.trim();
  };
  const q = read("q"), country = read("country"), department = read("department"), level = read("level"), status = read("status");
  if (q.length > 100) throw new InputError("Search must be 100 characters or fewer.");
  if (country && !COUNTRIES.some((c) => c.country === country)) throw new InputError("Choose a valid country.");
  if (department && !DEPARTMENTS.includes(department))
    throw new InputError("Choose a valid department.");
  if (level && !LEVEL_SET.has(level)) throw new InputError("Choose a valid level.");
  if (status && !STATUS_SET.has(status)) throw new InputError("Choose a valid status.");
  return { q, country, department, level, status };
}
function where(filters) {
  const clauses = [], values = [];
  if (filters.q) {
    clauses.push(
      "(instr(lower(name), lower(?)) > 0 OR instr(lower(id), lower(?)) > 0 OR instr(lower(email), lower(?)) > 0)"
    );
    values.push(filters.q, filters.q, filters.q);
  }
  if (filters.country) {
    clauses.push("country = ?");
    values.push(filters.country);
  }
  if (filters.department) {
    clauses.push("department = ?");
    values.push(filters.department);
  }
  if (filters.level) {
    clauses.push("level = ?");
    values.push(filters.level);
  }
  if (filters.status) {
    clauses.push("status = ?");
    values.push(filters.status);
  }
  return { sql: clauses.length ? " WHERE " + clauses.join(" AND ") : "", values };
}
function present(row) {
  const derived = deriveProfile(row);
  const profile = {
    job_title: row.job_title || derived.job_title,
    email: row.email || derived.email,
    level: LEVEL_SET.has(row.level) ? row.level : derived.level,
    hired_on: row.hired_on || derived.hired_on
  };
  return {
    ...row,
    ...profile,
    status: STATUS_SET.has(row.status) ? row.status : "Active",
    usd_minor: usdMinor(row.salary_minor, row.currency)
  };
}
async function listEmployees(db, filters, pageInput = void 0) {
  const pageValue = pageInput === void 0 ? "1" : pageInput;
  if (typeof pageValue !== "string" || !/^[1-9]\d{0,3}$/.test(pageValue))
    throw new InputError("Page must be a positive whole number.");
  const page = Number(pageValue), pageSize = 25;
  if (page > 2e3) throw new InputError("Page is too far into the directory.");
  const w = where(filters);
  const [count] = await db.all("SELECT COUNT(*) AS total FROM employees" + w.sql, w.values);
  const items = await db.all("SELECT * FROM employees" + w.sql + " ORDER BY id LIMIT ? OFFSET ?", [
    ...w.values,
    pageSize,
    (page - 1) * pageSize
  ]);
  return { items: items.map(present), total: count.total, page, pageSize, pages: Math.ceil(count.total / pageSize) };
}
async function summarize(db, filters) {
  const w = where(filters);
  const rows = await db.all(
    "SELECT currency, COUNT(*) AS count, SUM(salary_minor) AS totalMinor FROM employees" + w.sql + " GROUP BY currency ORDER BY currency",
    w.values
  );
  return rows.map((r) => ({ ...r, averageMinor: Math.round(r.totalMinor / r.count) }));
}
async function chartBreakdown(db, filters) {
  const w = where(filters);
  const departments = await db.all(
    "SELECT department AS label, COUNT(*) AS count FROM employees" + w.sql + " GROUP BY department ORDER BY department",
    w.values
  );
  const levels = await db.all(
    "SELECT level AS label, COUNT(*) AS count FROM employees" + w.sql + " GROUP BY level ORDER BY level",
    w.values
  );
  const rows = await db.all(
    "SELECT department AS label, currency, COUNT(*) AS count, SUM(salary_minor) AS totalMinor FROM employees" + w.sql + " GROUP BY department, currency ORDER BY currency, department",
    w.values
  );
  return {
    departments,
    levels,
    averages: rows.map((row) => ({
      label: row.label,
      currency: row.currency,
      count: row.count,
      averageMinor: Math.round(row.totalMinor / row.count)
    }))
  };
}
function withChanges(events) {
  return events.map((event, index) => {
    if (!index) return { ...event, change: null };
    const previous = events[index - 1].salary_minor;
    return { ...event, change: Math.round((event.salary_minor - previous) / previous * 1e3) / 10 };
  });
}
async function getEmployee(db, id) {
  if (!/^EMP-\d{5}$/.test(id)) throw new InputError("Employee not found.", 404);
  const [row] = await db.all(
    `
    SELECT e.*, (SELECT json_group_array(json_object('effective_on', effective_on, 'salary_minor', salary_minor, 'reason', reason))
      FROM (SELECT effective_on, salary_minor, reason FROM salary_history WHERE employee_id = e.id ORDER BY id)) AS events
    FROM employees e WHERE e.id = ?`,
    [id]
  );
  if (!row) throw new InputError("Employee not found.", 404);
  const { events, ...employee } = row;
  const history = JSON.parse(events);
  if (history.at(-1)?.salary_minor !== row.salary_minor)
    history.push({
      effective_on: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
      salary_minor: row.salary_minor,
      reason: "Current balance"
    });
  const view = present(employee);
  const band = bandFor(view.country, view.level);
  const span = band.maxMinor - band.minMinor;
  const ratio = Math.round(view.salary_minor / band.midMinor * 100) / 100;
  const position = span ? (view.salary_minor - band.minMinor) / span : 0;
  return { ...view, band: { ...band, ratio, position }, history: withChanges(history), rateDate: RATE_DATE };
}
async function updateSalary(db, id, body) {
  if (!/^EMP-\d{5}$/.test(id)) throw new InputError("Employee not found.", 404);
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new InputError("Provide salary and revision.");
  const { salary, revision } = body;
  const minor = parseSalary(salary);
  if (typeof revision !== "number" || !Number.isSafeInteger(revision) || revision < 0)
    throw new InputError("Provide a valid employee revision.");
  const [current] = await db.all("SELECT * FROM employees WHERE id = ?", [id]);
  if (!current) throw new InputError("Employee not found.", 404);
  const [saved] = await db.all(
    "UPDATE employees SET salary_minor = ?, revision = revision + 1 WHERE id = ? AND revision = ? RETURNING *",
    [minor, id, revision]
  );
  if (!saved)
    throw new InputError("This salary changed since you opened it. Reload the employee before saving again.", 409);
  return present(saved);
}
function readText(value, label, max) {
  if (typeof value !== "string") throw new InputError(`Enter a ${label}.`);
  const text = value.trim();
  if (!text || text.length > max) throw new InputError(`${label} must be 1 to ${max} characters.`);
  return text;
}
async function updateEmployee(db, id, body) {
  if (!/^EMP-\d{5}$/.test(id)) throw new InputError("Employee not found.", 404);
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new InputError("Provide employee details.");
  const record = body;
  const [current] = await db.all("SELECT * FROM employees WHERE id = ?", [id]);
  if (!current) throw new InputError("Employee not found.", 404);
  if (typeof record.revision !== "number" || !Number.isSafeInteger(record.revision) || record.revision < 0)
    throw new InputError("Provide a valid employee revision.");
  const jobTitle = record.jobTitle === void 0 ? current.job_title || deriveProfile(current).job_title : readText(record.jobTitle, "job title", 80);
  const email = record.email === void 0 ? current.email || deriveProfile(current).email : readText(record.email, "email", 120);
  if (record.email !== void 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new InputError("Enter a valid email address.");
  const level = record.level === void 0 ? current.level || deriveProfile(current).level : readText(record.level, "level", 8);
  if (!LEVEL_SET.has(level)) throw new InputError("Choose a valid level.");
  const status = record.status === void 0 ? current.status || "Active" : readText(record.status, "status", 20);
  if (!STATUS_SET.has(status)) throw new InputError("Choose a valid status.");
  const [saved] = await db.all(
    "UPDATE employees SET job_title = ?, email = ?, level = ?, status = ?, revision = revision + 1 WHERE id = ? AND revision = ? RETURNING *",
    [jobTitle, email, level, status, id, record.revision]
  );
  if (!saved) throw new InputError("Employee details changed. Reload the employee before saving again.", 409);
  return present(saved);
}
function currencyFor(country) {
  const place = COUNTRIES.find((item) => item.country === country);
  if (!place) throw new InputError("Choose a valid country.");
  return place.currency;
}
function employeeValues(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new InputError("Provide the new employee.");
  const record = body;
  const name = readText(record.name, "name", 80);
  const jobTitle = readText(record.jobTitle, "job title", 80);
  const department = readText(record.department, "department", 40);
  if (!DEPARTMENTS.includes(department)) throw new InputError("Choose a valid department.");
  const country = readText(record.country, "country", 40);
  const currency = currencyFor(country);
  const level = readText(record.level, "level", 8);
  if (!LEVEL_SET.has(level)) throw new InputError("Choose a valid level.");
  const minor = parseSalary(record.salary);
  const email = `${name.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "") || "employee"}@acme.example`;
  return { name, department, country, currency, minor, jobTitle, email, level };
}
async function createEmployee(db, body) {
  const row = employeeValues(body);
  const [saved] = await db.all(
    `INSERT INTO employees (id,name,department,country,currency,salary_minor,job_title,email,level,hired_on)
     SELECT printf('EMP-%05d', last_issued + 1), ?, ?, ?, ?, ?, ?, ?, ?, date('now')
     FROM employee_id_floor WHERE last_issued < 99999 RETURNING *`,
    [row.name, row.department, row.country, row.currency, row.minor, row.jobTitle, row.email, row.level]
  );
  if (!saved) throw new InputError("The employee directory is full.", 409);
  return present(saved);
}
async function deleteEmployee(db, id) {
  if (!/^EMP-\d{5}$/.test(id)) throw new InputError("Employee not found.", 404);
  const [current] = await db.all(
    "DELETE FROM employees WHERE id = ? RETURNING id, name",
    [id]
  );
  if (!current) throw new InputError("Employee not found.", 404);
  return current;
}
function csvCell(value) {
  const text = String(value);
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}
async function exportEmployees(db, filters) {
  const w = where(filters);
  const rows = await db.all("SELECT * FROM employees" + w.sql + " ORDER BY id", w.values);
  const header = [
    "code",
    "name",
    "job title",
    "department",
    "country",
    "salary",
    "currency",
    "usd",
    "level",
    "status",
    "email"
  ];
  const lines = rows.map((row) => {
    const view = present(row);
    return [
      view.id,
      view.name,
      view.job_title,
      view.department,
      view.country,
      (view.salary_minor / 100).toFixed(2),
      view.currency,
      (view.usd_minor / 100).toFixed(2),
      view.level,
      view.status,
      view.email
    ].map(csvCell).join(",");
  });
  return [header.join(","), ...lines].join("\n");
}
async function backfillProfiles(db) {
  const rows = await db.all(
    "SELECT id, name, department FROM employees WHERE job_title = ''"
  );
  if (!rows.length) return 0;
  for (let offset = 0; offset < rows.length; offset += 500) {
    const batch = rows.slice(offset, offset + 500).map((row) => ({ id: row.id, ...deriveProfile(row) }));
    await db.run(
      `UPDATE employees SET job_title = value->>'job_title', email = value->>'email',
      level = value->>'level', hired_on = value->>'hired_on' FROM json_each(?)
      WHERE employees.id = value->>'id' AND job_title = ''`,
      [JSON.stringify(batch)]
    );
  }
  return rows.length;
}

// server/imports.ts
import { createHash as createHash2 } from "node:crypto";

// shared/import-csv.ts
function parseCsv(text) {
  const rows = [];
  let cell = "", row = [], quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") cell += char;
  }
  if (quoted) throw new Error("The CSV contains an unclosed quote.");
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((item) => item.some((value) => value.trim()));
}
var IMPORT_BATCH_SIZE = 100;
var MAX_FILE_BYTES = 8e6;
function csvEmployees(body) {
  if (new TextEncoder().encode(body).length > MAX_FILE_BYTES) throw new Error("Import file is too large.");
  const [head, ...data] = parseCsv(body);
  if (!head || !data.length) throw new Error("The CSV needs a header and at least one employee.");
  if (data.length > 1e4) throw new Error("Import up to 10,000 employees at a time.");
  const header = head.map((value) => value.trim().toLowerCase());
  const columns = ["name", "job title", "department", "country", "level", "salary"].map((name) => header.indexOf(name));
  if (columns.includes(-1))
    throw new Error("CSV header must include name, job title, department, country, level, and salary.");
  return data.map((cells) => {
    const [name, jobTitle, department, country, level, salary] = columns.map(
      (i) => cells[i]?.trim().slice(0, 121) ?? ""
    );
    return { name, jobTitle, department, country, level, salary };
  });
}

// server/imports.ts
var hash2 = (text) => createHash2("sha256").update(text).digest("hex");
var insertBatch = `
  WITH start AS MATERIALIZED (SELECT last_issued FROM employee_id_floor)
  INSERT INTO employees (id, name, department, country, currency, salary_minor, job_title, email, level, hired_on)
  SELECT printf('EMP-%05d', start.last_issued + item.key + 1), value->>'name', value->>'department',
         value->>'country', value->>'currency', value->>'minor', value->>'jobTitle', value->>'email',
         value->>'level', date('now')
  FROM start, json_each(?) AS item
  WHERE NOT EXISTS (SELECT 1 FROM import_receipts WHERE batch_key = ?)`;
async function importBatch(db, body) {
  if (!body || typeof body !== "object") throw new InputError("Provide an import batch.");
  const { fileId, offset, rows } = body;
  if (typeof fileId !== "string" || !/^[a-f0-9]{64}$/.test(fileId) || typeof offset !== "number" || !Number.isInteger(offset) || offset < 0 || offset % IMPORT_BATCH_SIZE !== 0 || !Array.isArray(rows) || !rows.length || rows.length > IMPORT_BATCH_SIZE || offset + rows.length > 1e4)
    throw new InputError("Invalid import batch or row range.");
  const valid = [];
  const errors = [];
  for (const [index, employee] of rows.entries()) {
    try {
      valid.push(employeeValues(employee));
    } catch (error) {
      if (!(error instanceof InputError)) throw error;
      errors.push({ line: offset + index + 2, message: error.message });
    }
  }
  const key = fileId + ":" + offset;
  const digest = hash2(JSON.stringify(rows));
  try {
    await db.transaction([
      { query: insertBatch, values: [JSON.stringify(valid), key] },
      {
        query: "INSERT INTO import_receipts(batch_key, digest) VALUES (?, ?) ON CONFLICT(batch_key) DO NOTHING",
        values: [key, digest]
      }
    ]);
  } catch (error) {
    if (error instanceof Error && error.message.includes("employee ID space exhausted"))
      throw new InputError("The employee directory is full.", 409);
    throw error;
  }
  const [receipt] = await db.all("SELECT digest FROM import_receipts WHERE batch_key = ?", [key]);
  if (receipt.digest !== digest) throw new InputError("This import batch was already used with different data.", 409);
  return { created: valid.length, errors };
}
async function importCsvRequest(db, text) {
  let rows;
  try {
    rows = csvEmployees(text);
  } catch (error) {
    throw new InputError(error instanceof Error ? error.message : "Invalid CSV file.");
  }
  if (rows.length > IMPORT_BATCH_SIZE) throw new InputError("Use the directory upload for files over 100 employees.");
  return importBatch(db, { fileId: hash2(text), offset: 0, rows });
}

// server/app.ts
function createApp(db, options = {}) {
  const app2 = express();
  app2.disable("x-powered-by");
  app2.use((_req, res, next) => {
    res.set({ "X-Content-Type-Options": "nosniff", "Referrer-Policy": "strict-origin-when-cross-origin" });
    next();
  });
  app2.use("/api/employees/import", express.json({ limit: "512kb" }));
  app2.use(express.json({ limit: "16kb" }));
  app2.use("/api", (_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  app2.get("/api/health", async (_req, res) => {
    try {
      await db.all("SELECT 1 AS connected");
      res.json({ status: "ok", database: "connected", storage: "persistent SQLite" });
    } catch {
      res.status(503).json({ status: "unavailable", database: "unreachable" });
    }
  });
  app2.post("/api/admin/seed", async (req, res) => {
    if (!options.seedToken || req.get("authorization") !== `Bearer ${options.seedToken}`)
      throw new InputError("Not authorized.", 401);
    const offset = req.body?.offset;
    if (!Number.isInteger(offset) || offset < 0 || offset >= 1e4 || offset % 80 !== 0)
      throw new InputError("Invalid seed offset.");
    const processed = await seed(db, offset, 80);
    res.json({ processed, offset });
  });
  app2.use("/api", authRouter(db, options.auth));
  if (options.prepareData)
    app2.use("/api", async (_req, _res, next) => {
      await options.prepareData();
      next();
    });
  app2.get(
    "/api/options",
    (_req, res) => res.json({
      countries: COUNTRIES.map((c) => c.country),
      departments: DEPARTMENTS,
      levels: [...LEVELS],
      statuses: [...STATUSES]
    })
  );
  app2.get("/api/employees/export", async (req, res) => {
    const csv = await exportEmployees(db, filtersFrom(req.query));
    res.set({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="acme-employees.csv"'
    }).send(csv);
  });
  app2.post("/api/employees/import", express.text({ type: "text/csv", limit: "8mb" }), async (req, res) => {
    res.json(typeof req.body === "string" ? await importCsvRequest(db, req.body) : await importBatch(db, req.body));
  });
  app2.post("/api/employees", async (req, res) => {
    res.status(201).json(await createEmployee(db, req.body));
  });
  app2.get(
    "/api/employees",
    async (req, res) => res.json(await listEmployees(db, filtersFrom(req.query), req.query.page))
  );
  app2.get("/api/summary", async (req, res) => res.json(await summarize(db, filtersFrom(req.query))));
  app2.get("/api/charts", async (req, res) => res.json(await chartBreakdown(db, filtersFrom(req.query))));
  app2.get("/api/employees/:id", async (req, res) => {
    res.json(await getEmployee(db, req.params.id));
  });
  app2.patch("/api/employees/:id/salary", async (req, res) => {
    res.json(await updateSalary(db, req.params.id, req.body));
  });
  app2.patch("/api/employees/:id", async (req, res) => {
    res.json(await updateEmployee(db, req.params.id, req.body));
  });
  app2.delete("/api/employees/:id", async (req, res) => {
    res.json(await deleteEmployee(db, req.params.id));
  });
  app2.use("/api", (_req, res) => res.status(404).json({ error: "Endpoint not found." }));
  app2.use((error, _req, res, _next) => {
    if (error instanceof InputError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    const status = error?.status;
    if (status === 400 || status === 413) {
      res.status(status).json({ error: status === 413 ? "Request is too large." : "Request must contain valid JSON." });
      return;
    }
    console.error("Request failed", error instanceof Error ? error.message : "Unknown error");
    res.status(500).json({ error: "Unable to complete the request. Please try again." });
  });
  return app2;
}

// server/turso.ts
import { createClient } from "@libsql/client";
function tursoSql(client) {
  return {
    async all(sql, args = []) {
      const result = await client.execute({ sql, args });
      return result.rows;
    },
    async run(sql, args = []) {
      return (await client.execute({ sql, args })).rowsAffected;
    },
    async batch(sql, rows) {
      await client.batch(
        rows.map((args) => ({ sql, args })),
        "write"
      );
    },
    async transaction(statements) {
      await client.batch(
        statements.map(({ query: sql, values: args }) => ({ sql, args })),
        "write"
      );
    }
  };
}
function openTurso() {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
  if (!url || !/^(libsql|https):\/\//.test(url) || !authToken)
    throw new Error("Configure TURSO_DATABASE_URL and TURSO_AUTH_TOKEN for the hosted database.");
  const client = createClient({ url, authToken });
  return { sql: tursoSql(client), client };
}

// server/vercel-api.ts
function createHostedApp() {
  const auth = {
    HR_EMAIL: process.env.HR_EMAIL,
    HR_PASSWORD: process.env.HR_PASSWORD,
    hosted: true,
    clientAddressHeader: "x-vercel-forwarded-for"
  };
  requireAuthConfig(auth);
  const { sql } = openTurso();
  let profilesReady = false;
  return createApp(sql, {
    auth,
    seedToken: process.env.SEED_TOKEN,
    async prepareData() {
      if (!profilesReady) {
        await backfillProfiles(sql);
        profilesReady = true;
      }
    }
  });
}
function createBootFailureApp(error) {
  const message = error instanceof Error ? error.message : "Workspace unavailable";
  const app2 = express2();
  app2.disable("x-powered-by");
  app2.use((_req, res) => {
    res.status(503).json({ status: "unavailable", error: message });
  });
  return app2;
}
var app;
try {
  app = createHostedApp();
} catch (error) {
  app = createBootFailureApp(error);
}
var vercel_api_default = app;
export {
  vercel_api_default as default
};
