import {
    Page,
    Button,
    Popover,
    ActionList,
    Modal,
    TextContainer,
    Frame,
    DropZone,
    Banner,
    ProgressBar,
    Text,
    InlineStack,
    BlockStack,
    Thumbnail,
    Icon,
  } from "@shopify/polaris";
  import { DeleteIcon } from "@shopify/polaris-icons";
  import { useState, useCallback } from "react";
  import { useFetcher } from "react-router";
  import * as UpChunk from "@mux/upchunk";
  
  export default function VideoUploader() {
    const [popoverActive, setPopoverActive] = useState(false);
    const [modalActive, setModalActive] = useState(false);
    const [file, setFile] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState(null);
    const [uploadComplete, setUploadComplete] = useState(false);
    const fetcher = useFetcher();
  
    // Toggle popover
    const togglePopover = useCallback(
      () => setPopoverActive((active) => !active),
      []
    );
  
    // Toggle modal
    const toggleModal = useCallback(() => {
      setModalActive((active) => !active);
      // Reset state when closing
      if (modalActive) {
        setFile(null);
        setUploadProgress(0);
        setIsUploading(false);
        setError(null);
        setUploadComplete(false);
      }
    }, [modalActive]);
  
    // Handle file drop/upload
    const handleDropZoneDrop = useCallback((_dropFiles, acceptedFiles) => {
      const selectedFile = acceptedFiles[0];
      
      // Validate file type
      if (!selectedFile.type.startsWith("video/")) {
        setError("Please select a valid video file");
        return;
      }
  
      // Validate file size (max 500MB)
      const maxSize = 500 * 1024 * 1024;
      if (selectedFile.size > maxSize) {
        setError("File size must be less than 500MB");
        return;
      }
  
      setFile(selectedFile);
      setError(null);
    }, []);
  
    // Action handlers
    const handleUploadVideo = useCallback(() => {
      setPopoverActive(false);
      setModalActive(true);
    }, []);
  
    const handleExportFile = useCallback(() => {
      setPopoverActive(false);
      console.log("Exported action");
    }, []);
  
    // Start upload process
    const handleUpload = useCallback(async () => {
      if (!file) {
        setError("Please select a video file");
        return;
      }
  
      setIsUploading(true);
      setError(null);
      setUploadProgress(0);
  
      try {
        // Step 1: Get upload URL from API
        const response = await fetch("/api/v1/video/upload", {
          method: "POST",
        });
  
        const data = await response.json();
  
        if (!response.ok) {
          throw new Error(data.error || "Failed to create upload");
        }
  
        // Step 2: Upload to Mux using UpChunk
        const upload = UpChunk.createUpload({
          endpoint: data.url,
          file,
          chunkSize: 30720, // 30MB chunks
        });
  
        upload.on("error", (err) => {
          setError(err.detail || "Upload failed");
          setIsUploading(false);
        });
  
        upload.on("progress", (progress) => {
          setUploadProgress(Math.floor(progress.detail));
        });
  
        upload.on("success", async () => {
          setUploadProgress(100);
          setUploadComplete(true);
          
          // Wait for processing
          setTimeout(async () => {
            // await pollAssetStatus(data.uploadId);
          }, 2000);
        });
      } catch (err) {
        setError(err.message || "Upload failed");
        setIsUploading(false);
      }
    }, [file]);
  
    // Poll for asset status
    const pollAssetStatus = async (uploadId) => {
      let attempts = 0;
      const maxAttempts = 30;
  
      const poll = async () => {
        try {
          // Note: You'll need to create this endpoint
          const response = await fetch(`/api/v1/video/upload/${uploadId}`);
          const uploadData = await response.json();
  
          if (uploadData.asset_id) {
            const assetResponse = await fetch(
              `/api/v1/video/asset/${uploadData.asset_id}`
            );
            const assetData = await assetResponse.json();
  
            if (assetData.status === "ready") {
              // Save to database via Remix action
              const formData = new FormData();
              formData.append("intent", "save-video");
              formData.append("assetId", assetData.id);
              formData.append("playbackId", assetData.playbackId);
              formData.append("duration", assetData.duration);
              formData.append("aspectRatio", assetData.aspectRatio);
              
              fetcher.submit(formData, { method: "post" });
              
              setIsUploading(false);
              
              // Close modal after 2 seconds
              setTimeout(() => {
                toggleModal();
              }, 2000);
              return;
            }
          }
  
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(poll, 2000);
          } else {
            setError("Video processing timed out");
            setIsUploading(false);
          }
        } catch (err) {
          setError("Failed to check video status");
          setIsUploading(false);
        }
      };
  
      poll();
    };
  
    // Remove selected file
    const handleRemoveFile = useCallback(() => {
      setFile(null);
      setError(null);
    }, []);
  
    const activator = (
      <Button onClick={togglePopover} disclosure>
        More actions
      </Button>
    );
  
    const fileUpload = !file && (
      <DropZone.FileUpload actionHint="Accepts video files up to 500MB" />
    );
  
    const uploadedFile = file && (
      <BlockStack gap="400">
        <InlineStack gap="400" blockAlign="center">
          <Thumbnail
            size="large"
            alt={file.name}
            source={
              file.type.startsWith("video/")
                ? "https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                : window.URL.createObjectURL(file)
            }
          />
          <div style={{ flex: 1 }}>
            <Text variant="bodyMd" as="p" fontWeight="semibold">
              {file.name}
            </Text>
            <Text variant="bodySm" as="p" tone="subdued">
              {(file.size / (1024 * 1024)).toFixed(2)} MB
            </Text>
          </div>
          <Button
            icon={DeleteIcon}
            onClick={handleRemoveFile}
            accessibilityLabel="Remove file"
            disabled={isUploading}
          />
        </InlineStack>
      </BlockStack>
    );
  
    return (
      <Frame>
        <Page title="Videos Library">
          <Popover
            active={popoverActive}
            activator={activator}
            autofocusTarget="first-node"
            onClose={togglePopover}
          >
            <ActionList
              actionRole="menuitem"
              items={[
                {
                  content: "Upload video",
                  onAction: handleUploadVideo,
                },
                {
                  content: "Export file",
                  onAction: handleExportFile,
                },
              ]}
            />
          </Popover>
  
          <Modal
            open={modalActive}
            onClose={toggleModal}
            title="Upload a new video"
            primaryAction={{
              content: isUploading
                ? uploadComplete
                  ? "Processing..."
                  : "Uploading..."
                : "Upload",
              onAction: handleUpload,
              loading: isUploading,
              disabled: !file || isUploading,
            }}
            secondaryActions={[
              {
                content: "Cancel",
                onAction: toggleModal,
                disabled: isUploading,
              },
            ]}
          >
            <Modal.Section>
              <BlockStack gap="400">
                {error && (
                  <Banner tone="critical" onDismiss={() => setError(null)}>
                    <p>{error}</p>
                  </Banner>
                )}
  
                {uploadComplete && !error && (
                  <Banner tone="success">
                    <p>Video uploaded successfully! Processing...</p>
                  </Banner>
                )}
  
                <DropZone
                  accept="video/*"
                  type="file"
                  onDrop={handleDropZoneDrop}
                  disabled={isUploading}
                  allowMultiple={false}
                >
                  {uploadedFile}
                  {fileUpload}
                </DropZone>
  
                {isUploading && (
                  <BlockStack gap="200">
                    <Text variant="bodyMd" as="p">
                      {uploadProgress < 100
                        ? `Uploading: ${uploadProgress}%`
                        : "Processing video..."}
                    </Text>
                    <ProgressBar
                      progress={uploadProgress}
                      size="small"
                      tone="primary"
                    />
                  </BlockStack>
                )}
  
                <TextContainer>
                  <p>
                    Upload your video to make it shoppable. You can tag products
                    after upload.
                  </p>
                  <Text variant="bodySm" as="p" tone="subdued">
                    Supported formats: MP4, MOV, AVI. Max size: 500MB
                  </Text>
                </TextContainer>
              </BlockStack>
            </Modal.Section>
          </Modal>
        </Page>
      </Frame>
    );
  }