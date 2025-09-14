import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { emailsTable, attachmentsTable } from '../db/schema';
import { getEmailById } from '../handlers/get_email_by_id';
import { eq } from 'drizzle-orm';

describe('getEmailById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null for non-existent email', async () => {
    const result = await getEmailById(999);
    expect(result).toBeNull();
  });

  it('should return email without attachments', async () => {
    // Create test email
    const emailResult = await db.insert(emailsTable)
      .values({
        from_name: 'John Doe',
        from_email: 'john@example.com',
        to_name: 'Jane Smith',
        to_email: 'jane@example.com',
        reply_to_name: null,
        reply_to_email: null,
        cc_name: null,
        cc_email: null,
        bcc_name: null,
        bcc_email: null,
        subject: 'Test Email',
        body: 'This is a test email body',
        message_format: 'plain',
        sent_at: new Date()
      })
      .returning()
      .execute();

    const emailId = emailResult[0].id;
    const result = await getEmailById(emailId);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(emailId);
    expect(result!.from_name).toBe('John Doe');
    expect(result!.from_email).toBe('john@example.com');
    expect(result!.to_name).toBe('Jane Smith');
    expect(result!.to_email).toBe('jane@example.com');
    expect(result!.subject).toBe('Test Email');
    expect(result!.body).toBe('This is a test email body');
    expect(result!.message_format).toBe('plain');
    expect(result!.reply_to_name).toBeNull();
    expect(result!.reply_to_email).toBeNull();
    expect(result!.cc_name).toBeNull();
    expect(result!.cc_email).toBeNull();
    expect(result!.bcc_name).toBeNull();
    expect(result!.bcc_email).toBeNull();
    expect(result!.sent_at).toBeInstanceOf(Date);
    expect(result!.created_at).toBeInstanceOf(Date);
  });

  it('should return email with all optional fields populated', async () => {
    // Create test email with all optional fields
    const emailResult = await db.insert(emailsTable)
      .values({
        from_name: 'John Doe',
        from_email: 'john@example.com',
        to_name: 'Jane Smith',
        to_email: 'jane@example.com',
        reply_to_name: 'Reply Person',
        reply_to_email: 'reply@example.com',
        cc_name: 'CC Person',
        cc_email: 'cc@example.com',
        bcc_name: 'BCC Person',
        bcc_email: 'bcc@example.com',
        subject: 'Full Email Test',
        body: 'Email with all fields populated',
        message_format: 'html',
        sent_at: new Date()
      })
      .returning()
      .execute();

    const emailId = emailResult[0].id;
    const result = await getEmailById(emailId);

    expect(result).not.toBeNull();
    expect(result!.reply_to_name).toBe('Reply Person');
    expect(result!.reply_to_email).toBe('reply@example.com');
    expect(result!.cc_name).toBe('CC Person');
    expect(result!.cc_email).toBe('cc@example.com');
    expect(result!.bcc_name).toBe('BCC Person');
    expect(result!.bcc_email).toBe('bcc@example.com');
    expect(result!.message_format).toBe('html');
  });

  it('should return email with attachments', async () => {
    // Create test email
    const emailResult = await db.insert(emailsTable)
      .values({
        from_name: 'John Doe',
        from_email: 'john@example.com',
        to_name: 'Jane Smith',
        to_email: 'jane@example.com',
        reply_to_name: null,
        reply_to_email: null,
        cc_name: null,
        cc_email: null,
        bcc_name: null,
        bcc_email: null,
        subject: 'Email with Attachments',
        body: 'This email has attachments',
        message_format: 'plain',
        sent_at: new Date()
      })
      .returning()
      .execute();

    const emailId = emailResult[0].id;

    // Create test attachments
    await db.insert(attachmentsTable)
      .values([
        {
          email_id: emailId,
          filename: 'document.pdf',
          content_type: 'application/pdf',
          size: 1024,
          file_data: 'base64encodeddata1'
        },
        {
          email_id: emailId,
          filename: 'image.jpg',
          content_type: 'image/jpeg',
          size: 2048,
          file_data: 'base64encodeddata2'
        }
      ])
      .execute();

    const result = await getEmailById(emailId);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(emailId);
    expect(result!.subject).toBe('Email with Attachments');
    expect(result!.body).toBe('This email has attachments');

    // Verify attachments are handled properly by checking they exist in database
    const attachments = await db.select()
      .from(attachmentsTable)
      .where(eq(attachmentsTable.email_id, emailId))
      .execute();

    expect(attachments).toHaveLength(2);
    expect(attachments[0].filename).toBe('document.pdf');
    expect(attachments[0].content_type).toBe('application/pdf');
    expect(attachments[0].size).toBe(1024);
    expect(attachments[1].filename).toBe('image.jpg');
    expect(attachments[1].content_type).toBe('image/jpeg');
    expect(attachments[1].size).toBe(2048);
  });

  it('should handle different message formats', async () => {
    // Test rich message format
    const emailResult = await db.insert(emailsTable)
      .values({
        from_name: 'John Doe',
        from_email: 'john@example.com',
        to_name: 'Jane Smith',
        to_email: 'jane@example.com',
        reply_to_name: null,
        reply_to_email: null,
        cc_name: null,
        cc_email: null,
        bcc_name: null,
        bcc_email: null,
        subject: 'Rich Format Email',
        body: 'Rich formatted content',
        message_format: 'rich',
        sent_at: null // Test unsent email
      })
      .returning()
      .execute();

    const result = await getEmailById(emailResult[0].id);

    expect(result).not.toBeNull();
    expect(result!.message_format).toBe('rich');
    expect(result!.sent_at).toBeNull();
  });

  it('should verify data integrity after query', async () => {
    // Create test email
    const originalDate = new Date('2023-12-01T10:00:00Z');
    const sentDate = new Date('2023-12-01T11:00:00Z');

    const emailResult = await db.insert(emailsTable)
      .values({
        from_name: 'Test User',
        from_email: 'test@example.com',
        to_name: 'Recipient',
        to_email: 'recipient@example.com',
        reply_to_name: null,
        reply_to_email: null,
        cc_name: null,
        cc_email: null,
        bcc_name: null,
        bcc_email: null,
        subject: 'Data Integrity Test',
        body: 'Testing data integrity',
        message_format: 'plain',
        sent_at: sentDate,
        created_at: originalDate
      })
      .returning()
      .execute();

    const result = await getEmailById(emailResult[0].id);

    expect(result).not.toBeNull();
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.sent_at).toBeInstanceOf(Date);
    
    // Verify dates are preserved correctly
    expect(result!.sent_at!.getTime()).toBe(sentDate.getTime());
  });
});