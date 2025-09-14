import { type GetEmailsInput, type Email } from '../schema';
import { db } from '../db';
import { emailsTable } from '../db/schema';
import { desc } from 'drizzle-orm';

export async function getEmails(input: GetEmailsInput = { limit: 50, offset: 0 }): Promise<Email[]> {
  try {
    // Build query with pagination and ordering
    let query = db.select()
      .from(emailsTable)
      .orderBy(desc(emailsTable.created_at))
      .limit(input.limit)
      .offset(input.offset);

    const results = await query.execute();

    // Return results - no numeric conversions needed as all fields are text/timestamp
    return results;
  } catch (error) {
    console.error('Failed to fetch emails:', error);
    throw error;
  }
}