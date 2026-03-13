/* eslint-disable react/prop-types */
import {
  InlineStack,
  BlockStack,
  Button,
  ButtonGroup,
  InlineGrid,
  Box,
} from "@shopify/polaris";
import { useState, useCallback } from "react";
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
import { useAppBridge } from "@shopify/app-bridge-react";

export default function VideoUploader({
  setUploadedVideo,
  onVideosFromLibrary,
  shopData,
  remaining = 0,
}) {
  const appBridge = useAppBridge();
  const [igOpen, setIgOpen] = useState(false);
  const [ttOpen, setTtOpen] = useState(false);
  const [deviceOpen, setDeviceOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);

  const isAtLimit = remaining <= 0;

  console.log("shopData ----->", shopData);
  console.log("shopData?.planLimits?.videoUploadLimitReached ----->", shopData?.planLimits?.videoUploadLimitReached);

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
            setDeviceOpen(true);
          }}
          variant="secondary"
          icon={DesktopIcon}
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
        onUploaded={(video) => setUploadedVideo?.(video)}
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
