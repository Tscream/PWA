/** Account access is granted only to verified, invited identities. */
export function createAccessPolicy(adminEmail: string, memberEmails = '') {
  const normalize = (email: string) => email.trim().toLowerCase();
  const admin = normalize(adminEmail);
  if (!admin) throw new Error('ADMIN_EMAIL is required');
  const members = new Set(memberEmails.split(',').map(normalize).filter(Boolean));

  return {
    isAllowedEmail(email: string) {
      const address = normalize(email);
      return address === admin || members.has(address);
    },
    roleForVerifiedIdentity(identity: { email: string; emailVerified: boolean } | null) {
      if (!identity?.emailVerified) return null;
      const address = normalize(identity.email);
      if (address === admin) return 'admin';
      return members.has(address) ? 'member' : null;
    },
  };
}
