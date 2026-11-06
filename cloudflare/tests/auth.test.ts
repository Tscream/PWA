import { createAccessPolicy } from '../src/policy';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createAuth, type Mail } from '../src/auth';
const origin = 'http://localhost:8787';
async function setup() {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../migrations/0001_auth.sql', import.meta.url),'utf8'));
  const mail: Mail[] = [];
  const auth = createAuth(db,randomBytes(32).toString('hex'),origin,async m => {mail.push(m);}, createAccessPolicy('admin@example.test', 'member@example.test'));
  const call = (path:string, body?:unknown, cookie?:string, caller=origin) => auth.handler(new Request(origin+'/api/auth'+path,{method:body?'POST':'GET',headers:{Origin:caller,'Content-Type':'application/json','cf-connecting-ip':'127.0.0.1',...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})}));
  return { db, mail, auth, call };
}
test('verified email creates account and session; magic link cannot be replayed',async () => {
  const {db,mail,call} = await setup();
  assert.equal((await call('/sign-in/magic-link',{email:'admin@example.test',callbackURL:'/'})).status,200);
  assert.equal(mail.length,1);
  const url = new URL(mail[0].url);
  assert.equal(url.pathname,'/confirm');
  const result = await call('/magic-link/verify'+url.search);
  assert.equal(result.status,302);
  const cookies = result.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
  assert.ok(cookies.includes('session_token='));
  const session = await (await call('/get-session',undefined,cookies)).json() as any;
  assert.equal(session.user.email,'admin@example.test');
  assert.equal(session.user.emailVerified,true);
  const replay = await call('/magic-link/verify'+url.search);
  assert.equal(replay.headers.get('set-cookie'),null);
  assert.match(replay.headers.get('location') ?? '',/INVALID_TOKEN/);
  await call('/sign-out',{},cookies);
  assert.equal(await (await call('/get-session',undefined,cookies)).json(),null);
  db.close();
});
test('unknown email does not send mail or create an account',async () => {
  const {db,mail,call} = await setup();
  const result = await call('/sign-in/magic-link',{email:'other@example.com'});
  assert.equal(result.status,200); assert.equal(mail.length,0);
  assert.equal((db.prepare('SELECT COUNT(*) AS count FROM user').get() as any).count,0);
  db.close();
});
test('passkey enrollment requires session and foreign origins are rejected',async () => {
  const {db,call} = await setup();
  assert.equal((await call('/passkey/generate-register-options')).status,401);
  assert.equal((await call('/sign-in/magic-link',{email:'admin@example.test'},undefined,'https://attacker.example')).status,403);
  db.close();
});
test('registration challenge requires UV and the configured RP',async () => {
  const {db,mail,call} = await setup();
  await call('/sign-in/magic-link',{email:'member@example.test'});
  const result = await call('/magic-link/verify'+new URL(mail[0].url).search);
  const cookies = result.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
  const options = await (await call('/passkey/generate-register-options',undefined,cookies)).json() as any;
  assert.equal(options.rp.id,'localhost');
  assert.equal(options.authenticatorSelection.userVerification,'required');
  assert.equal(options.authenticatorSelection.residentKey,'required');
  assert.ok(options.challenge);
  db.close();
});
test('expired email link cannot create a session',async()=>{
 const {db,mail,call}=await setup();
 await call('/sign-in/magic-link',{email:'admin@example.test'});
 db.exec("UPDATE verification SET expiresAt = '2000-01-01T00:00:00.000Z'");
 const response=await call('/magic-link/verify'+new URL(mail[0].url).search);
 assert.equal(response.headers.get('set-cookie'),null);
 assert.match(response.headers.get('location') ?? '',/error=/);
 db.close();
});
test('repeated email requests are throttled',async()=>{
 const {db,call}=await setup();
 const statuses=[];
 for(let i=0;i<5;i++) statuses.push((await call('/sign-in/magic-link',{email:'other@example.com'})).status);
 assert.ok(statuses.includes(429)); db.close();
});
