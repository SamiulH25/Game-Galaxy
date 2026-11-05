import { index, integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
	id: text('id').primaryKey(),
	username: text('username').notNull(),
	/** Lower-cased username, unique: "Nova" and "nova" are the same account name. */
	usernameKey: text('username_key').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull()
});

export const sessions = sqliteTable(
	'sessions',
	{
		/** SHA-256 of the cookie token; the raw token is never stored. */
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull()
	},
	(t) => [index('sessions_user_idx').on(t.userId)]
);

export const saves = sqliteTable(
	'saves',
	{
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		gameId: text('game_id').notNull(),
		data: text('data').notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
	},
	(t) => [primaryKey({ columns: [t.userId, t.gameId] })]
);

/** One row per player per game: their best score. */
export const scores = sqliteTable(
	'scores',
	{
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		gameId: text('game_id').notNull(),
		score: real('score').notNull(),
		achievedAt: integer('achieved_at', { mode: 'timestamp_ms' }).notNull()
	},
	(t) => [primaryKey({ columns: [t.userId, t.gameId] }), index('scores_game_score_idx').on(t.gameId, t.score)]
);

export const achievements = sqliteTable(
	'achievements',
	{
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		gameId: text('game_id').notNull(),
		achievementId: text('achievement_id').notNull(),
		unlockedAt: integer('unlocked_at', { mode: 'timestamp_ms' }).notNull()
	},
	(t) => [primaryKey({ columns: [t.userId, t.gameId, t.achievementId] })]
);

export const plays = sqliteTable(
	'plays',
	{
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		gameId: text('game_id').notNull(),
		count: integer('count').notNull(),
		firstPlayedAt: integer('first_played_at', { mode: 'timestamp_ms' }).notNull(),
		lastPlayedAt: integer('last_played_at', { mode: 'timestamp_ms' }).notNull()
	},
	(t) => [primaryKey({ columns: [t.userId, t.gameId] }), index('plays_user_last_idx').on(t.userId, t.lastPlayedAt)]
);
