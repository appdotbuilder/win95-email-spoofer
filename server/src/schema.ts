import { z } from 'zod';

// Email contact schema for from, to, reply-to, cc, bcc fields
export const emailContactSchema = z.object({
  name: z.string(),
  email: z.string().email()
});

export type EmailContact = z.infer<typeof emailContactSchema>;

// Optional email contact schema for reply-to, cc, bcc fields
export const optionalEmailContactSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional()
}).refine(
  (data) => {
    // If either name or email is provided, both should be provided
    if (data.name || data.email) {
      return data.name && data.email;
    }
    return true;
  },
  {
    message: "Both name and email must be provided if either is specified"
  }
);

export type OptionalEmailContact = z.infer<typeof optionalEmailContactSchema>;

// Message format enum
export const messageFormatSchema = z.enum(['plain', 'html', 'rich']);

export type MessageFormat = z.infer<typeof messageFormatSchema>;

// Attachment schema for file handling
export const attachmentSchema = z.object({
  id: z.number(),
  email_id: z.number(),
  filename: z.string(),
  content_type: z.string(),
  size: z.number().int(),
  file_data: z.string(), // Base64 encoded file data
  created_at: z.coerce.date()
});

export type Attachment = z.infer<typeof attachmentSchema>;

// Email schema for database storage
export const emailSchema = z.object({
  id: z.number(),
  from_name: z.string(),
  from_email: z.string().email(),
  to_name: z.string(),
  to_email: z.string().email(),
  reply_to_name: z.string().nullable(),
  reply_to_email: z.string().email().nullable(),
  cc_name: z.string().nullable(),
  cc_email: z.string().email().nullable(),
  bcc_name: z.string().nullable(),
  bcc_email: z.string().email().nullable(),
  subject: z.string(),
  body: z.string(),
  message_format: messageFormatSchema,
  sent_at: z.coerce.date().nullable(),
  created_at: z.coerce.date()
});

export type Email = z.infer<typeof emailSchema>;

// Input schema for sending emails
export const sendEmailInputSchema = z.object({
  from: emailContactSchema,
  to: emailContactSchema,
  reply_to: optionalEmailContactSchema.optional(),
  cc: optionalEmailContactSchema.optional(),
  bcc: optionalEmailContactSchema.optional(),
  subject: z.string(),
  body: z.string(),
  message_format: messageFormatSchema.default('plain'),
  attachments: z.array(z.object({
    filename: z.string(),
    content_type: z.string(),
    size: z.number().int(),
    file_data: z.string() // Base64 encoded file data
  })).optional().default([])
});

export type SendEmailInput = z.infer<typeof sendEmailInputSchema>;

// Schema for getting email history
export const getEmailsInputSchema = z.object({
  limit: z.number().int().positive().optional().default(50),
  offset: z.number().int().nonnegative().optional().default(0)
});

export type GetEmailsInput = z.infer<typeof getEmailsInputSchema>;

// Response schema for sent email
export const sendEmailResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  email_id: z.number().optional()
});

export type SendEmailResponse = z.infer<typeof sendEmailResponseSchema>;