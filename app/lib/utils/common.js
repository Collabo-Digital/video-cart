
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
