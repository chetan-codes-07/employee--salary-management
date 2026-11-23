export type Value = string | number | null
export type Statement = { query: string; values: Value[] }
export interface Sql {
  transaction(statements: Statement[]): Promise<void>
  all<T>(sql: string, values?: Value[]): Promise<T[]>
  run(sql: string, values?: Value[]): Promise<number>
  batch(sql: string, values: Value[][]): Promise<void>
}
