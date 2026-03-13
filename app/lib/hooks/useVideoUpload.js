/**
 * useVideoUpload
 * 
 * Custom hook for handling video upload workflow
 */

import { useState, useCallback } from 'react';
import * as UpChunk from '@mux/upchunk';
import { VIDEO_CONFIG } from '../constants/video';

/**
 * Custom hook for video upload
 * @returns {Object} Upload state and handlers
 */
export function useVideoUpload() {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Poll for playback ID from upload status
   * @param {string} uploadId - Upload ID
   * @param {string} fileName - File name
   * @returns {Promise<Object>} Video data with playback ID
   */
  const pollForPlaybackId = useCallback(async (uploadId, fileName) => {
    for (let i = 0; i < VIDEO_CONFIG.MAX_POLL_ATTEMPTS; i++) {
      const res = await fetch(`/api/v1/videos/upload/${uploadId}`);
      const result = await res.json();

      if (result?.data?.playbackId && result.data.playbackId.length > 0) {
        return {
          id: result.data.id,
          uploadId: uploadId,
          assetId: result.data.assetId,
          playbackId: result.data.playbackId[0].id,
          playbackIdFull: result.data.playbackId[0],
          fileName: fileName,
          status: result.data.status,
          policy: result.data.playbackId[0].policy,
        };
      }

      await new Promise((resolve) => setTimeout(resolve, VIDEO_CONFIG.POLL_DELAY_MS));
    }
    throw new Error("Timeout waiting for playback ID");
  }, []);

  /**
   * Upload video file
   * @param {File} file - Video file to upload
   * @param {Function} onSuccess - Success callback
   * @returns {Promise<void>}
   */
  const uploadVideo = useCallback(async (file, onSuccess) => {
    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const fileName = (file?.name && typeof file.name === 'string') ? file.name.trim() : 'Untitled Video';
      const response = await fetch("/api/v1/videos/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileName }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (data.code === 'DUPLICATE_VIDEO' || response.status === 409) {
          const msg = data.error || 'This video is already in your library.';
          setError(msg);
          setIsUploading(false);
          throw new Error(msg);
        }
        if (data.code === 'UPLOAD_LIMIT_REACHED' || response.status === 403) {
          const msg = data.error || 'You have reached your video upload limit.';
          setError(msg);
          setIsUploading(false);
          throw new Error(msg);
        }
        throw new Error(data.error || `Server error: ${response.status}`);
      }
      const uploadUrl = data.data?.url || data.url;
      const uploadId = data.data?.uploadId || data.uploadId;

      if (!uploadUrl) {
        throw new Error("Server did not return a valid upload URL");
      }

      console.log('file details ----->', file);

      // Create UpChunk upload
      const upload = UpChunk.createUpload({
        endpoint: uploadUrl,
        file: file,
        chunkSize: VIDEO_CONFIG.CHUNK_SIZE,
      });

      // Handle upload events
      return new Promise((resolve, reject) => {
        upload.on("error", (err) => {
          console.error("Upload error:", err);
          setError(err.detail || err.message || "Upload failed");
          setIsUploading(false);
          reject(err);
        });

        upload.on("progress", (progress) => {
          const percentage = Math.floor(progress.detail);
          setUploadProgress(percentage);
        });

        upload.on("success", async () => {
          setUploadProgress(100);
          setIsUploading(false);

          try {
            // Poll for playback ID
            const playbackData = await pollForPlaybackId(uploadId, file.name);
            onSuccess?.(playbackData);
            resolve(playbackData);
          } catch (err) {
            console.error("Failed to get playback ID:", err);
            setError("Upload succeeded, but failed to retrieve video playback information.");
            setIsUploading(false);
            reject(err);
          }
        });
      });
    } catch (err) {
      console.error("Upload initialization error:", err);
      setError(err.message || "Failed to initialize upload");
      setIsUploading(false);
      throw err;
    }
  }, [pollForPlaybackId]);

  return {
    uploadProgress,
    isUploading,
    error,
    setError,
    uploadVideo,
  };
}
