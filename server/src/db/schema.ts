import { serial, text, pgTable, timestamp, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Define message format enum
export const messageFormatEnum = pgEnum('message_format', ['plain', 'html', 'rich']);

// Emails table
export const emailsTable = pgTable('emails', {
  id: serial('id').primaryKey(),
  from_name: text('from_name').notNull(),
  from_email: text('from_email').notNull(),
  to_name: text('to_name').notNull(),
  to_email: text('to_email').notNull(),
  reply_to_name: text('reply_to_name'), // Nullable by default
  reply_to_email: text('reply_to_email'), // Nullable by default
  cc_name: text('cc_name'), // Nullable by default
  cc_email: text('cc_email'), // Nullable by default
  bcc_name: text('bcc_name'), // Nullable by default
  bcc_email: text('bcc_email'), // Nullable by default
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  message_format: messageFormatEnum('message_format').notNull().default('plain'),
  sent_at: timestamp('sent_at'), // Nullable - set when email is actually sent
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Attachments table
export const attachmentsTable = pgTable('attachments', {
  id: serial('id').primaryKey(),
  email_id: integer('email_id').notNull().references(() => emailsTable.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  content_type: text('content_type').notNull(),
  size: integer('size').notNull(),
  file_data: text('file_data').notNull(), // Base64 encoded file data
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Define relations
export const emailsRelations = relations(emailsTable, ({ many }) => ({
  attachments: many(attachmentsTable),
}));

export const attachmentsRelations = relations(attachmentsTable, ({ one }) => ({
  email: one(emailsTable, {
    fields: [attachmentsTable.email_id],
    references: [emailsTable.id],
  }),
}));

// TypeScript types for the table schemas
export type Email = typeof emailsTable.$inferSelect; // For SELECT operations
export type NewEmail = typeof emailsTable.$inferInsert; // For INSERT operations

export type Attachment = typeof attachmentsTable.$inferSelect; // For SELECT operations
export type NewAttachment = typeof attachmentsTable.$inferInsert; // For INSERT operations

// Important: Export all tables for proper query building
export const tables = { 
  emails: emailsTable, 
  attachments: attachmentsTable 
};