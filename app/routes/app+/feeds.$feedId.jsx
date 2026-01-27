/**
 * GET/POST /app/feeds/:feedId
 * 
 * Edit or create a video feed.
 */

import {
  Page,
  Card,
  Text,
  TextField,
  ChoiceList,
  Banner,
  BlockStack,
  InlineGrid,
  InlineStack,
  Button,
} from "@shopify/polaris";
import { useEffect, useState, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { useAppBridge } from "@shopify/app-bridge-react";
import { SaveBar } from "@shopify/app-bridge-react";
import { authenticate } from "../../config/shopify.server";
import { getFeedById, createFeed, updateFeed } from "../../services/feed/feed.service";
import VideoUploader from "../../components/VideoUploader/VideoUploader";
import VideoDisplay from "../../components/VideoContainer/VideoContainer";
import { redirect, useLoaderData, useNavigation, useSubmit } from "react-router";

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
    const videos = JSON.parse(data.videos || "[]");

    if (params.feedId === "new") {
      const feed = await createFeed({
        feedName: data.feedName,
        shopDomain: session.shop,
        widgetType: data.widgetType,
        isEnabled: data.isEnabled === "true",
        videos,
      });

      return redirect(`/app/feeds/${feed.id}`);
    }

    await updateFeed(params.feedId, {
      feedName: data.feedName,
      widgetType: data.widgetType,
      isEnabled: data.isEnabled === "true",
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

  const {
    control,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    defaultValues: {
      feedName: feed?.feedName ?? "",
      widgetType: [feed?.widgetType ?? "carousel"],
      isEnabled: feed?.isEnabled ?? true,
    },
  });

  const widgetTypeOptions = [
    { label: "Carousel", value: "carousel" },
    { label: "Grid", value: "grid" },
  ];

  const hasChanges = isDirty || hasVideoChanges;
  const isSubmitting = navigation.state === "submitting";

  useEffect(() => {
    if (feed?.videos) {
      setUploadedVideos(feed.videos);
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

  const handleSave = useCallback(() => {
    if (!uploadedVideos.length) {
      setError("Upload at least one video");
      return;
    }

    const values = watch();

    submit(
      {
        feedName: values.feedName,
        widgetType: values.widgetType[0],
        isEnabled: values.isEnabled,
        videos: JSON.stringify(uploadedVideos),
      },
      { method: "post" }
    );

    // Hide save bar after successful save
    if (shopify?.saveBar) {
      shopify.saveBar.hide('feed-save-bar');
    }
  }, [uploadedVideos, watch, submit, shopify]);

  const handleDiscard = useCallback(() => {
    // Reset form to original values
    reset({
      feedName: feed?.feedName ?? "",
      widgetType: [feed?.widgetType ?? "carousel"],
      isEnabled: feed?.isEnabled ?? true,
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
                    {uploadedVideos.map((video, index) => (
                      <VideoDisplay
                        key={video.id || video.videoId || index}
                        video={video}
                        onRemove={() => handleRemoveVideo(index)}
                      />
                    ))}
                  </BlockStack>
                )}

                <VideoUploader setUploadedVideo={handleVideoUpload} />
              </BlockStack>
            </Card>
          </BlockStack>

          {/* Right Column: Settings */}
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">
                  Feed Settings
                </Text>

                <Controller
                  name="feedName"
                  control={control}
                  rules={{
                    required: "Feed name is required",
                    minLength: {
                      value: 3,
                      message: "Feed name must be at least 3 characters",
                    },
                  }}
                  render={({ field }) => (
                    <TextField
                      label="Feed Name"
                      placeholder="e.g., Homepage Video Feed"
                      autoComplete="off"
                      value={field.value}
                      onChange={field.onChange}
                      error={errors.feedName?.message}
                    />
                  )}
                />

                <Controller
                  name="widgetType"
                  control={control}
                  render={({ field }) => (
                    <ChoiceList
                      title="Widget Type"
                      choices={widgetTypeOptions}
                      selected={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />

                <Controller
                  name="isEnabled"
                  control={control}
                  render={({ field }) => (
                    <ChoiceList
                      title="Status"
                      choices={[
                        { label: "Enabled", value: true },
                        { label: "Disabled", value: false },
                      ]}
                      selected={[field.value]}
                      onChange={(value) => field.onChange(value[0])}
                    />
                  )}
                />
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <Text variant="headingSm" as="h3">
                  Summary
                </Text>
                <BlockStack gap="200">
                  <InlineStack align="space-between">
                    <Text variant="bodyMd" as="p" tone="subdued">
                      Videos
                    </Text>
                    <Text variant="bodyMd" as="p" fontWeight="semibold">
                      {uploadedVideos.length}
                    </Text>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text variant="bodyMd" as="p" tone="subdued">
                      Type
                    </Text>
                    <Text variant="bodyMd" as="p" fontWeight="semibold">
                      {watch("widgetType")[0] || "Not selected"}
                    </Text>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text variant="bodyMd" as="p" tone="subdued">
                      Status
                    </Text>
                    <Text variant="bodyMd" as="p" fontWeight="semibold">
                      {watch("isEnabled") ? "Enabled" : "Disabled"}
                    </Text>
                  </InlineStack>
                  {hasChanges && (
                    <Banner tone="warning">
                      <Text variant="bodySm">You have unsaved changes</Text>
                    </Banner>
                  )}
                </BlockStack>
              </BlockStack>
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
  