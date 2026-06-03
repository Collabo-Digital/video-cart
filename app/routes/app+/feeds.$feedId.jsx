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
import { captureRouteError } from "~/lib/utils/observability/errorCapture";
import * as ShopModel from "../../models/shop.server";
import * as VideoModel from "../../models/video.server";
import { createFeed, getFeedById, updateFeed } from "../../services/feed/feed.service.server";

import { normaliseFeedVideo } from "../../lib/utils/common";
import AnalyticsTab from "../../components/AnalyticsTab/AnalyticsTab";
import { SettingsTab } from "../../components/SettingsTab/Index";
import VideoDisplay from "../../components/VideoContainer/VideoContainer";
import VideoUploader from "../../components/VideoUploader/VideoUploader";
import WidgetPreview from "../../components/WidgetPreview/WidgetPreview";


const SAVE_BAR_ID = "feed-save-bar";


export const loader = async ({ params, request }) => {
  const { session } = await authenticate.admin(request);
  try {

    const [totalVideos, shopData] = await Promise.all([
      VideoModel.count(session.shop),
      ShopModel.findByDomain(session.shop),
    ]);
    const uploadLimit = shopData?.planLimits?.videoUploadLimit ?? 0;
    const remaining = Math.max(0, uploadLimit - totalVideos);

    if (params.feedId === "new") {
      const url = new URL(request.url);
      return apiSuccess({
        mode: "create",
        feed: null,
        widgetType: url.searchParams.get("widgetType") ?? null,
        widgetPage: url.searchParams.get("widgetPage") ?? null,
        remaining,
      });
    }

    const feed = await getFeedById(params.feedId, session.shop);
    return apiSuccess({ mode: "edit", feed, shop: session.shop, remaining });
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
    });

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
  const { data } = useLoaderData();
  const { mode, feed, widgetType, widgetPage, remaining } = data;

  const actionData = useActionData();
  const navigation = useNavigation();
  const submit = useSubmit();
  const shopify = useAppBridge();
  const [shopData] = useLocalStorage("shopData", null);

  const [uploadedVideos, setUploadedVideos] = useState([]);
  const [error, setError] = useState(null);
  const [hasVideoChanges, setHasVideoChanges] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [settingsTab, setSettingsTab] = useState(0);

  const previewModalRef = useRef(null);

  const formValues = useMemo(
    () => getFeedFormDefaultValues(feed, widgetType, widgetPage),
    [feed, widgetType, widgetPage]
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

  const handleRemoveVideo = useCallback((index) => {
    setUploadedVideos((prev) => prev.filter((_, i) => i !== index));
    setHasVideoChanges(true);
  }, []);

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
    if (!uploadedVideos.length) {
      setError("Upload at least one video");
      shopify.toast.show("Upload at least one video", { isError: true });
      return;
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
        videos: JSON.stringify(prepareVideosPayload(uploadedVideos)),
      },
      { method: "post" }
    );

    shopify.toast.show("Feed saved successfully", { isSuccess: true });
    shopify?.saveBar?.hide(SAVE_BAR_ID);
  }, [uploadedVideos, watch, submit, shopify]);

  const handleDiscard = useCallback(() => {
    reset(getFeedFormDefaultValues(feed));
    setUploadedVideos(feed?.videos ?? []);
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
                    key={video.id ?? video.videoId ?? index}
                    padding="200"
                    borderRadius="200"
                    border="1px solid"
                    background="bg-fill-secondary"
                  >
                    <VideoDisplay
                      video={video}
                      index={index}
                      onRemove={() => handleRemoveVideo(index)}
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

                  {activeTab === 0 && renderUploadsTab()}

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