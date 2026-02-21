export function isSuperAdmin(email: string | undefined): boolean {
  if (!email) return false;
  const allowedEmails = (process.env.SUPER_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase());
  return allowedEmails.includes(email.toLowerCase());
}
