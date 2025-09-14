import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas and handlers
import { 
  sendEmailInputSchema, 
  getEmailsInputSchema 
} from './schema';
import { sendEmail } from './handlers/send_email';
import { getEmails } from './handlers/get_emails';
import { getEmailById } from './handlers/get_email_by_id';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check endpoint
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Send email endpoint
  sendEmail: publicProcedure
    .input(sendEmailInputSchema)
    .mutation(({ input }) => sendEmail(input)),

  // Get emails with pagination
  getEmails: publicProcedure
    .input(getEmailsInputSchema.optional())
    .query(({ input }) => getEmails(input)),

  // Get specific email by ID
  getEmailById: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(({ input }) => getEmailById(input.id)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();