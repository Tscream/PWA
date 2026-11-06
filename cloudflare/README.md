# Familietafel met accounts

De GitHub Pages-demo staat in `/docs` aan de root van deze repository. Deze aparte versie draait op Cloudflare Workers, met dezelfde startpagina. Via **Schuif aan** vraag je een inloglink aan. Na bevestiging kun je een passkey koppelen. Alleen geverifieerde, uitgenodigde adressen krijgen toegang. D1 bewaart accounts, sessies en de publieke gegevens van passkeys.

## Inrichten op Cloudflare

1. Gebruik Node.js 24 en voer in deze map `npm ci` uit. Controleer met `npm run check`, `npm test` en `npm run build`.
2. Log in met `npx wrangler login`. Maak D1 aan met `npx wrangler d1 create familietafel-accounts`. Voeg de teruggegeven D1-binding toe aan `wrangler.jsonc` met de naam **DB**. Gebruik de echte database-ID in je eigen configuratie.
3. Maak de tabellen met `npx wrangler d1 migrations apply DB --remote`.
4. Voer `npm run deploy` uit om de Worker aan te maken. Verifieer een afzenderdomein bij Resend en maak een sleutel met alleen verzendrechten. Stel `BETTER_AUTH_SECRET` (bijvoorbeeld met `openssl rand -hex 32`), `ADMIN_EMAIL`, eventueel `MEMBER_EMAILS` (kommagescheiden), `RESEND_API_KEY` en `MAIL_FROM` in als Worker-secrets met `npx wrangler secret put NAAM`. Gebruik uitsluitend adressen van uitgenodigde testers. Sla de waarden buiten Git op.
5. Koppel in de Worker-instellingen **app.tiyani.dev** als Custom Domain. De app, inlogserver en passkeys gebruiken datzelfde domein.
6. Controleer op de iPhone dat je de inlogmail kunt openen, de bevestigingsknop werkt en je na uitloggen opnieuw kunt inloggen met de toegevoegde passkey. Open de bevestigingslink in dezelfde omgeving waar je de sessie wilt gebruiken.

De database begint leeg. Een account ontstaat pas na verificatie van het e-mailadres. De privésleutel van een passkey wordt door je apparaat of wachtwoordmanager beheerd. Voorbereide lokale tests versturen geen echte e-mail.

- [Cloudflare D1](https://developers.cloudflare.com/d1/get-started/)
- [Cloudflare Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
- [Better Auth passkeys](https://better-auth.com/docs/plugins/passkey)
