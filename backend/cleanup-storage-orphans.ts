/**
 * cleanup-storage-orphans.ts
 *
 * Finds Firebase Storage files under `resources/` that are no longer
 * referenced by any resource in the database.
 *
 * Usage (dry-run — lists orphans but does NOT delete):
 *   npx ts-node cleanup-storage-orphans.ts
 *
 * Usage (actually delete orphans):
 *   npx ts-node cleanup-storage-orphans.ts --delete
 *
 * Requires a populated backend/.env with:
 *   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 *   FIREBASE_STORAGE_BUCKET  (e.g. your-project.appspot.com)
 *   DATABASE_URL
 */

import * as admin from "firebase-admin";
import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";

dotenv.config();

// ─── Validate env ─────────────────────────────────────────────────────────────

const required = [
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
  "FIREBASE_STORAGE_BUCKET",
];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error("❌ Missing env vars:", missing.join(", "));
  process.exit(1);
}

const DRY_RUN = !process.argv.includes("--delete");

// ─── Init ─────────────────────────────────────────────────────────────────────

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
  }),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});

const bucket = admin.storage().bucket();
const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extracts the storage object path from a Firebase Storage download URL.
 * Handles both legacy (firebasestorage.googleapis.com) and new
 * (*.firebasestorage.app) domain formats.
 *
 * Example URL:
 *   https://firebasestorage.googleapis.com/v0/b/my-bucket/o/resources%2Fuid%2F123_resource.png?alt=media&token=…
 * Returns:
 *   resources/uid/123_resource.png
 */
function storagePathFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/o/");
    if (parts.length < 2) return null;
    return decodeURIComponent(parts[1]);
  } catch {
    return null;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(
    DRY_RUN
      ? "🔍 DRY RUN — no files will be deleted"
      : "🗑️  DELETE mode enabled",
  );
  console.log("");

  // 1. Collect all Storage paths referenced in the DB
  console.log("📦 Fetching image URLs from database…");
  const resources = await prisma.resource.findMany({
    select: { id: true, title: true, image: true },
    where: { image: { not: null } },
  });

  const referencedPaths = new Set<string>();
  let skippedUrls = 0;

  for (const r of resources) {
    if (!r.image) continue;
    const path = storagePathFromUrl(r.image);
    if (path) {
      referencedPaths.add(path);
    } else {
      // Could be old base64 data or an unrecognised URL — leave it alone
      skippedUrls++;
    }
  }

  console.log(`  ✅ ${resources.length} resources in DB`);
  console.log(`  ✅ ${referencedPaths.size} valid Storage paths referenced`);
  if (skippedUrls > 0) {
    console.log(
      `  ⚠️  ${skippedUrls} resource(s) with non-Storage image values (base64 or unknown) — skipped`,
    );
  }
  console.log("");

  // 2. List every file in the Storage bucket under resources/
  console.log("☁️  Listing files in Firebase Storage (resources/)…");
  const [files] = await bucket.getFiles({ prefix: "resources/" });
  console.log(`  Found ${files.length} file(s) in Storage\n`);

  // 3. Identify orphans
  const orphans = files.filter((f) => !referencedPaths.has(f.name));

  if (orphans.length === 0) {
    console.log("✅ No orphaned files found — Storage is clean!");
    return;
  }

  console.log(`⚠️  ${orphans.length} orphaned file(s) found:\n`);
  for (const f of orphans) {
    const meta = f.metadata as { size?: number; timeCreated?: string };
    const kb = meta.size
      ? `${(Number(meta.size) / 1024).toFixed(1)} KB`
      : "unknown size";
    const created = meta.timeCreated
      ? new Date(meta.timeCreated).toISOString().split("T")[0]
      : "unknown date";
    console.log(`  📄 ${f.name}`);
    console.log(`     Size: ${kb}  |  Uploaded: ${created}`);
  }
  console.log("");

  // 4. Delete or report
  if (DRY_RUN) {
    console.log("ℹ️  Re-run with --delete to permanently remove these files.");
  } else {
    console.log("🗑️  Deleting orphaned files…");
    let deleted = 0;
    let failed = 0;

    for (const f of orphans) {
      try {
        await f.delete();
        console.log(`  ✅ Deleted: ${f.name}`);
        deleted++;
      } catch (err) {
        console.error(`  ❌ Failed to delete ${f.name}:`, err);
        failed++;
      }
    }

    console.log(`\nDone. ${deleted} deleted, ${failed} failed.`);
  }
}

main()
  .catch((err) => {
    console.error("❌ Fatal error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
