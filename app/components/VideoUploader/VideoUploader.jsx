// import {
//   DropZone,
//   Banner,
//   ProgressBar,
//   Text,
//   InlineStack,
//   BlockStack,
//   Thumbnail,
//   Button,
// } from "@shopify/polaris";
// import { DeleteIcon } from "@shopify/polaris-icons";
// import { useState, useCallback } from "react";
// import * as UpChunk from "@mux/upchunk";


// export default function VideoUploader({  setUploadedVideo }) {
//   const [file, setFile] = useState(null);
//   const [uploadProgress, setUploadProgress] = useState(0);
//   const [isUploading, setIsUploading] = useState(false);
//   const [error, setError] = useState(null);
//   const [uploadComplete, setUploadComplete] = useState(false);

//   // --- Handlers ---
//   const handleDropZoneDrop = useCallback((_dropFiles, acceptedFiles) => {
//     const selectedFile = acceptedFiles[0];

//     if (!selectedFile) {
//       setError("No file selected");
//       return;
//     }

//     if (!selectedFile.type.startsWith("video/")) {
//       setError("Please select a valid video file");
//       return;
//     }

//     const maxSize = 500 * 1024 * 1024;
//     if (selectedFile.size > maxSize) {
//       setError("File size must be less than 500MB");
//       return;
//     }

//     setFile(selectedFile);
//     setError(null);
//     setUploadComplete(false);
//     setUploadProgress(0);
//   }, []);

//   const handleRemoveFile = useCallback(() => {
//     setFile(null);
//     setError(null);
//     setUploadProgress(0);
//     setIsUploading(false);
//     setUploadComplete(false);
//   }, []);

//   const pollForPlaybackId = async (uploadId) => {
//     const maxAttempts = 20;
//     for (let i = 0; i < maxAttempts; i++) {
//       const res = await fetch(`/api/v1/videos/upload/${uploadId}`);
//       const result = await res.json();
  
//       console.log(`Attempt ${i+1}: Checking upload status:`, result);
  
//       if (result?.data?.playbackId && result.data.playbackId.length > 0) {
//         console.log("Success! Playback ID ready:", result.data.playbackId[0].id);
        
//         // Return normalized video object
//         return {
//           id: result.data.id, // Use the actual video ID from response
//           uploadId: uploadId,
//           assetId: result.data.assetId,
//           playbackId: result.data.playbackId[0].id, // Extract the actual playback ID string
//           playbackIdFull: result.data.playbackId[0], // Keep full object if needed
//           fileName: file.name,
//           status: result.data.status,
//           policy: result.data.playbackId[0].policy,
//         };
//       }
      
//       await new Promise(resolve => setTimeout(resolve, 2000));
//     }
//     throw new Error("Timeout waiting for playback ID");
//   };
//   const handleUpload = useCallback(async () => {
//     if (!file) {
//       setError("No file selected");
//       return;
//     }

//     setIsUploading(true);
//     setError(null);
//     setUploadProgress(0);

//     try {
//       // Get upload URL from server
//       const response = await fetch("/api/v1/videos/upload", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//       });

//       if (!response.ok) {
//         const errorData = await response.json().catch(() => ({}));
//         throw new Error(errorData.error || `Server error: ${response.status}`);
//       }

//       const data = await response.json();

//       // Handle nested response structure
//       const uploadUrl = data.data?.url || data.url;
//       const uploadId = data.data?.uploadId || data.uploadId;

//       if (!uploadUrl) {
//         throw new Error("Server did not return a valid upload URL");
//       }

//       // Create UpChunk upload
//       const upload = UpChunk.createUpload({
//         endpoint: uploadUrl,
//         file: file,
//         chunkSize: 512000,
//       });

//       // Handle upload events
//       upload.on("error", (err) => {
//         console.error("Upload error:", err);
//         setError(err.detail || err.message || "Upload failed");
//         setIsUploading(false);
//       });

//       upload.on("progress", (progress) => {
//         const percentage = Math.floor(progress.detail);
//         setUploadProgress(percentage);
//       });

//       upload.on("success", async() => {
//         setUploadProgress(100);
//         setUploadComplete(true);
//         setIsUploading(false);
//         console.log("Upload successful!");
//         try {
//           // Poll for playback ID using the existing API endpoint
//           const playbackData = await pollForPlaybackId(uploadId);
//           console.log("Playback data:", playbackData);
//           setUploadedVideo((prev) => [...prev, playbackData]);
//         } catch (err) {
//           setError("Upload succeeded, but failed to retrieve video for playback.");
//         }

//         // Reset after 2 seconds
//         setTimeout(() => {
//           handleRemoveFile();
//         }, 2000);
//       });
//     } catch (err) {
//       console.error("Upload initialization error:", err);
//       setError(err.message || "Failed to initialize upload");
//       setIsUploading(false);
//     }
//   }, [file]);

//   const fileUploadContent = !file && (
//     <DropZone.FileUpload actionHint="Accepts video files up to 500MB" />
//   );

//   const uploadedFilePreview = file && (
//     <BlockStack gap="400">
//       <InlineStack align="space-between" blockAlign="center">
//         <InlineStack gap="400" blockAlign="center">
//           <Thumbnail
//             size="large"
//             alt={file.name}
//             source={
//               file.type.startsWith("video/")
//                 ? window.URL.createObjectURL(file)
//                 : ""
//             }
//           />
//           <BlockStack gap="100">
//             <Text variant="bodyMd" fontWeight="semibold">
//               {file.name}
//             </Text>
//             <Text variant="bodySm" tone="subdued">
//               {(file.size / (1024 * 1024)).toFixed(2)} MB
//             </Text>
//           </BlockStack>
//         </InlineStack>
//         {!uploadComplete && (
//           <Button
//             icon={DeleteIcon}
//             variant="plain"
//             onClick={handleRemoveFile}
//             disabled={isUploading}
//           />
//         )}
//       </InlineStack>
//     </BlockStack>
//   );

//   return (
//     <BlockStack gap="400">
//       {error && (
//         <Banner title="Upload Error" tone="critical" onDismiss={() => setError(null)}>
//           <Text>{error}</Text>
//         </Banner>
//       )}

//       {uploadComplete && (
//         <Banner tone="success">
//           <Text>Upload complete! Video is being processed.</Text>
//         </Banner>
//       )}

//       {uploadedFilePreview}

//       <DropZone
//         onDrop={handleDropZoneDrop}
//         accept="video/*"
//         disabled={isUploading || uploadComplete}
//       >
//         {fileUploadContent}
//       </DropZone>

//       {isUploading && (
//         <BlockStack gap="200">
//           <ProgressBar progress={uploadProgress} size="small" />
//           <Text variant="bodySm" tone="subdued">
//             {uploadProgress}% uploaded
//           </Text>
//         </BlockStack>
//       )}

//       {file && !uploadComplete && (
//         <Button
//           variant="primary"
//           onClick={handleUpload}
//           loading={isUploading}
//           disabled={!file || isUploading}
//           fullWidth
//         >
//           Start Upload
//         </Button>
//       )}
//     </BlockStack>
//   );
// }

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