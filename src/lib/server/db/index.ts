import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema';

export type DB = BetterSQLite3Database<typeof schema>;

/**
 * Open (and migrate) a SQLite database. Pass ':memory:' for tests.
 * `migrationsFolder` defaults to ./drizzle relative to the working directory.
 */
export function openDatabase(file: string, migrationsFolder = path.resolve('drizzle')): DB {
	if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
	const sqlite = new Database(file);
	sqlite.pragma('journal_mode = WAL');
	sqlite.pragma('foreign_keys = ON');
	sqlite.pragma('busy_timeout = 5000');
	const db = drizzle(sqlite, { schema });
	migrate(db, { migrationsFolder });
	return db;
}

export { schema };
