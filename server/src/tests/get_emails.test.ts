import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { emailsTable } from '../db/schema';
import { type GetEmailsInput } from '../schema';
import { getEmails } from '../handlers/get_emails';

// Test input with all fields
const testInput: GetEmailsInput = {
  limit: 10,
  offset: 0
};

describe('getEmails', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no emails exist', async () => {
    const result = await getEmails(testInput);
    
    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should fetch emails with pagination', async () => {
    // Create test emails with explicit timestamps to ensure proper ordering
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    const twoMinutesAgo = new Date(now.getTime() - 120000);

    // Insert emails one by one to ensure proper ordering
    await db.insert(emailsTable)
      .values([{
        from_name: 'John Doe',
        from_email: 'john@example.com',
        to_name: 'Jane Smith',
        to_email: 'jane@example.com',
        subject: 'Test Email 1',
        body: 'This is test email 1',
        message_format: 'plain' as const,
        created_at: twoMinutesAgo
      }])
      .execute();

    await db.insert(emailsTable)
      .values([{
        from_name: 'Alice Johnson',
        from_email: 'alice@example.com',
        to_name: 'Bob Wilson',
        to_email: 'bob@example.com',
        subject: 'Test Email 2',
        body: 'This is test email 2',
        message_format: 'html' as const,
        created_at: oneMinuteAgo
      }])
      .execute();

    await db.insert(emailsTable)
      .values([{
        from_name: 'Charlie Brown',
        from_email: 'charlie@example.com',
        to_name: 'Diana Prince',
        to_email: 'diana@example.com',
        subject: 'Test Email 3',
        body: 'This is test email 3',
        message_format: 'rich' as const,
        created_at: now
      }])
      .execute();

    // Test fetching all emails
    const allEmails = await getEmails({ limit: 50, offset: 0 });
    
    expect(allEmails).toHaveLength(3);
    expect(allEmails[0].subject).toEqual('Test Email 3'); // Most recent first due to DESC order
    expect(allEmails[1].subject).toEqual('Test Email 2');
    expect(allEmails[2].subject).toEqual('Test Email 1');
  });

  it('should respect limit parameter', async () => {
    // Create 5 test emails
    const emailData = Array.from({ length: 5 }, (_, i) => ({
      from_name: `User ${i + 1}`,
      from_email: `user${i + 1}@example.com`,
      to_name: `Recipient ${i + 1}`,
      to_email: `recipient${i + 1}@example.com`,
      subject: `Email ${i + 1}`,
      body: `Body for email ${i + 1}`,
      message_format: 'plain' as const
    }));

    await db.insert(emailsTable)
      .values(emailData)
      .execute();

    // Test with limit of 3
    const limitedEmails = await getEmails({ limit: 3, offset: 0 });
    
    expect(limitedEmails).toHaveLength(3);
  });

  it('should respect offset parameter', async () => {
    // Create 5 test emails with explicit timestamps for proper ordering
    const now = new Date();
    
    for (let i = 0; i < 5; i++) {
      const timestamp = new Date(now.getTime() - (i * 60000)); // Each email 1 minute older
      await db.insert(emailsTable)
        .values([{
          from_name: `User ${5 - i}`, // Reverse numbering so most recent has highest number
          from_email: `user${5 - i}@example.com`,
          to_name: `Recipient ${5 - i}`,
          to_email: `recipient${5 - i}@example.com`,
          subject: `Email ${5 - i}`,
          body: `Body for email ${5 - i}`,
          message_format: 'plain' as const,
          created_at: timestamp
        }])
        .execute();
    }

    // Test with offset
    const offsetEmails = await getEmails({ limit: 50, offset: 2 });
    
    expect(offsetEmails).toHaveLength(3);
    // Should skip the first 2 emails (Email 5, Email 4), so we get Email 3, Email 2, Email 1
    expect(offsetEmails[0].subject).toEqual('Email 3');
    expect(offsetEmails[1].subject).toEqual('Email 2');
    expect(offsetEmails[2].subject).toEqual('Email 1');
  });

  it('should order emails by created_at desc', async () => {
    // Create emails with specific timestamps
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    // Insert emails in non-chronological order to test ordering
    await db.insert(emailsTable)
      .values([
        {
          from_name: 'User 1',
          from_email: 'user1@example.com',
          to_name: 'Recipient 1',
          to_email: 'recipient1@example.com',
          subject: 'Middle Email',
          body: 'Body 1',
          message_format: 'plain',
          created_at: oneHourAgo
        }
      ])
      .execute();

    await db.insert(emailsTable)
      .values([
        {
          from_name: 'User 2',
          from_email: 'user2@example.com',
          to_name: 'Recipient 2',
          to_email: 'recipient2@example.com',
          subject: 'Latest Email',
          body: 'Body 2',
          message_format: 'plain',
          created_at: now
        }
      ])
      .execute();

    await db.insert(emailsTable)
      .values([
        {
          from_name: 'User 3',
          from_email: 'user3@example.com',
          to_name: 'Recipient 3',
          to_email: 'recipient3@example.com',
          subject: 'Oldest Email',
          body: 'Body 3',
          message_format: 'plain',
          created_at: twoHoursAgo
        }
      ])
      .execute();

    const emails = await getEmails({ limit: 50, offset: 0 });
    
    expect(emails).toHaveLength(3);
    expect(emails[0].subject).toEqual('Latest Email'); // Most recent first
    expect(emails[1].subject).toEqual('Middle Email');
    expect(emails[2].subject).toEqual('Oldest Email');
    
    // Verify timestamps are properly ordered
    expect(emails[0].created_at >= emails[1].created_at).toBe(true);
    expect(emails[1].created_at >= emails[2].created_at).toBe(true);
  });

  it('should handle all email fields correctly', async () => {
    // Create email with all possible fields including optional ones
    const fullEmailData = {
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
      subject: 'Complete Email',
      body: 'This email has all fields filled',
      message_format: 'html' as const,
      sent_at: new Date()
    };

    await db.insert(emailsTable)
      .values([fullEmailData])
      .execute();

    const emails = await getEmails({ limit: 50, offset: 0 });
    
    expect(emails).toHaveLength(1);
    
    const email = emails[0];
    expect(email.from_name).toEqual('John Doe');
    expect(email.from_email).toEqual('john@example.com');
    expect(email.to_name).toEqual('Jane Smith');
    expect(email.to_email).toEqual('jane@example.com');
    expect(email.reply_to_name).toEqual('Reply Person');
    expect(email.reply_to_email).toEqual('reply@example.com');
    expect(email.cc_name).toEqual('CC Person');
    expect(email.cc_email).toEqual('cc@example.com');
    expect(email.bcc_name).toEqual('BCC Person');
    expect(email.bcc_email).toEqual('bcc@example.com');
    expect(email.subject).toEqual('Complete Email');
    expect(email.body).toEqual('This email has all fields filled');
    expect(email.message_format).toEqual('html');
    expect(email.sent_at).toBeInstanceOf(Date);
    expect(email.created_at).toBeInstanceOf(Date);
    expect(email.id).toBeDefined();
  });

  it('should handle emails with null optional fields', async () => {
    // Create email with minimal required fields
    const minimalEmailData = {
      from_name: 'Sender',
      from_email: 'sender@example.com',
      to_name: 'Recipient',
      to_email: 'recipient@example.com',
      subject: 'Minimal Email',
      body: 'Basic email content',
      message_format: 'plain' as const
    };

    await db.insert(emailsTable)
      .values([minimalEmailData])
      .execute();

    const emails = await getEmails({ limit: 50, offset: 0 });
    
    expect(emails).toHaveLength(1);
    
    const email = emails[0];
    expect(email.from_name).toEqual('Sender');
    expect(email.from_email).toEqual('sender@example.com');
    expect(email.to_name).toEqual('Recipient');
    expect(email.to_email).toEqual('recipient@example.com');
    expect(email.subject).toEqual('Minimal Email');
    expect(email.body).toEqual('Basic email content');
    expect(email.message_format).toEqual('plain');
    expect(email.reply_to_name).toBeNull();
    expect(email.reply_to_email).toBeNull();
    expect(email.cc_name).toBeNull();
    expect(email.cc_email).toBeNull();
    expect(email.bcc_name).toBeNull();
    expect(email.bcc_email).toBeNull();
    expect(email.sent_at).toBeNull();
    expect(email.created_at).toBeInstanceOf(Date);
  });
});