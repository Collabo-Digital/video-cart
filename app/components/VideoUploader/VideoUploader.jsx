/* eslint-disable react/prop-types */
import {
  BlockStack,
  Button,
  ButtonGroup,
} from "@shopify/polaris";
import { useState, useCallback, useRef, useEffect } from "react";
import {
  LogoInstagramIcon,
  LogoTiktokIcon,
  DesktopIcon,
  BookIcon,
} from "@shopify/polaris-icons";

import { SOCIAL_SOURCE } from "../../lib/constants/video";
import SocialImportModal from "./SocialImportModal";
import UploadFromDeviceModal from "./UploadFromDeviceModal";
import UploadFromLibraryModal from "./UploadFromLibraryModal";
import { useVideoUpload } from "../../lib/hooks/useVideoUpload";
import { useAppBridge } from "@shopify/app-bridge-react";

export default function VideoUploader({
  setUploadedVideo,
  onVideosFromLibrary,
  onUploadStart,
  onUploadProgress,
  onUploadStateChange,
  onUploadReady,
  onUploadPending,
  onUploadFailed,
  onUploadCancel,
  // Parent-owned ref: VideoUploader fills it with { cancel, retry, checkAgain }
  // so the buttons on the in-flight card (rendered by the parent) can drive the
  // upload that lives here.
  uploadActionsRef,
  remaining = 0,
}) {
  const appBridge = useAppBridge();
  const [igOpen, setIgOpen] = useState(false);
  const [ttOpen, setTtOpen] = useState(false);
  const [deviceOpen, setDeviceOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);

  // The upload lives here, not in the modal, so it survives the modal closing.
  const { isUploading, uploadVideo, cancelUpload, repoll } = useVideoUpload();
  const pendingIdRef = useRef(null);

  const isAtLimit = remaining <= 0;

  // Identical for a first attempt, a retry and a re-poll — build them once.
  const makeHandlers = useCallback(
    (tempId) => {
      // Only ever clear the live-run pointer if it still refers to THIS run.
      // Starting a new run retires the previous one, whose terminal callback
      // fires after the new tempId is already in place — an unconditional clear
      // would wipe the incoming run's identity.
      const releaseIfCurrent = () => {
        if (pendingIdRef.current === tempId) pendingIdRef.current = null;
      };

      return {
        onProgress: (pct) => onUploadProgress?.(tempId, pct),
        onUploaded: (uploadId) => onUploadStateChange?.(tempId, 'processing', { uploadId }),
        onReady: (video) => {
          releaseIfCurrent();
          onUploadReady?.(tempId, video);
        },
        onPending: (video) => {
          // Bytes are safely in Mux; encoding is just slower than our poll budget.
          // `video` is non-null once our Video row exists — the card IS saveable.
          releaseIfCurrent();
          onUploadPending?.(tempId, video);
        },
        onError: (msg, meta) => {
          releaseIfCurrent();
          // assetErrored means Mux rejected the asset — re-polling can never
          // succeed, so the card must offer a fresh upload instead.
          onUploadFailed?.(tempId, msg, { assetErrored: !!meta?.assetErrored });
        },
        // Defensive backstop only — the ref actions below refuse first. Must NOT
        // touch pendingIdRef: that still points at the genuinely live run.
        onBusy: () => {
          appBridge.toast.show('Another upload is in progress. Wait for it to finish.');
        },
        onAborted: () => {
          // Displaced by another run, or the uploader unmounted. Either way give
          // the card a terminal state instead of freezing it at its last
          // percentage, which would block Save forever.
          releaseIfCurrent();
          onUploadFailed?.(tempId, 'Upload was interrupted. Retry to try again.');
        },
      };
    },
    [onUploadProgress, onUploadStateChange, onUploadReady, onUploadPending, onUploadFailed, appBridge],
  );

  const startUpload = useCallback(
    (file, existingTempId) => {
      const tempId = existingTempId ?? `pending-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
      pendingIdRef.current = tempId;

      if (existingTempId) {
        onUploadStateChange?.(tempId, 'uploading', { progress: 0, uploadError: null });
      } else {
        // Show a placeholder card immediately so the merchant sees the upload
        // land in the list the moment the modal closes. The File rides along so
        // a failed transfer can be retried without re-picking it.
        onUploadStart?.({ tempId, fileName: file?.name || 'Untitled Video', file });
      }

      uploadVideo(file, makeHandlers(tempId));
    },
    [uploadVideo, makeHandlers, onUploadStart, onUploadStateChange],
  );

  const handleCancelUpload = useCallback(() => {
    const tempId = pendingIdRef.current;
    cancelUpload();
    pendingIdRef.current = null;
    if (tempId) onUploadCancel?.(tempId);
  }, [cancelUpload, onUploadCancel]);

  useEffect(() => {
    if (!uploadActionsRef) return;
    uploadActionsRef.current = {
      // Scoped by card: cancelUpload() aborts whatever run is live, so an
      // unscoped call from a stale 'failed'/'slow' card would kill an unrelated
      // in-flight upload AND delete the wrong card via onUploadCancel.
      cancel: (tempId) => {
        if (tempId && pendingIdRef.current && tempId !== pendingIdRef.current) return;
        handleCancelUpload();
      },
      // Both refuse while a run is live, BEFORE mutating any state — starting a
      // second run would abort the first card's transfer and strand it.
      // Transfer failed — re-upload from the File we kept on the card.
      retry: (tempId, file) => {
        if (!file) return;
        if (isUploading) {
          appBridge.toast.show('Another upload is in progress. Wait for it to finish.');
          return;
        }
        startUpload(file, tempId);
      },
      // Transfer succeeded but encoding outlasted the poll budget — just re-poll.
      checkAgain: (tempId, uploadId, fileName) => {
        if (isUploading) {
          appBridge.toast.show('Another upload is in progress. Wait for it to finish.');
          return;
        }
        pendingIdRef.current = tempId;
        onUploadStateChange?.(tempId, 'processing');
        repoll(uploadId, fileName, makeHandlers(tempId));
      },
    };
  }, [
    uploadActionsRef,
    handleCancelUpload,
    startUpload,
    repoll,
    makeHandlers,
    onUploadStateChange,
    isUploading,
    appBridge,
  ]);

  const handleLibrarySelected = useCallback(
    (videosOrSingle) => {
      if (Array.isArray(videosOrSingle) && videosOrSingle.length > 0) {
        onVideosFromLibrary?.(videosOrSingle);
      } else if (!Array.isArray(videosOrSingle)) {
        setUploadedVideo?.(videosOrSingle);
      }
    },
    [setUploadedVideo, onVideosFromLibrary],
  );

  return (
    <BlockStack gap="400">
      <ButtonGroup variant="segmented" fullWidth={true}>
        <Button
          onClick={() => {
            if (isAtLimit) {
              appBridge.toast.show(
                "You have reached your video upload limit. Please upgrade your plan.",
              );
              return;
            }
            setIgOpen(true);
          }}
          variant="secondary"
          icon={LogoInstagramIcon}
        >
          Instagram
        </Button>
        <Button
          onClick={() => {
            if (isAtLimit) {
              appBridge.toast.show(
                "You have reached your video upload limit. Please upgrade your plan.",
              );
              return;
            }
            setTtOpen(true);
          }}
          variant="secondary"
          icon={LogoTiktokIcon}
        >
          TikTok
        </Button>
        <Button
          onClick={() => {
            if (isAtLimit) {
              appBridge.toast.show(
                "You have reached your video upload limit. Please upgrade your plan.",
              );
              return;
            }
            if (isUploading) {
              appBridge.toast.show("An upload is already in progress.");
              return;
            }
            setDeviceOpen(true);
          }}
          variant="secondary"
          icon={DesktopIcon}
          disabled={isUploading}
        >
          Device
        </Button>
        <Button
          onClick={() => setLibraryOpen(true)}
          variant="secondary"
          icon={BookIcon}
        >
          Library
        </Button>
      </ButtonGroup>

      <SocialImportModal
        source={SOCIAL_SOURCE.INSTAGRAM}
        open={igOpen}
        onClose={() => setIgOpen(false)}
        onImported={(video) => setUploadedVideo?.(video)}
        remaining={remaining}
      />

      <SocialImportModal
        source={SOCIAL_SOURCE.TIKTOK}
        open={ttOpen}
        onClose={() => setTtOpen(false)}
        onImported={(video) => setUploadedVideo?.(video)}
        remaining={remaining}
      />

      <UploadFromDeviceModal
        open={deviceOpen}
        onClose={() => setDeviceOpen(false)}
        onStartUpload={(file) => startUpload(file)}
        remaining={remaining}
      />

      <UploadFromLibraryModal
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onSelected={handleLibrarySelected}
        remaining={remaining}
      />
    </BlockStack>
  );
}
