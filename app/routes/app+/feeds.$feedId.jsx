import {
  Page,
  Card,
  Text,
  Banner,
  BlockStack,
  InlineGrid,
  Tabs,
  Box,
  InlineStack,
  Icon,
} from "@shopify/polaris";
import {
  UploadIcon, SettingsIcon
} from '@shopify/polaris-icons';
import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { useAppBridge } from "@shopify/app-bridge-react";
import { SaveBar } from "@shopify/app-bridge-react";
import { authenticate } from "../../config/shopify.server";
import { getFeedById, createFeed, updateFeed } from "../../services/feed/feed.service.server";
import { prepareVideosPayload, isDuplicateVideoInWidget, filterDuplicateVideos } from "../../lib/utils/feed";
import VideoUploader from "../../components/VideoUploader/VideoUploader";
import VideoDisplay from "../../components/VideoContainer/VideoContainer";
import { redirect, useLoaderData, useNavigation, useSubmit, useActionData } from "react-router";
import { SettingsTab } from "../../components/SettingsTab";
import AnalyticsTab from "../../components/AnalyticsTab/AnalyticsTab";

export const loader = async ({ params, request }) => {
  try {
    const { session } = await authenticate.admin(request);

    if (params.feedId === "new") {
      return { mode: "create", feed: null };
    }

    const feed = await getFeedById(params.feedId, session.shop);
    return { mode: "edit", feed };
  } catch (error) {
    console.error('Feed loader error:', error);
    throw new Response("Feed not found", { status: 404 });
  }
};

export const action = async ({ params, request }) => {
  try {
    const { session } = await authenticate.admin(request);
    const formData = await request.formData();
    const data = Object.fromEntries(formData);
    const parsedVideos = JSON.parse(data.videos || "[]");
    const parsedSettings = data.settings ? JSON.parse(data.settings) : undefined;

    if (params.feedId === "new") {
      const feed = await createFeed({
        feedName: data.feedName,
        shopDomain: session.shop,
        widgetType: data.widgetType,
        isEnabled: data.isEnabled === "true",
        settings: parsedSettings,
        videos: parsedVideos,
      });

      return redirect(`/app/feeds/${feed.id}`);
    }

    await updateFeed(params.feedId, {
      feedName: data.feedName,
      widgetType: data.widgetType,
      isEnabled: data.isEnabled === "true",
      settings: parsedSettings,
      videos: parsedVideos,
    });

    return redirect(`/app/feeds/${params.feedId}`);
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to save feed' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

export default function FeedEditorPage() {
  const { mode, feed } = useLoaderData();
  const actionData = useActionData();
  const submit = useSubmit();
  const navigation = useNavigation();
  const shopify = useAppBridge();

  const [uploadedVideos, setUploadedVideos] = useState([]);
  const [error, setError] = useState(null);
  const [hasVideoChanges, setHasVideoChanges] = useState(false);
  const [selected, setSelected] = useState(0);
  const [settingsTabSelected, setSettingsTabSelected] = useState(0);

  const {
    control,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    defaultValues: {
      feedName: feed?.feedName ?? "",
      widgetType: feed?.widgetType ?? "carousel",
      isEnabled: feed?.isEnabled ?? true,
      settings: {
        general: feed?.settings?.general ?? {},
        design: feed?.settings?.design ?? {},
        translation: {
          carouselTitle: feed?.settings?.translation?.carouselTitle ?? feed?.settings?.carouselTitle ?? "",
          carouselDescription: feed?.settings?.translation?.carouselDescription ?? feed?.settings?.carouselDescription ?? "",
          addToCartText: feed?.settings?.translation?.addToCartText ?? feed?.settings?.addToCartText ?? "",
        },
      },
    },
  });

  const widgetTab = [
    {
      id: 'feeds-upload',
      index: 0,
      content: (
        <InlineStack gap="200" blockAlign="center">
          <Icon source={UploadIcon} />
          <span>Uploads</span>
        </InlineStack>
      ),
      panelID: 'feeds-uploads-content',
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
      panelID: 'feeds-settings-content',
    }
  ];

  const hasChanges = isDirty || hasVideoChanges;
  const isSubmitting = navigation.state === "submitting";

  useEffect(() => {
    if (feed?.videos) {
      setUploadedVideos(
        feed.videos.map((v) => {
          const video = v.video || {};
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
              (v.productsTagged || []).map((item) =>
                typeof item === "object" && item !== null
                  ? { ...item, id: item.id != null ? String(item.id) : "" }
                  : { id: String(item), title: "", image: null }
              ),
            productsTagged: v.productsTagged,
          };
        })
      );
    }
  }, [feed]);

  // Show/hide SaveBar based on changes
  useEffect(() => {
    if (!shopify) return;

    if (hasChanges) {
      shopify.saveBar.show('feed-save-bar');
    } else {
      shopify.saveBar.hide('feed-save-bar');
    }

    // Cleanup: hide on unmount
    return () => {
      if (shopify?.saveBar) {
        shopify.saveBar.hide('feed-save-bar');
      }
    };
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
        setError(duplicateCount > 0 ? `${duplicateCount} duplicate video(s) skipped — already in this widget.` : null);
      } else {
        setError(duplicateCount > 0 ? "All selected videos are already in this widget." : null);
      }
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
      prev.map((v, i) =>
        i === videoIndex ? { ...v, taggedProducts: products } : v
      )
    );
    setHasVideoChanges(true);
  }, []);

  const handleFileNameChange = useCallback((videoIndex, fileName) => {
    setUploadedVideos((prev) =>
      prev.map((v, i) =>
        i === videoIndex ? { ...v, fileName: fileName?.trim() || v.fileName || v.title } : v
      )
    );
    setHasVideoChanges(true);
  }, []);

  const handleSave = useCallback(() => {
    if (!uploadedVideos.length) {
      setError("Upload at least one video");
      return;
    }

    const values = watch();
    const videosPayload = prepareVideosPayload(uploadedVideos);
    const settingsPayload = values.settings ?? { general: {}, design: {}, translation: {} };

    submit(
      {
        feedName: values.feedName,
        widgetType: values.widgetType,
        isEnabled: values.isEnabled,
        settings: JSON.stringify(settingsPayload),
        videos: JSON.stringify(videosPayload),
      },
      { method: "post" }
    );

    // Hide save bar after successful save
    if (shopify?.saveBar) {
      shopify.saveBar.hide('feed-save-bar');
    }
  }, [uploadedVideos, watch, submit, shopify]);

  const handleTabChange = useCallback((selected) => {
    setSelected(selected);
  }, []);

  const handleSettingsTabChange = useCallback((index) => {
    setSettingsTabSelected(index);
  }, []);

  const handleDiscard = useCallback(() => {
    // Reset form to original values (same shape as defaultValues)
    reset({
      feedName: feed?.feedName ?? "",
      widgetType: feed?.widgetType ?? "carousel",
      isEnabled: feed?.isEnabled ?? true,
      settings: {
        general: feed?.settings?.general ?? {},
        design: feed?.settings?.design ?? {},
        translation: {
          carouselTitle: feed?.settings?.translation?.carouselTitle ?? feed?.settings?.carouselTitle ?? "",
          carouselDescription: feed?.settings?.translation?.carouselDescription ?? feed?.settings?.carouselDescription ?? "",
          addToCartText: feed?.settings?.translation?.addToCartText ?? feed?.settings?.addToCartText ?? "",
        },
      },
    });

    // Reset videos to original
    setUploadedVideos(feed?.videos || []);
    setHasVideoChanges(false);
    setError(null);

    // Hide save bar after discard
    if (shopify?.saveBar) {
      shopify.saveBar.hide('feed-save-bar');
    }
  }, [feed, reset, shopify]);

  const UploadsTab = () => {
    return (
      <Box padding="400">
        <BlockStack gap="400">
          <Text variant="headingMd" as="h2">Import Videos</Text>
          <VideoUploader
            setUploadedVideo={handleVideoUpload}
            onVideosFromLibrary={handleVideosFromLibrary}
          />
          <Text variant="headingMd" as="h2">
            Videos
          </Text>

          {error && (
            <Banner tone="critical" onDismiss={() => setError(null)}>
              {error}
            </Banner>
          )}

          {uploadedVideos.length > 0 && (
            <BlockStack gap="300">
              <Text variant="headingSm" as="h3">
                Uploaded Videos ({uploadedVideos.length})
              </Text>
              <InlineGrid columns={{ xs: 1, md: 3 }} gap="300">
                {uploadedVideos.map((video, index) => (
                  <VideoDisplay
                    key={video.id || video.videoId || index}
                    video={video}
                    index={index}
                    onRemove={() => handleRemoveVideo(index)}
                    shopify={shopify}
                    onTaggedProductsChange={handleTaggedProductsChange}
                    onFileNameChange={handleFileNameChange}
                  />
                ))}
              </InlineGrid>
            </BlockStack>
          )}
        </BlockStack>
      </Box>
    );
  };



  return (
    <>
      <Page
        title={mode === "create" ? "Create Feed" : "Edit Feed"}
        backAction={{ content: "Feeds", url: "/app/feeds" }}
      >
        <BlockStack gap="400">
          {actionData?.error && (
            <Banner tone="critical" onDismiss={() => { }}>
              {actionData.error}
            </Banner>
          )}
          <InlineGrid columns={{ xs: 1, md: "2fr 1fr" }} gap="400">
            {/* Left Column: Videos */}
            <BlockStack gap="400">
              <Card padding="0">
                <BlockStack gap="300">
                  <Tabs tabs={widgetTab} selected={selected} onSelect={handleTabChange} fitted />
                  {selected === 0 && <UploadsTab />}
                  {selected === 1 && (
                    <SettingsTab
                      control={control}
                      errors={errors}
                      selectedTab={settingsTabSelected}
                      onTabChange={handleSettingsTabChange}
                    />
                  )}
                </BlockStack>
              </Card>
            </BlockStack>

            {/* Right Column: Settings */}
            <BlockStack gap="400">
              <Card>
                <AnalyticsTab feedId={feed?.id} />
              </Card>
            </BlockStack>
          </InlineGrid>
        </BlockStack>
      </Page>

      <SaveBar id="feed-save-bar" discardConfirmation>
        <button
          variant="primary"
          onClick={handleSave}
          disabled={isSubmitting}
          {...(isSubmitting && { loading: "" })}
        />
        <button
          onClick={handleDiscard}
          disabled={isSubmitting}
        />
      </SaveBar>
    </>
  );
}
