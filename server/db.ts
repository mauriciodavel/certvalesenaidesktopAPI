import mysql, { type PoolConnection, type RowDataPacket } from 'mysql2/promise';
import { env } from './config.js';

export const db = mysql.createPool({
  host: env.DB_HOST, port: env.DB_PORT, user: env.DB_USERNAME,
  password: env.DB_PASSWORD, database: env.DB_DATABASE,
  ssl: env.DB_SSL === 'true' ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined,
  waitForConnections: true, connectionLimit: 3, maxIdle: 1, idleTimeout: 10_000, queueLimit: 20,
  enableKeepAlive: true, decimalNumbers: true
});

export async function rows<T extends RowDataPacket[]>(sql: string, params: any[] = []) {
  const [result] = await db.execute<T>(sql, params);
  return result;
}

export async function transaction<T>(fn: (conn: PoolConnection) => Promise<T>) {
  const conn = await db.getConnection();
  try { await conn.beginTransaction(); const value = await fn(conn); await conn.commit(); return value; }
  catch (error) { await conn.rollback(); throw error; }
  finally { conn.release(); }
}
