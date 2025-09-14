import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { emailsTable, attachmentsTable } from '../db/schema';
import { type SendEmailInput } from '../schema';
import { sendEmail } from '../handlers/send_email';
import { eq } from 'drizzle-orm';

// Basic test input without optional fields
const basicEmailInput: SendEmailInput = {
  from: {
    name: 'John Sender',
    email: 'john@sender.com'
  },
  to: {
    name: 'Jane Recipient',
    email: 'jane@recipient.com'
  },
  subject: 'Test Email Subject',
  body: 'This is a test email body.',
  message_format: 'plain',
  attachments: []
};

// Complete test input with all optional fields
const completeEmailInput: SendEmailInput = {
  from: {
    name: 'John Sender',
    email: 'john@sender.com'
  },
  to: {
    name: 'Jane Recipient',
    email: 'jane@recipient.com'
  },
  reply_to: {
    name: 'Reply Person',
    email: 'reply@example.com'
  },
  cc: {
    name: 'CC Person',
    email: 'cc@example.com'
  },
  bcc: {
    name: 'BCC Person',
    email: 'bcc@example.com'
  },
  subject: 'Complete Test Email',
  body: '<p>This is HTML email content</p>',
  message_format: 'html',
  attachments: [
    {
      filename: 'test.txt',
      content_type: 'text/plain',
      size: 1024,
      file_data: 'VGVzdCBmaWxlIGNvbnRlbnQ=' // Base64: "Test file content"
    },
    {
      filename: 'image.png',
      content_type: 'image/png',
      size: 2048,
      file_data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' // 1x1 pixel PNG
    }
  ]
};

describe('sendEmail', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should send basic email successfully', async () => {
    const result = await sendEmail(basicEmailInput);

    expect(result.success).toBe(true);
    expect(result.message).toEqual('Email sent successfully');
    expect(result.email_id).toBeDefined();
    expect(typeof result.email_id).toBe('number');
  });

  it('should save email to database with correct data', async () => {
    const result = await sendEmail(basicEmailInput);

    const emails = await db.select()
      .from(emailsTable)
      .where(eq(emailsTable.id, result.email_id!))
      .execute();

    expect(emails).toHaveLength(1);
    
    const email = emails[0];
    expect(email.from_name).toEqual('John Sender');
    expect(email.from_email).toEqual('john@sender.com');
    expect(email.to_name).toEqual('Jane Recipient');
    expect(email.to_email).toEqual('jane@recipient.com');
    expect(email.subject).toEqual('Test Email Subject');
    expect(email.body).toEqual('This is a test email body.');
    expect(email.message_format).toEqual('plain');
    expect(email.sent_at).toBeInstanceOf(Date);
    expect(email.created_at).toBeInstanceOf(Date);
    
    // Optional fields should be null
    expect(email.reply_to_name).toBeNull();
    expect(email.reply_to_email).toBeNull();
    expect(email.cc_name).toBeNull();
    expect(email.cc_email).toBeNull();
    expect(email.bcc_name).toBeNull();
    expect(email.bcc_email).toBeNull();
  });

  it('should handle complete email with all optional fields', async () => {
    const result = await sendEmail(completeEmailInput);

    expect(result.success).toBe(true);
    expect(result.email_id).toBeDefined();

    const emails = await db.select()
      .from(emailsTable)
      .where(eq(emailsTable.id, result.email_id!))
      .execute();

    const email = emails[0];
    expect(email.from_name).toEqual('John Sender');
    expect(email.to_name).toEqual('Jane Recipient');
    expect(email.reply_to_name).toEqual('Reply Person');
    expect(email.reply_to_email).toEqual('reply@example.com');
    expect(email.cc_name).toEqual('CC Person');
    expect(email.cc_email).toEqual('cc@example.com');
    expect(email.bcc_name).toEqual('BCC Person');
    expect(email.bcc_email).toEqual('bcc@example.com');
    expect(email.subject).toEqual('Complete Test Email');
    expect(email.body).toEqual('<p>This is HTML email content</p>');
    expect(email.message_format).toEqual('html');
  });

  it('should save attachments to database correctly', async () => {
    const result = await sendEmail(completeEmailInput);

    expect(result.success).toBe(true);
    expect(result.email_id).toBeDefined();

    if (result.email_id) {
      const attachments = await db.select()
        .from(attachmentsTable)
        .where(eq(attachmentsTable.email_id, result.email_id))
        .execute();

      expect(attachments).toHaveLength(2);

      // Check first attachment
      const textAttachment = attachments.find(a => a.filename === 'test.txt');
      expect(textAttachment).toBeDefined();
      expect(textAttachment!.content_type).toEqual('text/plain');
      expect(textAttachment!.size).toEqual(1024);
      expect(textAttachment!.file_data).toEqual('VGVzdCBmaWxlIGNvbnRlbnQ=');
      expect(textAttachment!.email_id).toEqual(result.email_id);
      expect(textAttachment!.created_at).toBeInstanceOf(Date);

      // Check second attachment
      const imageAttachment = attachments.find(a => a.filename === 'image.png');
      expect(imageAttachment).toBeDefined();
      expect(imageAttachment!.content_type).toEqual('image/png');
      expect(imageAttachment!.size).toEqual(2048);
      expect(imageAttachment!.email_id).toEqual(result.email_id);
    }
  });

  it('should handle email without attachments', async () => {
    const result = await sendEmail(basicEmailInput);

    expect(result.success).toBe(true);
    expect(result.email_id).toBeDefined();

    if (result.email_id) {
      const attachments = await db.select()
        .from(attachmentsTable)
        .where(eq(attachmentsTable.email_id, result.email_id))
        .execute();

      expect(attachments).toHaveLength(0);
    }
  });

  it('should handle different message formats', async () => {
    const richTextInput: SendEmailInput = {
      ...basicEmailInput,
      message_format: 'rich',
      body: '{"blocks":[{"type":"paragraph","content":"Rich text content"}]}'
    };

    const result = await sendEmail(richTextInput);

    expect(result.success).toBe(true);
    expect(result.email_id).toBeDefined();

    if (result.email_id) {
      const emails = await db.select()
        .from(emailsTable)
        .where(eq(emailsTable.id, result.email_id))
        .execute();

      expect(emails[0].message_format).toEqual('rich');
      expect(emails[0].body).toEqual('{"blocks":[{"type":"paragraph","content":"Rich text content"}]}');
    }
  });

  it('should handle partial optional email contacts', async () => {
    const partialInput: SendEmailInput = {
      ...basicEmailInput,
      reply_to: {
        name: 'Reply Only Name',
        email: 'reply@test.com'
      },
      // cc and bcc are undefined
    };

    const result = await sendEmail(partialInput);

    expect(result.success).toBe(true);
    expect(result.email_id).toBeDefined();

    if (result.email_id) {
      const emails = await db.select()
        .from(emailsTable)
        .where(eq(emailsTable.id, result.email_id))
        .execute();

      const email = emails[0];
      expect(email.reply_to_name).toEqual('Reply Only Name');
      expect(email.reply_to_email).toEqual('reply@test.com');
      expect(email.cc_name).toBeNull();
      expect(email.cc_email).toBeNull();
      expect(email.bcc_name).toBeNull();
      expect(email.bcc_email).toBeNull();
    }
  });

  it('should handle large attachment data', async () => {
    const largeAttachmentInput: SendEmailInput = {
      ...basicEmailInput,
      attachments: [{
        filename: 'large-file.pdf',
        content_type: 'application/pdf',
        size: 1048576, // 1MB
        file_data: 'A'.repeat(1000) // Simulate large base64 string
      }]
    };

    const result = await sendEmail(largeAttachmentInput);

    expect(result.success).toBe(true);
    expect(result.email_id).toBeDefined();

    if (result.email_id) {
      const attachments = await db.select()
        .from(attachmentsTable)
        .where(eq(attachmentsTable.email_id, result.email_id))
        .execute();

      expect(attachments).toHaveLength(1);
      expect(attachments[0].filename).toEqual('large-file.pdf');
      expect(attachments[0].size).toEqual(1048576);
      expect(attachments[0].file_data.length).toEqual(1000);
    }
  });
});