import pg from 'pg'
import { config } from '../config.js'

/**
 * Parse PostgreSQL `bigint` values as JavaScript numbers.
 *
 * @param val - The raw PostgreSQL value for type `int8`.
 * @returns The parsed integer value.
 */
pg.types.setTypeParser(20, (val: string) => parseInt(val, 10))

/**
 * Shared PostgreSQL connection pool.
 *
 * @type {pg.Pool}
 */
const pool = new pg.Pool({
  connectionString: config.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
})

pool.on('error', (err: Error) => {
  console.error('Unexpected pg pool error', err)
})

export { pool }

/**
 * Run a SQL query using the shared PostgreSQL connection pool.
 *
 * @template T
 * @param {string} sql - The SQL query text.
 * @param {unknown[]} [params] - Optional parameter values for the query.
 * @returns {Promise<pg.QueryResult<T>>} The query result.
 */
export function query<T extends pg.QueryResultRow>(
  sql: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(sql, params)
}
