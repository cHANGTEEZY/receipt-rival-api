import { isAPIError } from "better-auth/api";
import { pool } from "../src/db/index.ts";
import { auth } from "../src/modules/auth/auth.service.ts";

const DEFAULT_PASSWORD = "Password123!";

const SEED_USERS = [
  { name: "Emily Chen", email: "emily.chen@gmail.com" },
  { name: "Marcus Johnson", email: "marcus.johnson@outlook.com" },
  { name: "Sarah Williams", email: "sarah.williams@yahoo.com" },
  { name: "David Martinez", email: "david.martinez@gmail.com" },
  { name: "Jessica Thompson", email: "jessica.thompson@icloud.com" },
  { name: "Ryan O'Brien", email: "ryan.obrien@gmail.com" },
  { name: "Priya Patel", email: "priya.patel@outlook.com" },
  { name: "James Anderson", email: "james.anderson@gmail.com" },
  { name: "Olivia Garcia", email: "olivia.garcia@yahoo.com" },
  { name: "Michael Kim", email: "michael.kim@gmail.com" },
] as const;

async function seedUsers() {
  let created = 0;
  let skipped = 0;

  for (const { name, email } of SEED_USERS) {
    try {
      await auth.api.signUpEmail({
        body: {
          name,
          email,
          password: DEFAULT_PASSWORD,
        },
      });
      console.log(`Created: ${name} (${email})`);
      created++;
    } catch (error) {
      if (isAPIError(error) && error.status === "UNPROCESSABLE_ENTITY") {
        console.log(`Skipped: ${email} (already exists)`);
        skipped++;
        continue;
      }
      throw error;
    }
  }

  console.log(`\nSeeded ${created} user(s), skipped ${skipped}.`);
  console.log(`Default password: ${DEFAULT_PASSWORD}`);
}

try {
  await seedUsers();
} finally {
  await pool.end();
}
