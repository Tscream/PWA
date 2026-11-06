import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker, {type Env} from '../src/worker';
const origin='https://app.tiyani.dev';
const env={ APP_ORIGIN:origin, ADMIN_EMAIL:'admin@example.test', DB:{} as D1Database, BETTER_AUTH_SECRET:'a'.repeat(64) } as Env;
test('worker rejects foreign-origin POST before reaching the database', async()=>{
 const response=await worker.fetch(new Request(origin+'/api/auth/sign-in/magic-link',{method:'POST',headers:{Origin:'https://other.example','Content-Type':'application/json'},body:'{}'}),env);
 assert.equal(response.status,403); assert.equal(response.headers.get('Cache-Control'),'no-store');
});
test('worker rejects alternate host and never exposes an unconfigured session',async()=>{
 assert.equal((await worker.fetch(new Request('https://other.example/api/me'),env)).status,403);
 assert.equal((await worker.fetch(new Request(origin+'/api/me'),{...env,BETTER_AUTH_SECRET:''})).status,503);
});
test('worker bounds POST bodies before parsing',async()=>{
 const response=await worker.fetch(new Request(origin+'/api/auth/sign-in/magic-link',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'x'.repeat(65537)}),env);
 assert.equal(response.status,413);
});
