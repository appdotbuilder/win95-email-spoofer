import { type Email } from '../schema';
import { db } from '../db';
import { emailsTable, attachmentsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export async function getEmailById(emailId: number): Promise<Email | null> {
  try {
    // Query for the email with its attachments
    const results = await db.select()
      .from(emailsTable)
      .leftJoin(attachmentsTable, eq(emailsTable.id, attachmentsTable.email_id))
      .where(eq(emailsTable.id, emailId))
      .execute();

    // If no email found
    if (results.length === 0) {
      return null;
    }

    // Extract email data from first result (all rows will have same email data)
    const emailData = results[0].emails;

    // Collect all attachments for this email
    const attachments = results
      .filter(result => result.attachments !== null)
      .map(result => ({
        id: result.attachments!.id,
        email_id: result.attachments!.email_id,
        filename: result.attachments!.filename,
        content_type: result.attachments!.content_type,
        size: result.attachments!.size,
        file_data: result.attachments!.file_data,
        created_at: result.attachments!.created_at
      }));

    // Return email with proper schema structure
    return {
      id: emailData.id,
      from_name: emailData.from_name,
      from_email: emailData.from_email,
      to_name: emailData.to_name,
      to_email: emailData.to_email,
      reply_to_name: emailData.reply_to_name,
      reply_to_email: emailData.reply_to_email,
      cc_name: emailData.cc_name,
      cc_email: emailData.cc_email,
      bcc_name: emailData.bcc_name,
      bcc_email: emailData.bcc_email,
      subject: emailData.subject,
      body: emailData.body,
      message_format: emailData.message_format,
      sent_at: emailData.sent_at,
      created_at: emailData.created_at
    };

  } catch (error) {
    console.error(`Failed to fetch email with ID ${emailId}:`, error);
    throw error;
  }
}