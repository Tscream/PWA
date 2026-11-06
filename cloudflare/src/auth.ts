import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { magicLink } from 'better-auth/plugins';
import { passkey } from '@better-auth/passkey';
import { APIError } from 'better-auth/api';
import { createAccessPolicy } from './policy';

export type Mail = { email: string; url: string };
export function createAuth(database: BetterAuthOptions['database'], secret: string, origin: string, send: (mail: Mail) => Promise<void>, access: ReturnType<typeof createAccessPolicy>) {
  const { isAllowedEmail, roleForVerifiedIdentity } = access;
  const hostname = new URL(origin).hostname;
  if (!(origin === 'https://app.tiyani.dev' || origin === 'http://localhost:8787')) throw new Error('Unsupported origin');
  if (secret.length < 32) throw new Error('Authentication secret missing');
  return betterAuth({
    appName: 'Familietafel', baseURL: origin, basePath: '/api/auth', secret, database,
    trustedOrigins: [origin],
    emailAndPassword: { enabled: false },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24, freshAge: 60 * 10, cookieCache: { enabled: false } },
    rateLimit: { enabled: true, storage: 'database', window: 60, max: 50, customRules: { '/sign-in/magic-link': { window: 60, max: 3 } } },
    advanced: { useSecureCookies: origin.startsWith('https:'), ipAddress: { ipAddressHeaders: ['cf-connecting-ip'] } },
    databaseHooks: {
      user: { create: { before: async (user) => { if (!isAllowedEmail(user.email)) throw new APIError('FORBIDDEN', { message: 'Registratie is beperkt tot testers.' }); } } },
      session: { create: { before: async (session, ctx) => {
        const user = await ctx?.context.internalAdapter.findUserById(session.userId);
        if (!roleForVerifiedIdentity(user ?? null)) throw new APIError('FORBIDDEN', { message: 'Geen toegang.' });
      } } },
    },
    plugins: [
      magicLink({ expiresIn: 600, storeToken: 'hashed', sendMagicLink: async ({ email, url }) => {
        // Same generic success for non-allowlisted addresses; no mail and no account.
        if (!isAllowedEmail(email)) return;
        const confirmation = new URL(url); confirmation.pathname = '/confirm';
        await send({ email, url: confirmation.toString() });
      } }),
      passkey({ rpID: hostname, rpName: 'Familietafel', origin,
        authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
        registration: { requireSession: true },
      }),
    ],
  });
}
