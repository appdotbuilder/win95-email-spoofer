import { type SendEmailInput, type SendEmailResponse } from '../schema';
import { db } from '../db';
import { emailsTable, attachmentsTable } from '../db/schema';

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResponse> {
  try {
    // Insert email into database
    const emailInsertData = {
      from_name: input.from.name,
      from_email: input.from.email,
      to_name: input.to.name,
      to_email: input.to.email,
      reply_to_name: input.reply_to?.name || null,
      reply_to_email: input.reply_to?.email || null,
      cc_name: input.cc?.name || null,
      cc_email: input.cc?.email || null,
      bcc_name: input.bcc?.name || null,
      bcc_email: input.bcc?.email || null,
      subject: input.subject,
      body: input.body,
      message_format: input.message_format,
      sent_at: new Date(), // In real implementation, set after successful email service call
    };

    const emailResult = await db.insert(emailsTable)
      .values(emailInsertData)
      .returning()
      .execute();

    const email = emailResult[0];

    // Handle attachments if any
    if (input.attachments && input.attachments.length > 0) {
      const attachmentInserts = input.attachments.map(attachment => ({
        email_id: email.id,
        filename: attachment.filename,
        content_type: attachment.content_type,
        size: attachment.size,
        file_data: attachment.file_data,
      }));

      await db.insert(attachmentsTable)
        .values(attachmentInserts)
        .execute();
    }

    // In a real implementation, here you would:
    // 1. Call email service API (SMTP, SendGrid, etc.)
    // 2. Update sent_at timestamp only after successful send
    // 3. Handle email service failures appropriately

    return {
      success: true,
      message: 'Email sent successfully',
      email_id: email.id
    };
  } catch (error) {
    console.error('Failed to send email:', error);
    return {
      success: false,
      message: 'Failed to send email'
    };
  }
}