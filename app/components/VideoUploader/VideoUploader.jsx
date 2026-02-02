
/* eslint-disable react/prop-types */
import { InlineStack, BlockStack, Button } from "@shopify/polaris";
import { useState } from "react";
import { SOCIAL_SOURCE } from "../../lib/constants/video";
import SocialImportModal from "./SocialImportModal";
import UploadFromDeviceModal from "./UploadFromDeviceModal";

export default function VideoUploader({ setUploadedVideo }) {
  const [igOpen, setIgOpen] = useState(false);
  const [ttOpen, setTtOpen] = useState(false);
  const [deviceOpen, setDeviceOpen] = useState(false);

  return (
    <BlockStack gap="400">
      <InlineStack gap="300">
        <Button onClick={() => setIgOpen(true)}>
          Import from Instagram
        </Button>
        <Button onClick={() => setTtOpen(true)}>
          Import from TikTok
        </Button>
        <Button onClick={() => setDeviceOpen(true)}>
          Upload from device
        </Button>
      </InlineStack>

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
    </BlockStack>
  );
}