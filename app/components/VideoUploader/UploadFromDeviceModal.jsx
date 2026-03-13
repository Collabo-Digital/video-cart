/* eslint-disable react/prop-types */
import {
  DropZone,
  Banner,
  ProgressBar,
  Text,
  InlineStack,
  BlockStack,
  Thumbnail,
  Button,
} from "@shopify/polaris";
import { DeleteIcon } from "@shopify/polaris-icons";
import { useState, useCallback, useEffect, useRef } from "react";
import { useVideoUpload } from "../../lib/hooks/useVideoUpload";
import { VIDEO_CONFIG } from "../../lib/constants/video";

const MODAL_ID = "upload-from-device-modal";

export default function UploadFromDeviceModal({ open, onClose, onUploaded, remaining = 0 }) {
  const modalRef = useRef(null);
  const [file, setFile] = useState(null);
  const [uploadComplete, setUploadComplete] = useState(false);
  const { uploadProgress, isUploading, error, setError, uploadVideo } = useVideoUpload();

  useEffect(() => {
    const el = modalRef.current;
    if (!el) return;
    if (open) {
      el.showOverlay?.();
      setFile(null);
      setUploadComplete(false);
      setError(null);
    } else {
      el.hideOverlay?.();
    }
  }, [open, setError]);

  useEffect(() => {
    const el = modalRef.current;
    if (!el) return;
    const handleAfterHide = () => onClose?.();
    el.addEventListener("afterhide", handleAfterHide);
    return () => el.removeEventListener("afterhide", handleAfterHide);
  }, [onClose]);

  const handleDropZoneDrop = useCallback(
    (_dropFiles, acceptedFiles) => {
      const selectedFile = acceptedFiles[0];
      if (!selectedFile) {
        setError("No file selected");
        return;
      }
      if (!selectedFile.type.startsWith("video/")) {
        setError("Please select a valid video file");
        return;
      }
      if (selectedFile.size > VIDEO_CONFIG.MAX_SIZE_BYTES) {
        setError("File size must be less than 500MB");
        return;
      }
      setFile(selectedFile);
      setError(null);
      setUploadComplete(false);
    },
    [setError]
  );

  const handleRemoveFile = useCallback(() => {
    setFile(null);
    setError(null);
    setUploadComplete(false);
  }, [setError]);

    const handleUpload = useCallback(async () => {
    if (remaining <= 0) {
      setError("You have reached your video upload limit. Please upgrade your plan.");
      return;
    }
    if (!file) {
      setError("No file selected");
      return;
    }
    try {
      await uploadVideo(file, (playbackData) => {
        onUploaded?.(playbackData);
        setUploadComplete(true);
        setTimeout(() => {
          handleRemoveFile();
          modalRef.current?.hideOverlay?.();
          onClose?.();
        }, VIDEO_CONFIG.RESET_DELAY_MS);
      });
    } catch (_err) {
      // Error is already set by the hook
    }
  }, [file, remaining, uploadVideo, onUploaded, onClose, handleRemoveFile, setError]);

  const fileUploadContent = !file && (
    <DropZone.FileUpload actionHint="Accepts video files up to 500MB" />
  );

  const uploadedFilePreview = file && (
    <BlockStack gap="400">
      <InlineStack align="space-between" blockAlign="center">
        <InlineStack gap="400" blockAlign="center">
          <Thumbnail
            size="large"
            alt={file.name}
            source={
              file.type.startsWith("video/")
                ? window.URL.createObjectURL(file)
                : ""
            }
          />
          <BlockStack gap="100">
            <Text variant="bodyMd" fontWeight="semibold">
              {file.name}
            </Text>
            <Text variant="bodySm" tone="subdued">
              {(file.size / (1024 * 1024)).toFixed(2)} MB
            </Text>
          </BlockStack>
        </InlineStack>
        {!uploadComplete && (
          <Button
            icon={DeleteIcon}
            variant="plain"
            onClick={handleRemoveFile}
            disabled={isUploading}
            accessibilityLabel="Remove file"
          />
        )}
      </InlineStack>
    </BlockStack>
  );

  const isUploadDisabled = !file || isUploading;

  return (
    <s-modal
      ref={modalRef}
      id={MODAL_ID}
      heading="Upload from device"
      size="large"
    >
      <BlockStack gap="400">
        <Banner tone="info">
          <Text variant="bodySm">
            Drag & drop a video here or click to browse. Max 500MB per file.
          </Text>
        </Banner>

        {error && (
          <Banner tone="critical" onDismiss={() => setError(null)}>
            {error}
          </Banner>
        )}

        {uploadComplete && (
          <Banner tone="success">
            <Text>Upload complete! Video is ready.</Text>
          </Banner>
        )}

        {uploadedFilePreview}

        <DropZone
          onDrop={handleDropZoneDrop}
          accept="video/*"
          disabled={isUploading || uploadComplete}
        >
          {fileUploadContent}
        </DropZone>

        {isUploading && (
          <BlockStack gap="200">
            <ProgressBar progress={uploadProgress} size="small" />
            <Text variant="bodySm" tone="subdued">
              {uploadProgress}% uploaded
            </Text>
          </BlockStack>
        )}
      </BlockStack>

      <s-button
        slot="primary-action"
        variant="primary"
        disabled={isUploadDisabled}
        onClick={handleUpload}
      >
        {isUploading ? "Uploading…" : "Start upload"}
      </s-button>
      <s-button
        slot="secondary-actions"
        variant="secondary"
        commandFor={MODAL_ID}
        command="--hide"
        disabled={isUploading}
      >
        Cancel
      </s-button>
    </s-modal>
  );
}
