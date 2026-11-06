import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAccessPolicy } from '../src/policy';
const { roleForVerifiedIdentity } = createAccessPolicy('admin@example.test', 'member@example.test');
test('an email address alone never grants account rights', () => {
  assert.equal(roleForVerifiedIdentity(null), null);
  assert.equal(roleForVerifiedIdentity({ email:'admin@example.test',emailVerified:false }),null);
});
test('only the two verified POC identities get a role', () => {
  assert.equal(roleForVerifiedIdentity({email:'admin@example.test',emailVerified:true}),'admin');
  assert.equal(roleForVerifiedIdentity({email:'member@example.test',emailVerified:true}),'member');
  assert.equal(roleForVerifiedIdentity({email:'other@example.com',emailVerified:true}),null);
});
