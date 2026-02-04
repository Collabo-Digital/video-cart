/**
 * GET/POST /app/feeds/:feedId
 * 
 * Edit or create a video feed.
 */

import {
  Page,
  Card,
  Text,
  Banner,
  BlockStack,
  InlineGrid,
  Tabs,
} from "@shopify/polaris";
import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { useAppBridge } from "@shopify/app-bridge-react";
import { SaveBar } from "@shopify/app-bridge-react";
import { authenticate } from "../../config/shopify.server";
import { getFeedById, createFeed, updateFeed } from "../../services/feed/feed.service.server";
import { prepareVideosPayload } from "../../lib/utils/feed";
import VideoUploader from "../../components/VideoUploader/VideoUploader";
import VideoDisplay from "../../components/VideoContainer/VideoContainer";
import { redirect, useLoaderData, useNavigation, useSubmit } from "react-router";
import { Accordion } from "../../components/Accordion/Accordion";
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
    console.error('Feed action error:', error);
    throw new Response(
      JSON.stringify({ error: error.message || 'Failed to save feed' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export default function FeedEditorPage() {
  const { mode, feed } = useLoaderData();
  const submit = useSubmit();
  const navigation = useNavigation();
  const shopify = useAppBridge();

  const [uploadedVideos, setUploadedVideos] = useState([]);
  const [error, setError] = useState(null);
  const [hasVideoChanges, setHasVideoChanges] = useState(false);
  const [selected, setSelected] = useState(0);

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

  const tabs = [
    {
      id: 'feeds-settings',
      index: 0,
      content: 'Settings',
      accessibilityLabel: 'Settings',
      panelID: 'feeds-settings-content',
    },
    {
      id: 'feeds-analytics',
      index: 1,
      content: 'Analytics',
      panelID: 'feeds-analytics-content',
    },
  ];

  const hasChanges = isDirty || hasVideoChanges;
  const isSubmitting = navigation.state === "submitting";

  useEffect(() => {
    if (feed?.videos) {
      setUploadedVideos(
        feed.videos.map((v) => ({
          ...v,
          taggedProducts:
            v.taggedProducts ??
            (v.productsTagged || []).map((item) =>
              typeof item === "object" && item !== null
                ? { ...item, id: item.id != null ? String(item.id) : "" }
                : { id: String(item), title: "", image: null }
            ),
        }))
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

  const handleVideoUpload = useCallback((newVideo) => {
    setUploadedVideos((prev) => [...prev, newVideo]);
    setHasVideoChanges(true);
    setError(null);
  }, []);



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

  return (
    <>
      <Page
        title={mode === "create" ? "Create Feed" : "Edit Feed"}
        backAction={{ content: "Feeds", url: "/app/feeds" }}
      >
        <BlockStack gap="400">
          <InlineGrid columns={{ xs: 1, md: "2fr 1fr" }} gap="400">
            {/* Left Column: Videos */}
            <BlockStack gap="400">
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">Import Videos</Text>
                  <VideoUploader setUploadedVideo={handleVideoUpload} />
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
                          />
                        ))}
                      </InlineGrid>
                    </BlockStack>
                  )}


                </BlockStack>
              </Card>
            </BlockStack>

            {/* Right Column: Settings */}
            <BlockStack gap="400">
              <Card padding="0">
                <Tabs tabs={tabs} selected={selected} onSelect={handleTabChange} fitted />
              </Card>



              {selected === 0 && <Accordion control={control} errors={errors} />}
              {selected === 1 && <AnalyticsTab feedId={feed?.id} />}


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
