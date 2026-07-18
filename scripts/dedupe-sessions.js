/* eslint-env node */
/**
 * One-time cleanup: remove duplicate Session documents.
 *
 * For each duplicated Shopify session id, keeps the BEST row and deletes
 * the rest by Mongo _id. "Best" = latest token expiry, then has a
 * refreshToken, then newest document (ObjectId timestamp).
 *
 * DRY-RUN by default — prints what it would do without deleting anything.
 * Pass --apply to actually delete. Idempotent: safe to re-run.
 *
 * Usage:
 *   node scripts/dedupe-sessions.js           # dry run
 *   node scripts/dedupe-sessions.js --apply   # delete duplicates
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

const objectIdSeconds = (hex) => parseInt(hex.substring(0, 8), 16);

const dupes = await prisma.session.aggregateRaw({
  pipeline: [
    { $group: { _id: "$id", count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ],
});

console.log(
  `${APPLY ? "APPLY" : "DRY RUN"} — ${dupes.length} duplicated session id(s)\n`,
);
let deleted = 0;

for (const d of dupes) {
  const sessionId = d._id; // the Shopify session id, e.g. "offline_shop.myshopify.com"
  const rows = await prisma.session.findMany({ where: { id: sessionId } });
  const ranked = [...rows].sort((a, b) => {
    const expDiff = (b.expires?.getTime() ?? 0) - (a.expires?.getTime() ?? 0);
    if (expDiff !== 0) return expDiff; // newest access token first
    const rtDiff = (b.refreshToken ? 1 : 0) - (a.refreshToken ? 1 : 0);
    if (rtDiff !== 0) return rtDiff; // has refreshToken first
    return objectIdSeconds(b.session_id) - objectIdSeconds(a.session_id); // newest doc first
  });
  const [keep, ...remove] = ranked;
  console.log(`id=${sessionId} shop=${keep.shop}`);
  console.log(
    `  KEEP   _id=${keep.session_id} expires=${keep.expires?.toISOString() ?? "null"} refreshToken=${keep.refreshToken ? "yes" : "no"}`,
  );
  for (const r of remove) {
    console.log(
      `  DELETE _id=${r.session_id} expires=${r.expires?.toISOString() ?? "null"} refreshToken=${r.refreshToken ? "yes" : "no"}`,
    );
  }
  if (APPLY) {
    const res = await prisma.session.deleteMany({
      where: { session_id: { in: remove.map((r) => r.session_id) } },
    });
    deleted += res.count;
  }
}

console.log(
  `\nDone. ${APPLY ? `Deleted ${deleted} row(s).` : "No changes made (dry run). Re-run with --apply to delete."}`,
);
await prisma.$disconnect();
