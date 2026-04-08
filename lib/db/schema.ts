import { pgTable, uuid, text, boolean, timestamp, date, integer, decimal, jsonb, index, unique } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique().notNull(),
  name: text('name'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const watchlists = pgTable('watchlists', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  ticker: text('ticker').notNull(),
  addedAt: timestamp('added_at', { withTimezone: true }).defaultNow(),
  notes: text('notes'),
}, (t) => [
  unique().on(t.userId, t.ticker),
  index('idx_watchlists_user').on(t.userId),
])

export const alerts = pgTable('alerts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  ticker: text('ticker').notNull(),
  alertType: text('alert_type').notNull(), // 'price_above' | 'price_below' | 'ma_cross' | 'fibonacci' | 'rsi'
  condition: jsonb('condition').notNull(),  // { threshold, maType, fibLevel, rsiLevel }
  isActive: boolean('is_active').default(true),
  triggeredAt: timestamp('triggered_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('idx_alerts_user_active').on(t.userId, t.isActive),
])

export const signalHistory = pgTable('signal_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  ticker: text('ticker').notNull(),
  signalDate: date('signal_date').notNull(),
  action: text('action').notNull(), // 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL'
  confidence: integer('confidence').notNull(),
  priceAtSignal: decimal('price_at_signal', { precision: 12, scale: 4 }),
  indicators: jsonb('indicators'),  // { sma50, sma200, rsi, macdHistogram, nearestFibLevel }
  aiScore: integer('ai_score'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('idx_signal_history_ticker').on(t.ticker, t.signalDate),
])

export const positions = pgTable('positions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  ticker: text('ticker').notNull(),
  positionType: text('position_type').notNull(), // 'stock' | 'call' | 'put' | 'future'
  quantity: decimal('quantity', { precision: 12, scale: 4 }),
  avgCost: decimal('avg_cost', { precision: 12, scale: 4 }),
  openedAt: timestamp('opened_at', { withTimezone: true }).defaultNow(),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  notes: text('notes'),
})

export type User = typeof users.$inferSelect
export type Watchlist = typeof watchlists.$inferSelect
export type Alert = typeof alerts.$inferSelect
export type SignalHistory = typeof signalHistory.$inferSelect
export type Position = typeof positions.$inferSelect
