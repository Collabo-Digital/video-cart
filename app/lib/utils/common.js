
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


export function formatRevenue(value) {
    if (value == null || Number.isNaN(value)) return "0";
    const num = Number(value);
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}k`;
    return num.toFixed(2);
}

export function mergeDailyChartData(dailyFeed, dailyVideo) {
    const byDate = new Map();

    for (const row of dailyFeed ?? []) {
        byDate.set(row.date, {
            date: row.date,
            videoViews: 0,
            orders: row.widgetOrders ?? 0,
            impressions: row.widgetImpressions ?? 0,
            addToCart: row.widgetAddToCart ?? 0,
        });
    }

    for (const row of dailyVideo ?? []) {
        const cur = byDate.get(row.date) ?? {
            date: row.date,
            videoViews: 0,
            orders: 0,
            impressions: 0,
            addToCart: 0,
        };
        cur.videoViews += row.videoViews ?? 0;
        cur.orders += row.videoOrders ?? 0;
        cur.impressions += row.videoImpressions ?? 0;
        cur.addToCart += row.videoAddToCart ?? 0;
        byDate.set(row.date, cur);
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