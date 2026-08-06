import {
  Badge,
  Banner,
  BlockStack,
  Box,
  Button,
  Card,
  EmptyState,
  Icon,
  InlineGrid,
  InlineStack,
  Page,
  Tabs,
  Text,
} from "@shopify/polaris";
import { SettingsIcon, UploadIcon, ViewIcon } from "@shopify/polaris-icons";
import {
  redirect,
  useActionData,
  useFetcher,
  useLoaderData,
  useNavigation,
  useSubmit,
} from "react-router";
import { SaveBar, useAppBridge } from "@shopify/app-bridge-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";

import { authenticate } from "../../config/shopify.server";
import { getFeedFormDefaultValues } from "../../lib/constants/settings";
import useLocalStorage from "../../lib/hooks/useLocalStorage";
import { apiError, apiSuccess } from "../../lib/utils/apiResponse";
import {
  filterDuplicateVideos,
  isDuplicateVideoInWidget,
  prepareVideosPayload,
} from "../../lib/utils/feed";
import { captureRouteError } from "../../lib/utils/observability/errorCapture.server";
import * as ShopModel from "../../models/shop.server";
import * as VideoModel from "../../models/video.server";
import * as GlobalSettingsModel from "../../models/globalSettings.server";
import { createFeed, getFeedById, updateFeed } from "../../services/feed/feed.service.server";

import { normaliseFeedVideo } from "../../lib/utils/common";

/** Matches the window refreshed on every admin page view in app+/_layout.jsx.
 *  "Configure in theme" only extends it; the layout already opened it. */
const THEME_SETUP_WINDOW_MS = 2 * 60 * 60 * 1000;

/** Which theme template the editor should open on, so the block lands on the
 *  page this feed is meant for. */
const widgetPageToTemplate = {
  homePage: "index",
  productPage: "product",
  collectionPage: "collection",
};

function templateForCustomPath(path) {
  const p = (path || "").toLowerCase();
  if (p.startsWith("/products/")) return "product";
  if (p.startsWith("/collections/")) return "collection";
  if (p.startsWith("/blogs/")) return "article";
  if (p.startsWith("/pages/")) return "page";
  return "index";
}
import AnalyticsTab from "../../components/AnalyticsTab/AnalyticsTab";
import { SettingsTab } from "../../components/SettingsTab/Index";
import VideoDisplay from "../../components/VideoContainer/VideoContainer";
import VideoUploader from "../../components/VideoUploader/VideoUploader";
import WidgetPreview from "../../components/WidgetPreview/WidgetPreview";


const SAVE_BAR_ID = "feed-save-bar";


export const loader = async ({ params, request }) => {
  const { session } = await authenticate.admin(request);
  try {

    const [totalVideos, shopData, globalSettingsRecord] = await Promise.all([
      VideoModel.count(session.shop),
      ShopModel.findByDomain(session.shop),
      GlobalSettingsModel.findByShopDomain(session.shop),
    ]);
    const uploadLimit = shopData?.planLimits?.videoUploadLimit ?? 0;
    const remaining = Math.max(0, uploadLimit - totalVideos);
    const globalSettings = globalSettingsRecord?.settings ?? null;

    if (params.feedId === "new") {
      const url = new URL(request.url);
      return apiSuccess({
        mode: "create",
        feed: null,
        widgetType: url.searchParams.get("widgetType") ?? null,
        widgetPage: url.searchParams.get("widgetPage") ?? null,
        remaining,
        globalSettings,
      });
    }

    const feed = await getFeedById(params.feedId, session.shop);
    return apiSuccess({ mode: "edit", feed, shop: session.shop, remaining, globalSettings });
  } catch (error) {
    console.error("[FeedEditorPage] Loader error:", error);
    captureRouteError(error, {
      route: "feeds-edit-loader",
      url: request.url,
      method: request.method,
      shop: session?.shop ?? "unknown",
    });
    return apiError(error, { status: 404, route: "feeds-loader", code: "FEED_NOT_FOUND" });
  }
};


export const action = async ({ params, request }) => {
  const { session } = await authenticate.admin(request);

  try {
    const formData = await request.formData();
    const data = Object.fromEntries(formData);

    // Opens the window that makes /blocks/assign writable, then hands back a
    // deep link that drops the block into the theme editor already placed.
    // Both halves matter: a deep link cannot carry setting values, so without
    // the window the merchant would land on a block that cannot save its pick.
    if (data.intent === "configureInTheme") {
      await ShopModel.updateByDomain(session.shop, {
        themeSetupUntil: new Date(Date.now() + THEME_SETUP_WINDOW_MS),
      });

      // SHOPIFY_API_KEY differs between shopify.app.toml and
      // shopify.app.video-cart.toml — never hardcode it.
      const themeEditorUrl =
        `https://${session.shop}/admin/themes/current/editor` +
        `?template=${encodeURIComponent(data.template || "index")}` +
        `&addAppBlockId=${process.env.SHOPIFY_API_KEY}/video-carousel` +
        `&target=newAppsSection`;

      return { themeEditorUrl };
    }

    const parsedVideos = JSON.parse(data.videos ?? "[]");
    const parsedSettings = data.settings ? JSON.parse(data.settings) : undefined;

    const customPagePath = data.widgetPage === "custom" ? (data.customPagePath || null) : null;

    if (params.feedId === "new") {
      const feed = await createFeed({
        feedName: data.feedName,
        shopDomain: session.shop,
        widgetType: data.widgetType,
        widgetPage: data.widgetPage,
        customPagePath,
        isEnabled: data.isEnabled === "true",
        settings: parsedSettings,
        videos: parsedVideos,
      });

      return redirect(`/app/feeds/${feed.id}`);
    }

    await updateFeed(params.feedId, {
      feedName: data.feedName,
      widgetType: data.widgetType,
      widgetPage: data.widgetPage,
      customPagePath,
      isEnabled: data.isEnabled === "true",
      settings: parsedSettings,
      videos: parsedVideos,
    }, session.shop);

    return redirect(`/app/feeds/${params.feedId}`);
  } catch (error) {
    captureRouteError(error, {
      route: "feeds-action",
      url: request.url,
      method: request.method,
      shop: session?.shop ?? "unknown",
    });
    return apiError(error, { status: 400, route: "feeds-action", code: "FAILED_TO_SAVE_FEED" });
  }
};


const EmptyVideoState = () => (
  <EmptyState heading="Upload your first video" image="/upload-video.svg">
    <p>Add videos to showcase products or attach media to your inventory records.</p>
  </EmptyState>
);


const WIDGET_TABS = [
  {
    id: "feeds-upload",
    index: 0,
    content: (
      <InlineStack gap="200" blockAlign="center">
        <Icon source={UploadIcon} />
        <span>Uploads</span>
      </InlineStack>
    ),
    panelID: "feeds-uploads-content",
  },
  {
    id: "widget-settings",
    index: 1,
    content: (
      <InlineStack gap="200" blockAlign="center">
        <Icon source={SettingsIcon} />
        <span>Settings</span>
      </InlineStack>
    ),
    panelID: "feeds-settings-content",
  },
];


export default function FeedEditorPage() {
  const loaderData = useLoaderData();
  const { mode, feed, widgetType, widgetPage, remaining, globalSettings } = loaderData?.data ?? {};

  const actionData = useActionData();
  const navigation = useNavigation();
  const submit = useSubmit();
  const shopify = useAppBridge();
  const [shopData] = useLocalStorage("shopData", null);

  const [uploadedVideos, setUploadedVideos] = useState([]);
  // Filled by VideoUploader with { cancel, retry, checkAgain } so the buttons on
  // an in-flight card can drive the upload that lives inside VideoUploader.
  const uploadActionsRef = useRef(null);
  const [error, setError] = useState(null);
  const [hasVideoChanges, setHasVideoChanges] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [settingsTab, setSettingsTab] = useState(0);

  const previewModalRef = useRef(null);

  // Opens the setup window server-side, then sends the merchant to the theme
  // editor with the block already placed. target="_top" because the admin runs
  // us in an iframe and the theme editor refuses to load inside it.
  const themeFetcher = useFetcher();
  const isConfiguringTheme = themeFetcher.state !== "idle";

  const configureInTheme = useCallback(() => {
    const template =
      widgetPageToTemplate[feed?.widgetPage] ?? templateForCustomPath(feed?.customPagePath);
    themeFetcher.submit(
      { intent: "configureInTheme", template },
      { method: "post" }
    );
  }, [feed?.widgetPage, feed?.customPagePath, themeFetcher]);

  useEffect(() => {
    const url = themeFetcher.data?.themeEditorUrl;
    if (url) window.open(url, "_top");
  }, [themeFetcher.data]);

  const formValues = useMemo(
    () => getFeedFormDefaultValues(feed, widgetType, widgetPage, globalSettings),
    [feed, widgetType, widgetPage, globalSettings]
  );

  const {
    control,
    watch,
    reset,
    setValue,
    formState: { errors, isDirty },
  } = useForm({ values: formValues });

  const hasChanges = isDirty || hasVideoChanges;
  const isSubmitting = navigation.state === "submitting";

  useEffect(() => {
    if (feed?.videos) {
      setUploadedVideos(feed.videos.map(normaliseFeedVideo));
    }
  }, [feed]);

  useEffect(() => {
    if (!shopify) return;
    hasChanges
      ? shopify.saveBar.show(SAVE_BAR_ID)
      : shopify.saveBar.hide(SAVE_BAR_ID);

    return () => shopify?.saveBar?.hide(SAVE_BAR_ID);
  }, [hasChanges, shopify]);

  const handleVideoUpload = useCallback(
    (newVideo) => {
      if (isDuplicateVideoInWidget(newVideo, uploadedVideos)) {
        setError("This video is already in the widget. Duplicates are not allowed.");
        return;
      }
      setError(null);
      setUploadedVideos((prev) => [...prev, newVideo]);
      setHasVideoChanges(true);
    },
    [uploadedVideos]
  );

  const handleVideosFromLibrary = useCallback(
    (newVideos) => {
      if (!Array.isArray(newVideos) || newVideos.length === 0) return;

      const { toAdd, duplicateCount } = filterDuplicateVideos(newVideos, uploadedVideos);

      if (toAdd.length > 0) {
        setUploadedVideos((prev) => [...prev, ...toAdd]);
      }

      setError(
        duplicateCount > 0
          ? toAdd.length > 0
            ? `${duplicateCount} duplicate video(s) skipped — already in this widget.`
            : "All selected videos are already in this widget."
          : null
      );
      setHasVideoChanges(true);
    },
    [uploadedVideos]
  );

  // --- In-flight upload placeholders --------------------------------------
  // The device upload runs in VideoUploader (so it survives the modal closing)
  // and reports progress here. A placeholder card appears immediately and is
  // swapped for the real video once Mux returns a playback id.
  const updatePendingVideo = useCallback((tempId, patch) => {
    setUploadedVideos((prev) =>
      prev.map((v) => (v.tempId === tempId ? { ...v, ...patch } : v)),
    );
  }, []);

  const handleUploadStart = useCallback(({ tempId, fileName, file }) => {
    setError(null);
    setUploadedVideos((prev) => [
      ...prev,
      // `file` is kept so a failed transfer can be retried without re-picking it.
      { tempId, fileName, title: fileName, uploadState: 'uploading', progress: 0, file },
    ]);
  }, []);

  const handleUploadProgress = useCallback(
    (tempId, progress) => updatePendingVideo(tempId, { progress }),
    [updatePendingVideo],
  );

  const handleUploadStateChange = useCallback(
    (tempId, uploadState, patch = {}) => updatePendingVideo(tempId, { uploadState, ...patch }),
    [updatePendingVideo],
  );

  // The poll ran out of budget. Keep whatever it did learn (videoId, playbackId)
  // so the card stays saveable and "Check again" has an uploadId to re-poll.
  const handleUploadPending = useCallback(
    (tempId, video) => {
      updatePendingVideo(tempId, { ...(video ?? {}), uploadState: 'slow' });
      // Without this the Save Bar never appears on an otherwise-clean form, so a
      // perfectly saveable 'slow' card has no way to be saved at all.
      if (video?.videoId) setHasVideoChanges(true);
    },
    [updatePendingVideo],
  );

  const handleUploadReady = useCallback((tempId, video) => {
    // Replace the placeholder with the real video, keeping its position.
    setUploadedVideos((prev) =>
      prev.map((v) => (v.tempId === tempId ? { ...video } : v)),
    );
    setHasVideoChanges(true);
  }, []);

  const handleUploadFailed = useCallback(
    (tempId, uploadError, meta = {}) =>
      updatePendingVideo(tempId, {
        uploadState: 'failed',
        uploadError,
        // Records that Mux rejected the asset, so Retry re-uploads rather than
        // re-polling an upload whose verdict can never change.
        assetErrored: !!meta.assetErrored,
      }),
    [updatePendingVideo],
  );

  const handleUploadCancel = useCallback((tempId) => {
    setUploadedVideos((prev) => prev.filter((v) => v.tempId !== tempId));
  }, []);

  const handleRemoveVideo = useCallback(
    (index) => {
      // Read the target OUTSIDE the updater and scope the abort to this card —
      // an unscoped cancel kills whatever upload happens to be live and then
      // deletes that other card too.
      const target = uploadedVideos[index];
      if (target?.uploadState === 'uploading' || target?.uploadState === 'processing') {
        uploadActionsRef.current?.cancel?.(target.tempId);
      }
      // Remove by IDENTITY, not index. cancel() above synchronously fires
      // onUploadCancel, which already filtered this card out — a positional
      // filter would then delete whichever card slid into the vacated slot.
      setUploadedVideos((prev) =>
        target ? prev.filter((v) => v !== target) : prev.filter((_, i) => i !== index),
      );
      setHasVideoChanges(true);
    },
    [uploadedVideos],
  );

  const handleRetryVideo = useCallback(
    (index) => {
      const target = uploadedVideos[index];
      if (!target) return;
      // Re-polling only helps while the asset can still turn out fine. Once Mux
      // has rejected it, no amount of checking will change the verdict — that
      // card needs a fresh upload.
      const canRepoll = target.uploadId && !target.assetErrored;
      if (canRepoll) {
        uploadActionsRef.current?.checkAgain?.(target.tempId, target.uploadId, target.fileName);
      } else if (target.file) {
        uploadActionsRef.current?.retry?.(target.tempId, target.file);
      }
    },
    [uploadedVideos],
  );

  const handleTaggedProductsChange = useCallback((videoIndex, products) => {
    setUploadedVideos((prev) =>
      prev.map((v, i) => (i === videoIndex ? { ...v, taggedProducts: products } : v))
    );
    setHasVideoChanges(true);
  }, []);

  const handleFileNameChange = useCallback((videoIndex, fileName) => {
    setUploadedVideos((prev) =>
      prev.map((v, i) =>
        i === videoIndex
          ? { ...v, fileName: fileName?.trim() || v.fileName || v.title }
          : v
      )
    );
    setHasVideoChanges(true);
  }, []);

  const handleSave = useCallback(() => {
    // Only these two genuinely have nothing the server can resolve yet.
    if (uploadedVideos.some((v) => v.uploadState === "uploading" || v.uploadState === "processing")) {
      setError("Wait for the upload to finish before saving.");
      shopify.toast.show("Wait for the upload to finish before saving.", { isError: true });
      return;
    }

    // A 'slow' card that reached a videoId is a real, persisted video that is
    // merely still encoding — perfectly safe to attach to the feed.
    const readyVideos = uploadedVideos.filter(
      (v) => !v.uploadState || (v.uploadState === "slow" && v.videoId),
    );
    const skipped = uploadedVideos.length - readyVideos.length;

    if (!readyVideos.length) {
      setError("Upload at least one video");
      shopify.toast.show("Upload at least one video", { isError: true });
      return;
    }

    if (skipped > 0) {
      // Toast as well as the banner: the banner lives inside the Uploads panel,
      // which is now always mounted but display:none on the Settings tab.
      const msg = `${skipped} video(s) could not be saved. Retry them and save again.`;
      setError(msg);
      // Survive the redirect: the success branch clears setError, so without
      // this the partial save would end up reported as a clean success.
      skippedWarningRef.current = msg;
    }

    const values = watch();
    submit(
      {
        feedName: values.feedName,
        widgetType: values.widgetType,
        isEnabled: values.isEnabled,
        widgetPage: values.widgetPage,
        customPagePath: values.customPagePath || "",
        settings: JSON.stringify(values.settings ?? { general: {}, design: {}, translation: {} }),
        videos: JSON.stringify(prepareVideosPayload(readyVideos)),
      },
      { method: "post" }
    );
    // No toast here — the server has not answered yet. See the effect below.
  }, [uploadedVideos, watch, submit, shopify]);

  // Report the ACTUAL result. Toasting synchronously after the non-awaited
  // submit() claimed success even when the action failed or dropped a video.
  const savedRef = useRef(false);
  // Carries a partial-save warning across the action's redirect.
  const skippedWarningRef = useRef(null);
  useEffect(() => {
    if (navigation.state === "submitting") {
      savedRef.current = true;
      return;
    }
    if (navigation.state !== "idle" || !savedRef.current) return;
    savedRef.current = false;

    const err = actionData?.error ?? (actionData?.success === false ? "Failed to save feed" : null);
    if (err) {
      setError(err);
      shopify.toast.show(err, { isError: true });
      return;
    }
    // A save that dropped videos is not a clean success — say so instead.
    if (skippedWarningRef.current) {
      const warning = skippedWarningRef.current;
      skippedWarningRef.current = null;
      setError(warning);
      shopify.toast.show(`Feed saved, but ${warning}`, { isError: true });
      setHasVideoChanges(false);
      return;
    }

    shopify.toast.show("Feed saved successfully", { isSuccess: true });
    // Drop any stale client-side error, or a warning from an earlier attempt
    // lingers in the banner next to a success toast.
    setError(null);
    // Clear the dirty flag rather than hiding the bar directly — the effect
    // above owns save-bar visibility and would immediately re-show it.
    setHasVideoChanges(false);
  }, [navigation.state, actionData, shopify]);

  const handleDiscard = useCallback(() => {
    // Discarding drops the placeholder cards, so abort anything still running —
    // otherwise the transfer keeps going against a card that no longer exists.
    uploadActionsRef.current?.cancel?.();
    reset(getFeedFormDefaultValues(feed));
    // Normalise, or every card degrades to "Untitled Video" / status unknown.
    setUploadedVideos((feed?.videos ?? []).map(normaliseFeedVideo));
    setHasVideoChanges(false);
    setError(null);
    shopify?.saveBar?.hide(SAVE_BAR_ID);
  }, [feed, reset, shopify]);

  const renderUploadsTab = () => (
    <Box padding="400">
      <BlockStack gap="400">
        <Text variant="headingMd" as="h2">Import Videos</Text>

        <VideoUploader
          setUploadedVideo={handleVideoUpload}
          onVideosFromLibrary={handleVideosFromLibrary}
          onUploadStart={handleUploadStart}
          onUploadProgress={handleUploadProgress}
          onUploadStateChange={handleUploadStateChange}
          onUploadReady={handleUploadReady}
          onUploadPending={handleUploadPending}
          onUploadFailed={handleUploadFailed}
          onUploadCancel={handleUploadCancel}
          uploadActionsRef={uploadActionsRef}
          shopData={shopData}
          remaining={remaining}
        />

        {uploadedVideos.length === 0 && <EmptyVideoState />}

        {uploadedVideos.length > 0 && (
          <BlockStack gap="300">
            <Text variant="headingMd" as="h2">Videos</Text>

            {error && (
              <Banner tone="critical" onDismiss={() => setError(null)}>
                {error}
              </Banner>
            )}

            <BlockStack gap="300">
              <Text variant="headingSm" as="h3">
                Uploaded Videos ({uploadedVideos.length})
              </Text>

              <InlineGrid columns={{ xs: 1, md: 3 }} gap="300">
                {uploadedVideos.map((video, index) => (
                  <Box
                    key={video.tempId ?? video.id ?? video.videoId ?? index}
                    padding="200"
                    borderRadius="200"
                    border="1px solid"
                    background="bg-fill-secondary"
                  >
                    <VideoDisplay
                      video={video}
                      index={index}
                      onRemove={() => handleRemoveVideo(index)}
                      onRetry={() => handleRetryVideo(index)}
                      shopify={shopify}
                      onTaggedProductsChange={handleTaggedProductsChange}
                      onFileNameChange={handleFileNameChange}
                    />
                  </Box>
                ))}
              </InlineGrid>
            </BlockStack>
          </BlockStack>
        )}
      </BlockStack>
    </Box>
  );

  return (
    <>
      <Page
        title={mode === "create" ? "Create Feed" : (feed?.feedName ?? "Feed")}
        subtitle={
          mode === "create"
            ? "Launch a new feed for your products"
            : "Change settings, products, and layout"
        }
        titleMetadata={
          <Badge tone="magic">{feed?.widgetType ?? "Carousel"}</Badge>
        }
        primaryAction={
          <InlineStack gap="200">
            <Badge
              tone={feed?.isEnabled ? "success" : "critical"}
              progress="complete"
              toneAndProgressLabelOverride="Status: Published. Your online store is visible."
            >
              {feed?.isEnabled ? "Active" : "Inactive"}
            </Badge>

            <Button
              onClick={configureInTheme}
              disabled={!feed?.id || isConfiguringTheme}
              loading={isConfiguringTheme}
            >
              Configure in theme
            </Button>

            <Button
              variant="primary"
              icon={ViewIcon}
              onClick={() => previewModalRef.current?.showOverlay?.()}
              disabled={!feed?.id}
            >
              Preview
            </Button>
          </InlineStack>
        }
      >
        <BlockStack gap="400">
          {actionData?.error && (
            <Banner tone="critical" onDismiss={() => { }}>
              {actionData.error}
            </Banner>
          )}

          <InlineGrid columns={{ xs: 1, md: "2fr 1fr" }} gap="400">
            <BlockStack gap="400">
              <Card padding="0">
                <BlockStack gap="300">
                  <Box padding="200">
                    <Tabs
                      tabs={WIDGET_TABS}
                      selected={activeTab}
                      onSelect={setActiveTab}
                      fitted
                    />
                  </Box>

                  {/* Rendered unconditionally and hidden via inline style.
                      Unmounting this panel unmounts VideoUploader, which aborts
                      the in-flight upload and strands the placeholder card.
                      Inline display beats Polaris' own display rules, which the
                      `hidden` attribute would not. */}
                  <div style={{ display: activeTab === 0 ? undefined : "none" }}>
                    {renderUploadsTab()}
                  </div>

                  {activeTab === 1 && (
                    <SettingsTab
                      control={control}
                      watch={watch}
                      errors={errors}
                      setValue={setValue}
                      selectedTab={settingsTab}
                      onTabChange={setSettingsTab}
                    />
                  )}
                </BlockStack>
              </Card>
            </BlockStack>

            <BlockStack gap="400">
              <Card>
                <AnalyticsTab feedId={feed?.id} />
              </Card>
            </BlockStack>
          </InlineGrid>
        </BlockStack>
      </Page>

      <s-modal
        ref={previewModalRef}
        id="feed-preview-modal"
        heading="Feed Preview"
        size="large"
        padding="none"
      >
        <div style={{ padding: 16 }}>
          <WidgetPreview watch={watch} feed={feed} />
        </div>
      </s-modal>

      <SaveBar id={SAVE_BAR_ID} discardConfirmation>
        <button
          variant="primary"
          onClick={handleSave}
          disabled={isSubmitting}
          {...(isSubmitting && { loading: "" })}
        />
        <button onClick={handleDiscard} disabled={isSubmitting} />
      </SaveBar>
    </>
  );
}