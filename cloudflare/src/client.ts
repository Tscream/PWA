import { createAuthClient } from 'better-auth/client';
import { magicLinkClient } from 'better-auth/client/plugins';
import { passkeyClient } from '@better-auth/passkey/client';
const auth = createAuthClient({plugins:[magicLinkClient(),passkeyClient()]});
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const dialog = document.querySelector('dialog')!;
function status(text: string) { $('status').textContent = text; }
async function task(action: () => Promise<void>) {
  const buttons = Array.from(dialog.querySelectorAll('button'));
  buttons.forEach(b => b.disabled = true); status('Even geduld…');
  try { await action(); } catch { status('Dit lukt nu niet, of je hebt geannuleerd. Probeer het opnieuw.'); }
  finally { buttons.forEach(b => b.disabled = false); }
}
async function refresh(message = '') {
  const response = await fetch('/api/me',{cache:'no-store'});
  const me = response.ok ? await response.json() as {name:string;email:string;role:string} : null;
  $('signed-in').hidden = !me; $('signed-out').hidden = !!me; $('confirm').hidden = true;
  $('home-status').textContent = me ? `Welkom aan tafel, ${me.name || me.email}.` : 'Een proefversie voor onze eerste testers.';
  if (me) {
    $('profile').textContent = `${me.email} · ${me.role === 'admin' ? 'Beheerder' : 'Familielid'}`;
    const keys = await auth.passkey.listUserPasskeys();
    $('passkey-count').textContent = keys.error ? 'Passkeys konden niet worden opgehaald.' : `${keys.data?.length ?? 0} passkey(s) gekoppeld.`;
  }
  status(response.status === 503 ? 'Accounts worden nog ingericht. Probeer het later opnieuw.' : message);
}
$('start').addEventListener('click',() => {dialog.showModal(); void task(() => refresh());});
$('email-form').addEventListener('submit',event => { event.preventDefault(); void task(async () => {
  const email = $<HTMLInputElement>('email').value.trim();
  const result = await auth.signIn.magicLink({email,callbackURL:'/',newUserCallbackURL:'/'});
  if (result.error) throw new Error('Request failed');
  status('Als dit adres toegang heeft, ontvang je een e-mail. Controleer ook je spammap.');
}); });
$('passkey-login').addEventListener('click',() => void task(async () => {
  const result = await auth.signIn.passkey(); if (result?.error) throw new Error('Login failed'); await refresh();
}));
$('add-passkey').addEventListener('click',() => void task(async () => {
  const result = await auth.passkey.addPasskey({name:'Mijn passkey'}); if(result?.error) throw new Error('Registration failed');
  await refresh(); status('Je passkey is toegevoegd.');
}));
$('logout').addEventListener('click', () => void task(async () => {
  const result = await fetch('/api/auth/sign-out', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  if (!result.ok) throw new Error('Logout failed');
  await refresh();
}));
if (location.pathname === '/confirm') {
  const token = new URLSearchParams(location.search).get('token');
  history.replaceState(null,'','/confirm');
  $('signed-out').hidden = true; $('signed-in').hidden = true; $('confirm').hidden = false; dialog.showModal();
  if (!token) {status('Deze link is ongeldig. Vraag een nieuwe inloglink aan.'); $<HTMLButtonElement>('confirm-link').disabled = true;}
  else $('confirm-link').addEventListener('click',() => {
    const target = new URL('/api/auth/magic-link/verify',location.origin);
    target.searchParams.set('token',token); target.searchParams.set('callbackURL','/'); target.searchParams.set('errorCallbackURL','/?login=failed');
    location.assign(target.toString());
  });
} else {
  const failed = new URLSearchParams(location.search).get('login') === 'failed';
  if (failed) {
    dialog.showModal();
    history.replaceState(null, '', '/');
  }
  void refresh(failed ? 'Deze inloglink is verlopen of al gebruikt. Vraag een nieuwe aan.' : '')
    .catch(() => { $('home-status').textContent = 'Geen verbinding. Probeer het later opnieuw.'; });
}
