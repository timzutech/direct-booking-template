/**
 * Creates (or updates) the host's admin login.
 *
 *   npm run create-admin -- host@example.com "a-strong-password"
 *
 * This creates a confirmed Supabase Auth user and adds the email to the
 * `admins` allowlist — only allowlisted emails can use /admin.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

const [emailArg, password] = process.argv.slice(2);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local first.");
  process.exit(1);
}
if (!emailArg || !password || password.length < 10) {
  console.error('Usage: npm run create-admin -- host@example.com "password of at least 10 characters"');
  process.exit(1);
}

const email = emailArg.trim().toLowerCase();
const db = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  const created = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error) {
    const alreadyExists = /already.*registered|already exists/i.test(created.error.message);
    if (!alreadyExists) {
      console.error(`Could not create the user: ${created.error.message}`);
      process.exit(1);
    }
    // Existing user: find them and reset the password.
    let userId: string | null = null;
    for (let page = 1; page <= 20 && !userId; page++) {
      const list = await db.auth.admin.listUsers({ page, perPage: 200 });
      if (list.error) {
        console.error(`Could not look up the existing user: ${list.error.message}`);
        process.exit(1);
      }
      userId = list.data.users.find((u) => u.email?.toLowerCase() === email)?.id ?? null;
      if (list.data.users.length < 200) break;
    }
    if (!userId) {
      console.error("The user exists but could not be found to update.");
      process.exit(1);
    }
    const updated = await db.auth.admin.updateUserById(userId, { password, email_confirm: true });
    if (updated.error) {
      console.error(`Could not update the password: ${updated.error.message}`);
      process.exit(1);
    }
    console.log("User already existed — password updated.");
  }

  const allow = await db.from("admins").upsert({ email });
  if (allow.error) {
    console.error(`Could not add ${email} to the admins allowlist: ${allow.error.message}`);
    process.exit(1);
  }
  console.log(`Admin ready: ${email} can now sign in at /admin`);
}

main();
