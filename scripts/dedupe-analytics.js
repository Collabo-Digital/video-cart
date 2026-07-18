/* eslint-env node */
/**
 * One-time cleanup: MERGE duplicate FeedAnalytics / VideoAnalytics rows.
 *
 * These are daily counter rows. Duplicates hold split counts, so this
 * script SUMS the counters into one surviving row (oldest _id) and
 * deletes the extra rows — totals shown in dashboards stay identical.
 *
 * DRY-RUN by default — prints what it would do without changing anything.
 * Pass --apply to actually merge. On --apply, a JSON backup of all
 * affected rows is written to the OS temp directory BEFORE any change.
 *
 * Usage:
 *   node scripts/dedupe-analytics.js           # dry run
 *   node scripts/dedupe-analytics.js --apply   # merge duplicates
 */
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

const oid = (v) => (v && typeof v === "object" && v.$oid ? v.$oid : v);

const FEED_COUNTERS = [
  "widgetImpressions",
  "widgetClicks",
  "widgetVideoPlays",
  "widgetViews",
  "widgetProductClicks",
  "widgetAddToCart",
  "widgetOrders",
  "widgetRevenue",
];
const VIDEO_COUNTERS = [
  "videoImpressions",
  "videoViews",
  "videoProductClicks",
  "videoAtcClicks",
  "videoAddToCart",
  "videoOrders",
  "videoRevenue",
];

const COLLECTIONS = [
  {
    label: "FeedAnalytics",
    model: prisma.feedAnalytics,
    groupFields: ["feedId", "date"],
    counterFields: FEED_COUNTERS,
  },
  {
    label: "VideoAnalytics",
    model: prisma.videoAnalytics,
    groupFields: ["videoId", "feedId", "date"],
    counterFields: VIDEO_COUNTERS,
  },
];

console.log(`${APPLY ? "APPLY" : "DRY RUN"} — merging duplicate analytics rows`);

// ---- Phase 1: collect merge plans (no mutations) ----
const plans = [];
for (const { label, model, groupFields, counterFields } of COLLECTIONS) {
  const groupId = Object.fromEntries(groupFields.map((f) => [f, `$${f}`]));
  const dupes = await model.aggregateRaw({
    pipeline: [
      { $group: { _id: groupId, count: { $sum: 1 }, ids: { $push: "$_id" } } },
      { $match: { count: { $gt: 1 } } },
    ],
  });

  console.log(`\n=== ${label}: ${dupes.length} duplicate group(s) ===`);

  for (const group of dupes) {
    const ids = group.ids.map(oid);
    const rows = await model.findMany({ where: { id: { in: ids } } });
    if (rows.length <= 1) continue;

    // Keep the oldest document (smallest ObjectId), merge everything into it
    const sorted = [...rows].sort((a, b) => (a.id < b.id ? -1 : 1));
    const [keep, ...remove] = sorted;

    const sums = {};
    for (const f of counterFields) {
      sums[f] = rows.reduce((acc, r) => acc + Number(r[f] ?? 0), 0);
    }
    // Row stays visible if ANY duplicate was still active
    const isDeleted = rows.every((r) => r.isDeleted === true);

    console.log(`\ngroup ${JSON.stringify(group._id)}`);
    for (const r of rows) {
      const vals = counterFields.map((f) => `${f}=${r[f] ?? 0}`).join(" ");
      console.log(`  row _id=${r.id} isDeleted=${r.isDeleted} ${vals}`);
    }
    const mergedVals = counterFields.map((f) => `${f}=${sums[f]}`).join(" ");
    console.log(`  MERGE -> keep _id=${keep.id} isDeleted=${isDeleted} ${mergedVals}`);
    console.log(`  DELETE ${remove.map((r) => r.id).join(", ")}`);

    plans.push({ label, model, rows, keepId: keep.id, removeIds: remove.map((r) => r.id), sums, isDeleted });
  }
}

if (!APPLY) {
  console.log("\nNo changes made (dry run). Re-run with --apply to merge duplicates.");
  await prisma.$disconnect();
  process.exit(0);
}

// ---- Phase 2: backup BEFORE any mutation ----
const backupFile = path.join(
  os.tmpdir(),
  `video-cart-analytics-backup-${Date.now()}.json`,
);
fs.writeFileSync(
  backupFile,
  JSON.stringify(
    plans.map(({ label, rows }) => ({ collection: label, rows })),
    null,
    2,
  ),
);
console.log(`\nBackup of all affected rows written to: ${backupFile}`);

// ---- Phase 3: apply merges ----
let merged = 0;
let deleted = 0;
for (const { model, keepId, removeIds, sums, isDeleted } of plans) {
  await model.update({
    where: { id: keepId },
    data: { ...sums, isDeleted },
  });
  const res = await model.deleteMany({ where: { id: { in: removeIds } } });
  merged += 1;
  deleted += res.count;
}

console.log(`Merged ${merged} group(s), deleted ${deleted} duplicate row(s).`);
await prisma.$disconnect();
