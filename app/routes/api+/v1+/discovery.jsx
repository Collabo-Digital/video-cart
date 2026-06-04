import * as GlobalSettingsModel from "../../../models/globalSettings.server";
import { captureRouteError } from "~/lib/utils/observability/errorCapture";
import prisma from "../../../config/database.server";

export const loader = async ({ request }) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "public, max-age=300",
  };

  try {
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop");

    if (!shop) {
      return new Response(
        JSON.stringify({ success: false, error: "Shop parameter is required" }),
        { status: 400, headers }
      );
    }

    const globalRecord = await GlobalSettingsModel.findByShopDomain(shop);
    const vd = globalRecord?.settings?.general?.videoDiscovery;

    if (!vd?.isEnabled) {
      return new Response(
        JSON.stringify({ success: true, data: { videos: [] } }),
        { status: 200, headers }
      );
    }

    const feedWhere = { shopDomain: shop, isDeleted: false, isEnabled: true };

    if (vd.feedSource !== "all" && vd.feedSource !== "selected") {
      feedWhere.widgetType = vd.feedSource;
    }
    if (vd.feedSource === "selected" && vd.selectedFeedIds?.length > 0) {
      feedWhere.id = { in: vd.selectedFeedIds };
    }

    const feeds = await prisma.feed.findMany({
      where: feedWhere,
      include: { videos: { orderBy: { position: "asc" }, include: { video: true } } },
    });

    const videoMap = new Map();
    for (const feed of feeds) {
      for (const fv of feed.videos) {
        if (videoMap.has(fv.videoId)) continue;
        const v = fv.video;
        if (!v || v.status !== "READY" || !v.videoPlaybackId) continue;

        videoMap.set(fv.videoId, {
          id: v.id,
          playbackId: v.videoPlaybackId,
          title: v.fileName || v.title,
          duration: v.duration,
          aspectRatio: v.aspectRatio,
          productsTagged: fv.productsTagged ?? [],
          position: fv.position,
          addedAt: fv.addedAt,
        });
      }
    }

    let videos = [...videoMap.values()];

    if (vd.sortOrder === "newest") {
      videos.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
    } else if (vd.sortOrder === "random") {
      for (let i = videos.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [videos[i], videos[j]] = [videos[j], videos[i]];
      }
    }

    return new Response(
      JSON.stringify({ success: true, data: { videos } }),
      { status: 200, headers }
    );
  } catch (error) {
    console.error("[Discovery API] Error:", error);
    captureRouteError(error, {
      route: "discovery",
      url: request.url,
      method: request.method,
    });
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Failed to fetch discovery videos" }),
      { status: 500, headers }
    );
  }
};
