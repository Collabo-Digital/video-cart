
function getDefaultDateRange() {
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const start = new Date();
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);

    return { start, end };
}

export function parseDateRange(request) {
    const url = new URL(request.url);
    const startParam = url.searchParams.get("start");
    const endParam = url.searchParams.get("end");
    if (startParam && endParam) {
        const start = new Date(startParam);
        start.setHours(0, 0, 0, 0);

        const end = new Date(endParam);
        end.setHours(23, 59, 59, 999);

        if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
            return { start, end };
        }
    }
    return getDefaultDateRange();
}


export function formatRevenue(value, currencyCode) {
    if (value == null || Number.isNaN(value)) return "0";
    const num = Number(value);
    return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currencyCode || "USD",
        notation: num >= 1_000 ? "compact" : "standard",
        maximumFractionDigits: num >= 1_000 ? 1 : 2,
    }).format(num);
}

/** Local calendar day as YYYY-MM-DD — never toISOString (that shifts the day for non-UTC users). */
export function toLocalDateString(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

export function mergeDailyChartData(dailyFeed, dailyVideo) {
    const byDate = new Map();

    const empty = (date) => ({
        date, videoViews: 0, orders: 0, impressions: 0,
        addToCart: 0, revenue: 0, productClicks: 0, atcRate: 0,
    });

    // Widget-level counters are the canonical daily numbers. Video-level rows
    // fire alongside widget-level ones for the same shopper action, so summing
    // both double-counts — video rows contribute only videoViews here.
    for (const row of dailyFeed ?? []) {
        const cur = byDate.get(row.date) ?? empty(row.date);
        cur.orders += row.widgetOrders ?? 0;
        cur.impressions += row.widgetImpressions ?? 0;
        cur.addToCart += row.widgetAddToCart ?? 0;
        cur.revenue += row.widgetRevenue ?? 0;
        cur.productClicks += row.widgetProductClicks ?? 0;
        byDate.set(row.date, cur);
    }

    for (const row of dailyVideo ?? []) {
        const cur = byDate.get(row.date) ?? empty(row.date);
        cur.videoViews += row.videoViews ?? 0;
        byDate.set(row.date, cur);
    }

    for (const cur of byDate.values()) {
        cur.atcRate = cur.videoViews > 0 ? cur.addToCart / cur.videoViews : 0;
    }

    return Array.from(byDate.values()).sort((a, b) =>
        a.date.localeCompare(b.date),
    );
}

export function getChartTrend(chartData, key, asPercent = false) {
    if (!chartData?.length || chartData.length < 2) return null;
    const prev = chartData[chartData.length - 2][key] ?? 0;
    const curr = chartData[chartData.length - 1][key] ?? 0;
    const diff = curr - prev;
    if (diff === 0 && !asPercent) return null;
    if (asPercent) {
        const pct = prev === 0 ? 100 : ((curr - prev) / prev) * 100;
        return { direction: diff > 0 ? "up" : "down", diff: `${Math.abs(pct).toFixed(1)}%` };
    }
    return { direction: diff > 0 ? "up" : "down", diff: Math.abs(diff) };
}



const RESET_PERIOD_DAYS = 30;

export function getNextResetDate(base) {
    const from = base ? new Date(base) : new Date();
    const next = new Date(from);
    next.setDate(next.getDate() + RESET_PERIOD_DAYS);
    return next;
}


export function getPercentage(used, total) {
    if (total === 0) return 0;
    return Math.round((used / total) * 100);
}

/** Converts the sort string (e.g. "createdAt desc") to the API payload shape. */
export function parseSortSelected(sortSelected) {
    const sortStr = sortSelected?.[0];
    if (!sortStr) return undefined;
    const [key, direction] = sortStr.split(" ");
    return [{ key, direction }];
}

/** Builds the filters object sent to the feeds list API. */
export function buildFiltersPayload({ statusFilter, widgetTypeFilter, queryValue, cursor, direction, sortSelected }) {
    const payload = {};

    if (statusFilter?.length) payload.status = statusFilter;
    if (widgetTypeFilter?.length) payload.widgetType = widgetTypeFilter;

    const search = queryValue?.trim() || undefined;
    if (search) payload.search = search;

    if (cursor) {
        payload.cursor = cursor;
        payload.direction = direction ?? "next";
    }

    if (sortSelected?.length) payload.sortSelected = sortSelected;

    return payload;
}

/** Truncates a string and appends an ellipsis if it exceeds maxLen. */
export function truncateName(name, maxLen = 14) {
    if (!name) return "";
    return name.length > maxLen ? `${name.slice(0, maxLen)}…` : name;

}

/** Returns the list of feeds a video belongs to, with nulls filtered out. */
export function getWidgetsFromVideo(video) {
    return (video?.feedVideos ?? [])
        .map((fv) => ({ id: fv.feed?.id, name: fv.feed?.feedName ?? "" }))
        .filter((w) => w.id);
}


export function normaliseFeedVideo(v) {
    const video = v.video ?? {};
    return {
        id: video.id ?? v.videoId,
        videoId: v.videoId,
        playbackId: v.playbackId ?? video.videoPlaybackId,
        title: video.title,
        fileName: video.fileName,
        fileUploadName: video.fileUploadName,
        duration: video.duration,
        status: video.status,
        assetId: video.videoAssetId,
        uploadId: video.videoUploadId,
        taggedProducts:
            v.taggedProducts ??
            (v.productsTagged ?? []).map((item) =>
                typeof item === "object" && item !== null
                    ? { ...item, id: item.id != null ? String(item.id) : "" }
                    : { id: String(item), title: "", image: null }
            ),
        productsTagged: v.productsTagged,
    };
}