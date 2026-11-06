import { createAuth } from './auth';
import { createAccessPolicy } from './policy';
export interface Env { DB: D1Database; ASSETS: Fetcher; BETTER_AUTH_SECRET: string; APP_ORIGIN: string; ADMIN_EMAIL: string; MEMBER_EMAILS?: string; RESEND_API_KEY?: string; MAIL_FROM?: string; }
const authPaths = new Set(['/get-session','/sign-in/magic-link','/magic-link/verify','/sign-out','/passkey/generate-register-options','/passkey/verify-registration','/passkey/generate-authenticate-options','/passkey/verify-authentication','/passkey/list-user-passkeys']);
function json(data: unknown, status = 200) { return Response.json(data, { status }); }
function secure(response: Response, api: boolean) {
  const result = new Response(response.body, response);
  result.headers.set('X-Content-Type-Options','nosniff');
  result.headers.set('Referrer-Policy','no-referrer');
  result.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  result.headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  result.headers.set('Strict-Transport-Security','max-age=31536000');
  if (api) result.headers.set('Cache-Control','no-store');
  return result;
}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const api = url.pathname.startsWith('/api/');
    try {
      if (!api) return secure(await env.ASSETS.fetch(request), url.pathname === '/confirm');
      if (url.origin !== env.APP_ORIGIN) return secure(json({ error:'Adres niet toegestaan.' },403),true);
      if (!env.BETTER_AUTH_SECRET || !env.DB || !env.ADMIN_EMAIL) return secure(json({error:'Accounts zijn nog niet ingericht.'},503),true);
      if (!['GET','POST'].includes(request.method)) return secure(json({error:'Methode niet toegestaan.'},405),true);
      if (request.method === 'POST') {
        if (request.headers.get('Origin') !== env.APP_ORIGIN) return secure(json({error:'Herkomst niet toegestaan.'},403),true);
        const reader = request.body?.getReader();
        const chunks: Uint8Array[] = []; let size = 0;
        if (reader) while (true) {
          const { done, value } = await reader.read(); if (done) break;
          size += value.byteLength;
          if (size > 65536) { await reader.cancel(); return secure(json({error:'Verzoek te groot.'},413),true); }
          chunks.push(value);
        }
        if (size > 0 && request.headers.get('Content-Type')?.split(';', 1)[0].trim().toLowerCase() !== 'application/json') return secure(json({error:'JSON vereist.'},415),true);
        const data = new Uint8Array(size); let offset = 0;
        for (const chunk of chunks) { data.set(chunk,offset); offset += chunk.length; }
        if (reader) request = new Request(request, { body:data });
      }
      const access = createAccessPolicy(env.ADMIN_EMAIL, env.MEMBER_EMAILS);
      const auth = createAuth(env.DB,env.BETTER_AUTH_SECRET,env.APP_ORIGIN, async ({email,url}) => {
        if (!env.RESEND_API_KEY || !env.MAIL_FROM) throw new Error('Mail is not configured');
        const sent = await fetch('https://api.resend.com/emails', {method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:env.MAIL_FROM,to:[email],subject:'Jouw toegang tot Familietafel',text:`Klik op deze link en bevestig om in te loggen. De link is 10 minuten geldig en eenmalig te gebruiken.\n\n${url}\n\nNiet aangevraagd? Negeer deze e-mail.`})});
        if (!sent.ok) throw new Error('Mail delivery failed');
      }, access);
      if (url.pathname === '/api/me') {
        const session = await auth.api.getSession({headers:request.headers});
        const role = access.roleForVerifiedIdentity(session?.user ?? null);
        if (!session || !role) return secure(json({error:'Log eerst in.'},401),true);
        return secure(json({name:session.user.name,email:session.user.email,role}),true);
      }
      if (url.pathname.startsWith('/api/auth/') && authPaths.has(url.pathname.slice('/api/auth'.length))) {
        return secure(await auth.handler(request),true);
      }
      return secure(json({error:'Niet gevonden.'},404),true);
    } catch { return secure(json({error:'Dit lukt nu niet. Probeer het later opnieuw.'},503),true); }
  },
};
