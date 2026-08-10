/* eslint-disable react/prop-types */
import {
  DropZone,
  Banner,
  Text,
  InlineStack,
  BlockStack,
  Thumbnail,
  Button,
} from "@shopify/polaris";
import { DeleteIcon } from "@shopify/polaris-icons";
import { useState, useCallback, useEffect, useRef } from "react";
import { VIDEO_CONFIG } from "../../lib/constants/video";

const MODAL_ID = "upload-from-device-modal";

/**
 * File picker only. The upload itself is owned by VideoUploader so it keeps
 * running (and keeps reporting progress into the video list) after this modal
 * closes — the merchant is not held hostage by a progress bar in a dialog.
 */
export default function UploadFromDeviceModal({ open, onClose, onStartUpload, remaining = 0 }) {
  const modalRef = useRef(null);
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const el = modalRef.current;
    if (!el) return;
    if (open) {
      el.showOverlay?.();
      setFile(null);
      setError(null);
    } else {
      el.hideOverlay?.();
    }
  }, [open]);

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
        setError(`File size must be less than ${VIDEO_CONFIG.MAX_SIZE_MB}MB`);
        return;
      }
      setFile(selectedFile);
      setError(null);
    },
    []
  );

  const handleRemoveFile = useCallback(() => {
    setFile(null);
    setError(null);
  }, []);

  // Hand the file off and close immediately — progress is shown on the video
  // card in the list, not here.
  const handleUpload = useCallback(() => {
    if (remaining <= 0) {
      setError("You have reached your video upload limit. Please upgrade your plan.");
      return;
    }
    if (!file) {
      setError("No file selected");
      return;
    }
    onStartUpload?.(file);
    setFile(null);
    setError(null);
    // hideOverlay fires 'afterhide', which already calls onClose — calling it
    // here too runs it twice.
    modalRef.current?.hideOverlay?.();
  }, [file, remaining, onStartUpload]);

  const fileUploadContent = !file && (
    <DropZone.FileUpload actionHint={`Accepts video files up to ${VIDEO_CONFIG.MAX_SIZE_MB}MB`} />
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
        <Button
          icon={DeleteIcon}
          variant="plain"
          onClick={handleRemoveFile}
          accessibilityLabel="Remove file"
        />
      </InlineStack>
    </BlockStack>
  );

  const isUploadDisabled = !file;

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
            Drag &amp; drop a video here or click to browse. Max {VIDEO_CONFIG.MAX_SIZE_MB}MB per file.
          </Text>
        </Banner>

        {error && (
          <Banner tone="critical" onDismiss={() => setError(null)}>
            {error}
          </Banner>
        )}

        {uploadedFilePreview}

        <DropZone onDrop={handleDropZoneDrop} accept="video/*">
          {fileUploadContent}
        </DropZone>
      </BlockStack>

      <s-button
        slot="primary-action"
        variant="primary"
        disabled={isUploadDisabled}
        onClick={handleUpload}
      >
        Start upload
      </s-button>
      <s-button
        slot="secondary-actions"
        variant="secondary"
        commandFor={MODAL_ID}
        command="--hide"
      >
        Cancel
      </s-button>
    </s-modal>
  );
}
