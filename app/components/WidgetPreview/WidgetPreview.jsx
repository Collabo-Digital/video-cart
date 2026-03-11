import { useRef, useMemo, useEffect, useCallback } from "react";

export default function WidgetPreview({ watch, feed }) {
  const iframeRef = useRef(null);
  const iframeReadyRef = useRef(false);
  const pendingPayloadRef = useRef(null); // holds latest payload if iframe isn't ready yet

  const watchedSettings = watch("settings");
  const watchedWidgetType = watch("widgetType");
  const watchedFeedName = watch("feedName");
  const watchedWidgetPage = watch("widgetPage");

  const previewFeed = useMemo(() => ({
    id: feed?.id ?? "preview",
    name: watchedFeedName || feed?.feedName || "",
    widgetType: watchedWidgetType || feed?.widgetType || "carousel",
    widgetPage: watchedWidgetPage || feed?.widgetPage || "homePage",
    settings: watchedSettings ?? feed?.settings ?? {},
    isPreview: true,
  }), [feed, watchedSettings, watchedWidgetType, watchedFeedName, watchedWidgetPage]);

  const previewVideos = useMemo(() => (feed?.videos || []).map((v) => ({
    id: v.id || v.videoId,
    videoId: v.videoId,
    playbackId: v.playbackId,
    title: v.title || v.fileName || "",
    productsTagged: v.taggedProducts || v.productsTagged || [],
  })), [feed?.videos]);

  // Central send function
  const sendToIframe = useCallback((payload) => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage(
      { type: "video-cart-preview-update", payload },
      '*',
    );
  }, []);

  // Listen for "iframe ready" signal — then flush pending payload
  useEffect(() => {
    function handleMessage(event) {
    //   if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "video-cart-preview-ready") return;

      iframeReadyRef.current = true;

      // Send whatever the latest payload was while iframe was loading
      if (pendingPayloadRef.current) {
        sendToIframe(pendingPayloadRef.current);
        pendingPayloadRef.current = null;
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [sendToIframe]);

  // Send update whenever config changes
  useEffect(() => {
    const payload = {
      feed: previewFeed,
      settings: watchedSettings ?? feed?.settings ?? {},
      videos: previewVideos,
    };

    if (iframeReadyRef.current) {
      sendToIframe(payload);
    } else {
      // iframe not ready yet — store payload, it'll be sent on "ready" signal
      pendingPayloadRef.current = payload;
    }
  }, [previewFeed, previewVideos, watchedSettings, sendToIframe]);

  return (
    // inside your WidgetPreview return:


    <div style={{ background: "#f9fafb", borderRadius: 8, overflow: "hidden" }}>
      {/* Device toggle buttons */}
      <iframe
        ref={iframeRef}
        src="/app/widget-preview"
        title="Widget preview"
        style={{ 
          width: "100%", 
          minHeight: 480, 
          border: "none",
          display: "block",
        }}
      />
    </div>
  );
}