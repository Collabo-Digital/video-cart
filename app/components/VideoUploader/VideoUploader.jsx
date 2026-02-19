
/* eslint-disable react/prop-types */
import { InlineStack, BlockStack, Button, ButtonGroup, InlineGrid, Box } from "@shopify/polaris";
import { useState, useCallback } from "react";
import {
  LogoInstagramIcon, LogoTiktokIcon, DesktopIcon, BookIcon


} from '@shopify/polaris-icons';

import { SOCIAL_SOURCE } from "../../lib/constants/video";
import SocialImportModal from "./SocialImportModal";
import UploadFromDeviceModal from "./UploadFromDeviceModal";
import UploadFromLibraryModal from "./UploadFromLibraryModal";

export default function VideoUploader({ setUploadedVideo, onVideosFromLibrary }) {
  const [igOpen, setIgOpen] = useState(false);
  const [ttOpen, setTtOpen] = useState(false);
  const [deviceOpen, setDeviceOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);

  const handleLibrarySelected = useCallback(
    (videosOrSingle) => {
      if (Array.isArray(videosOrSingle) && videosOrSingle.length > 0) {
        onVideosFromLibrary?.(videosOrSingle);
      } else if (!Array.isArray(videosOrSingle)) {
        setUploadedVideo?.(videosOrSingle);
      }
    },
    [setUploadedVideo, onVideosFromLibrary]
  );

  return (
    <BlockStack gap="400">
        <ButtonGroup variant="segmented" fullWidth={true} >
          <Button onClick={() => setIgOpen(true)} variant="secondary" icon={LogoInstagramIcon}>
            Instagram
          </Button>
          <Button onClick={() => setTtOpen(true)} variant="secondary" icon={LogoTiktokIcon}>
            TikTok
          </Button>
          <Button onClick={() => setDeviceOpen(true)} variant="secondary" icon={DesktopIcon}>
            Device
          </Button>
          <Button onClick={() => setLibraryOpen(true)} variant="secondary" icon={BookIcon}>
            Library
          </Button>
        </ButtonGroup>

      <SocialImportModal
        source={SOCIAL_SOURCE.INSTAGRAM}
        open={igOpen}
        onClose={() => setIgOpen(false)}
        onImported={(video) => setUploadedVideo?.(video)}
      />

      <SocialImportModal
        source={SOCIAL_SOURCE.TIKTOK}
        open={ttOpen}
        onClose={() => setTtOpen(false)}
        onImported={(video) => setUploadedVideo?.(video)}
      />

      <UploadFromDeviceModal
        open={deviceOpen}
        onClose={() => setDeviceOpen(false)}
        onUploaded={(video) => setUploadedVideo?.(video)}
      />

      <UploadFromLibraryModal
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onSelected={handleLibrarySelected}
      />
    </BlockStack>
  );
}