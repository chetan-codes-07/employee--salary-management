function parseCsv(text: string) {
  const rows: string[][] = []
  let cell = '',
    row: string[] = [],
    quoted = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"'
        i++
      } else if (char === '"') quoted = false
      else cell += char
    } else if (char === '"') quoted = true
    else if (char === ',') {
      row.push(cell)
      cell = ''
    } else if (char === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else if (char !== '\r') cell += char
  }
  if (quoted) throw new Error('The CSV contains an unclosed quote.')
  if (cell || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows.filter((item) => item.some((value) => value.trim()))
}

export const IMPORT_BATCH_SIZE = 100
export const MAX_FILE_BYTES = 8_000_000
export function csvEmployees(body: string) {
  if (new TextEncoder().encode(body).length > MAX_FILE_BYTES) throw new Error('Import file is too large.')
  const [head, ...data] = parseCsv(body)
  if (!head || !data.length) throw new Error('The CSV needs a header and at least one employee.')
  if (data.length > 10_000) throw new Error('Import up to 10,000 employees at a time.')
  const header = head.map((value) => value.trim().toLowerCase())
  const columns = ['name', 'job title', 'department', 'country', 'level', 'salary'].map((name) => header.indexOf(name))
  if (columns.includes(-1))
    throw new Error('CSV header must include name, job title, department, country, level, and salary.')
  return data.map((cells) => {
    const [name, jobTitle, department, country, level, salary] = columns.map(
      (i) => cells[i]?.trim().slice(0, 121) ?? '',
    )
    return { name, jobTitle, department, country, level, salary }
  })
}
