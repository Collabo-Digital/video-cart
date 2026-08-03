import { authenticate } from "../../config/shopify.server";
import * as GlobalSettingsModel from "../../models/globalSettings.server";
import prisma from "../../config/database.server";

export const loader = async ({ request }) => {
  try {
    const { session } = await authenticate.public.appProxy(request);

    if (!session) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const globalRecord = await GlobalSettingsModel.findByShopDomain(session.shop);
    const vd = globalRecord?.settings?.general?.videoDiscovery;

    if (!vd?.isEnabled) {
      return Response.json({ success: true, data: { videos: [] } }, {
        headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" },
      });
    }

    const feedWhere = { shopDomain: session.shop, isDeleted: false, isEnabled: true };

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
        if (!v || !v.videoPlaybackId) continue;

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

    // Per-shop data — safe to cache briefly, EXCEPT when the merchant asked for a
    // random order: caching would freeze one shuffle for every visitor in the window.
    const cacheable = vd.sortOrder !== "random";
    return Response.json({ success: true, data: { videos } }, {
      headers: {
        "Cache-Control": cacheable
          ? "public, max-age=300, stale-while-revalidate=600"
          : "no-store",
      },
    });
  } catch (error) {
    // authenticate.public.appProxy throws a Response (400) on an invalid
    // signature — framework control flow, not an error. Let it through.
    if (error instanceof Response) throw error;

    console.error("[Proxy Discovery] Error:", error);
    return Response.json(
      { success: false, error: error.message || "Failed to fetch discovery videos" },
      { status: 500 }
    );
  }
};
