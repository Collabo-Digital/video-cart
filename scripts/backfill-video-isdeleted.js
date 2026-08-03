/* eslint-env node */
/**
 * One-time backfill: set `isDeleted: false` on Video documents that predate the
 * field being added to the schema.
 *
 * Why this is needed: Prisma's `@default(false)` only applies when a document is
 * CREATED. It does not backfill existing documents, and MongoDB does not match
 * `{ isDeleted: false }` against a document where the field is simply absent.
 * So after adding `Video.isDeleted`, every pre-existing video became invisible
 * to the app's queries (the Videos table renders empty) even though the data is
 * intact.
 *
 * Safe to re-run: it only touches documents where the field is missing.
 * Run this once per environment (dev, staging, production) after deploying the
 * schema change.
 *
 * DRY-RUN by default — prints what it would change without writing.
 *
 * Usage:
 *   node scripts/backfill-video-isdeleted.js           # dry run
 *   node scripts/backfill-video-isdeleted.js --apply   # write the change
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

console.log(`${APPLY ? "APPLY" : "DRY RUN"} — backfilling Video.isDeleted\n`);

// ---- Report current state ----
const stats = await prisma.$runCommandRaw({
  aggregate: "Video",
  pipeline: [
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        missing: {
          $sum: { $cond: [{ $eq: [{ $type: "$isDeleted" }, "missing"] }, 1, 0] },
        },
        isFalse: { $sum: { $cond: [{ $eq: ["$isDeleted", false] }, 1, 0] } },
        isTrue: { $sum: { $cond: [{ $eq: ["$isDeleted", true] }, 1, 0] } },
      },
    },
  ],
  cursor: {},
});

const s = stats.cursor.firstBatch[0] ?? { total: 0, missing: 0, isFalse: 0, isTrue: 0 };
console.log(`Video documents:      ${s.total}`);
console.log(`  isDeleted missing:  ${s.missing}  <-- invisible to the app`);
console.log(`  isDeleted = false:  ${s.isFalse}`);
console.log(`  isDeleted = true:   ${s.isTrue}   (intentionally retired)`);

if (s.missing === 0) {
  console.log("\nNothing to backfill — every document already has the field.");
  await prisma.$disconnect();
  process.exit(0);
}

if (!APPLY) {
  console.log(
    `\nWould set isDeleted: false on ${s.missing} document(s).` +
      "\nNo changes made (dry run). Re-run with --apply to write.",
  );
  await prisma.$disconnect();
  process.exit(0);
}

// ---- Apply ----
const res = await prisma.$runCommandRaw({
  update: "Video",
  updates: [
    {
      q: { isDeleted: { $exists: false } },
      u: { $set: { isDeleted: false } },
      multi: true,
    },
  ],
});

console.log(`\nMatched ${res.n ?? 0}, modified ${res.nModified ?? 0} document(s).`);

const after = await prisma.video.count({ where: { isDeleted: false } });
console.log(`Videos now visible to the app (isDeleted: false): ${after}`);

await prisma.$disconnect();
