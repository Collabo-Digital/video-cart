/**
 * READ-ONLY diagnostics for the Session collection.
 *
 * Checks:
 *  1. Whether the unique index on Session.id actually exists in MongoDB
 *     (without it, duplicate sessions can be inserted silently).
 *  2. Which Shopify session ids are duplicated, and for which shops.
 *  3. Pre-flight for `prisma db push`: duplicates in any other
 *     unique-constrained collection would make index creation fail.
 *
 * Usage: node scripts/check-sessions.js
 * (reads DATABASE_URL from the environment / .env)
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 1. Indexes on the Session collection
const idx = await prisma.$runCommandRaw({ listIndexes: "Session" });
const indexes = idx.cursor.firstBatch;
console.log("Session indexes:");
console.log(JSON.stringify(indexes, null, 2));
const hasUniqueIdIndex = indexes.some(
  (i) => i.key?.id === 1 && i.unique === true,
);
console.log(
  hasUniqueIdIndex
    ? "\n✅ Unique index on Session.id exists — duplicate inserts are blocked."
    : "\n❌ NO unique index on Session.id — duplicates can be inserted silently. Run dedupe then `prisma db push`.",
);

// 2. Duplicated Shopify session ids
const dupes = await prisma.session.aggregateRaw({
  pipeline: [
    {
      $group: {
        _id: "$id",
        count: { $sum: 1 },
        docIds: { $push: "$_id" },
        shops: { $addToSet: "$shop" },
      },
    },
    { $match: { count: { $gt: 1 } } },
    { $sort: { count: -1 } },
  ],
});
console.log(`\nDuplicated session ids: ${dupes.length}`);
if (dupes.length > 0) {
  console.log(JSON.stringify(dupes, null, 2));
}

// 3. Pre-flight for `prisma db push`: duplicates in OTHER unique fields
console.log("\nPre-flight check for `prisma db push` (other unique constraints):");
const uniqueChecks = [
  ["Shop", ["shopDomain"]],
  ["GlobalSettings", ["shopDomain"]],
  ["Video", ["videoUploadId"]],
  ["Video", ["videoAssetId"]],
  ["Feed", ["widgetId"]],
  ["VideoCartOrder", ["orderId"]],
  ["FeedVideo", ["feedId", "videoId"]],
  ["FeedAnalytics", ["feedId", "date"]],
  ["VideoAnalytics", ["videoId", "feedId", "date"]],
];
for (const [coll, fields] of uniqueChecks) {
  const groupId = Object.fromEntries(fields.map((f) => [f, `$${f}`]));
  try {
    const res = await prisma.$runCommandRaw({
      aggregate: coll,
      pipeline: [
        // Ignore docs where the unique field is entirely absent/null —
        // Prisma's unique indexes are sparse for optional fields.
        { $match: Object.fromEntries(fields.map((f) => [f, { $ne: null }])) },
        { $group: { _id: groupId, count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
        { $count: "dupGroups" },
      ],
      cursor: {},
    });
    const n = res.cursor.firstBatch[0]?.dupGroups ?? 0;
    console.log(
      `  ${coll} (${fields.join("+")}): ${n} duplicate group(s)${n ? "  <-- must fix before db push" : ""}`,
    );
  } catch (e) {
    console.log(`  ${coll} (${fields.join("+")}): check failed — ${e.message}`);
  }
}

const total = await prisma.session.count();
console.log(`\nTotal session documents: ${total}`);

await prisma.$disconnect();
