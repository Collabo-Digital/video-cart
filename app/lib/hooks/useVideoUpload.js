/**
 * useVideoUpload
 *
 * Drives a single device upload. The caller supplies callbacks so the upload can
 * keep running (and keep reporting) after the picker modal has closed — the
 * progress UI lives in the video list, not in the modal.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import * as UpChunk from '@mux/upchunk';
import { VIDEO_CONFIG } from '../constants/video';

// Mux direct-upload states from which an asset can never appear.
const TERMINAL_UPLOAD_STATUSES = new Set(['errored', 'cancelled', 'timed_out']);

export function useVideoUpload() {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);

  // Hold the UpChunk instance so an in-flight upload can actually be stopped.
  const uploadRef = useRef(null);
  // Monotonic run id. Every async continuation captures the value it started
  // with and bails if it no longer matches. A single boolean "cancelled" flag
  // stays true after a cancel and silently poisons the NEXT upload.
  const runIdRef = useRef(0);
  // The live run's callbacks, so an unmount can report the abort rather than
  // leaving the caller's card frozen at its last percentage forever.
  const handlersRef = useRef(null);

  const abortActive = useCallback(() => {
    runIdRef.current += 1;
    try {
      uploadRef.current?.abort?.();
    } catch {
      /* already finished */
    }
    uploadRef.current = null;
  }, []);

  /**
   * Stop whatever run is live and give its card a terminal state.
   * Every entry point must call this before claiming a new generation: bumping
   * runIdRef alone would silence the previous run's listeners while its UpChunk
   * handle kept transferring, stranding that card in 'uploading' or 'processing'
   * forever — which hard-blocks Save.
   *
   * Only ever reached when no byte transfer is live (both entry points refuse
   * otherwise), so this retires at most a polling run.
   */
  const retireActive = useCallback(() => {
    const previous = handlersRef.current;
    handlersRef.current = null;
    abortActive();
    previous?.onAborted?.();
  }, [abortActive]);

  useEffect(() => {
    return () => {
      const handlers = handlersRef.current;
      handlersRef.current = null;
      abortActive();
      // Tell the owner the transfer died with the component; otherwise the
      // placeholder card it created is stranded and blocks Save forever.
      handlers?.onAborted?.();
    };
  }, [abortActive]);

  const cancelUpload = useCallback(() => {
    handlersRef.current = null;
    abortActive();
    setIsUploading(false);
    setUploadProgress(0);
  }, [abortActive]);

  const buildVideo = useCallback(
    (data, uploadId, fileName) => ({
      // OUR Video.id — this is what the feed save resolves against. Returning
      // the Mux upload id here is what made fresh uploads unresolvable.
      id: data.videoId,
      videoId: data.videoId,
      uploadId,
      assetId: data.assetId,
      playbackId: data.playbackId[0].id,
      playbackIdFull: data.playbackId[0],
      fileName,
      // App vocabulary, never Mux's. Passing Mux's 'asset_created' straight
      // through is what pinned every upload on "Processing video…".
      status: data.assetStatus === 'ready' ? 'READY' : 'PROCESSING',
      policy: data.playbackId[0].policy,
    }),
    [],
  );

  /**
   * Poll our API until the asset is playable AND our Video row exists.
   * @param {string} uploadId - Mux upload id
   * @param {string} fileName - Display name for the resulting card
   * @param {number} runId - Generation this poll belongs to
   * @returns {Promise<Object>} {video?, ready?, pending?, cancelled?, error?} —
   *   `video` may be present with ready:false; it is still saveable, it is just
   *   not finished encoding.
   */
  const pollForPlaybackId = useCallback(
    async (uploadId, fileName, runId) => {
      let lastKnown = null;
      let consecutiveFailures = 0;

      // A transport failure must not destroy a video we already resolved: if the
      // row exists the card is still saveable, so degrade to 'pending' instead of
      // reporting a hard failure. Reserve {error} for uploads with nothing to keep.
      const bail = (message) =>
        lastKnown ? { video: lastKnown, ready: false, pending: true } : { error: message };

      for (let i = 0; i < VIDEO_CONFIG.MAX_POLL_ATTEMPTS; i++) {
        if (runIdRef.current !== runId) return { cancelled: true };
        try {
          const res = await fetch(`/api/v1/videos/upload/${uploadId}`);
          if (!res.ok) {
            // A hard server failure is not "still encoding". Retrying an auth or
            // not-found error for the whole budget and then reporting it as slow
            // tells the merchant a comforting lie.
            if (res.status === 401 || res.status === 403 || res.status === 404) {
              const body = await res.json().catch(() => ({}));
              return bail(body.error || `Could not check upload status (${res.status}).`);
            }
            if (++consecutiveFailures >= 3) {
              return bail('Could not reach the server to check this upload.');
            }
          } else {
            consecutiveFailures = 0;
            const data = (await res.json())?.data ?? {};

            // Mux gave up — stop burning the poll budget and say so, instead of
            // timing out into "Still processing…" forever.
            if (
              data.error ||
              TERMINAL_UPLOAD_STATUSES.has(data.status) ||
              data.assetStatus === 'errored'
            ) {
              // Terminal verdict from Mux. Flag it: re-polling this upload can
              // never succeed, so the card must offer a fresh upload, not a
              // "Check again" that loops forever.
              return {
                assetErrored: true,
                error:
                  data.error?.message ||
                  (typeof data.error === 'string' ? data.error : null) ||
                  'Mux could not process this video.',
              };
            }

            const playback = data.playbackId;
            if (Array.isArray(playback) && playback.length > 0 && data.videoId) {
              lastKnown = buildVideo(data, uploadId, fileName);
              if (data.assetStatus === 'ready') return { video: lastKnown, ready: true };
            }
          }
        } catch {
          // Transient network/JSON error — tolerate a blip, but do not spend the
          // whole budget on a connection that is plainly gone.
          if (++consecutiveFailures >= 3) {
            return { error: 'Could not reach the server to check this upload.' };
          }
        }
        await new Promise((resolve) => setTimeout(resolve, VIDEO_CONFIG.POLL_DELAY_MS));
      }

      // Budget spent. If we got as far as a row + playback id the video is
      // perfectly saveable, it is just still encoding.
      return { video: lastKnown, ready: false, pending: true };
    },
    [buildVideo],
  );

  const settlePoll = useCallback((result, handlers) => {
    if (result.cancelled) return;
    if (result.error) {
      handlers.onError?.(result.error, { assetErrored: !!result.assetErrored });
      return;
    }
    if (result.ready) {
      handlers.onReady?.(result.video);
      return;
    }
    // Not a failure: encoding is just slower than our poll budget.
    handlers.onPending?.(result.video ?? null);
  }, []);

  /**
   * Re-run the poll for an upload whose first attempt timed out ("Check again").
   * @param {string} uploadId - Mux upload id
   * @param {string} fileName - Display name for the resulting card
   * @param {Object} handlers - Same shape as uploadVideo's handlers
   */
  const repoll = useCallback(
    async (uploadId, fileName, handlers = {}) => {
      // A re-poll must never disturb a byte transfer. Without this, "Check
      // again" on one card would abort a different card's in-flight upload and
      // throw away everything already sent.
      if (uploadRef.current) {
        handlers.onBusy?.();
        return;
      }
      retireActive();
      const runId = (runIdRef.current += 1);
      handlersRef.current = handlers;
      setIsUploading(true);
      const result = await pollForPlaybackId(uploadId, fileName, runId);
      if (runIdRef.current !== runId) return;
      setIsUploading(false);
      handlersRef.current = null;
      settlePoll(result, handlers);
    },
    [pollForPlaybackId, settlePoll, retireActive],
  );

  /**
   * Upload a file.
   * @param {File} file
   * @param {Object} handlers
   * @param {(pct:number)=>void} [handlers.onProgress]
   * @param {(uploadId:string)=>void} [handlers.onUploaded] - bytes are in Mux; encoding now
   * @param {(video:Object)=>void} [handlers.onReady] - playable and persisted
   * @param {(video:Object|null)=>void} [handlers.onPending] - still encoding after the budget
   * @param {(msg:string)=>void} [handlers.onError]
   * @param {()=>void} [handlers.onAborted] - the owner unmounted mid-flight
   */
  const uploadVideo = useCallback(
    async (file, handlers = {}) => {
      // Refuse rather than displace: aborting a live transfer to start another
      // discards everything already sent and strands the other card.
      if (uploadRef.current) {
        handlers.onBusy?.();
        return;
      }
      retireActive();
      const runId = (runIdRef.current += 1);
      handlersRef.current = handlers;

      setIsUploading(true);
      setError(null);
      setUploadProgress(0);

      const fail = (msg) => {
        if (runIdRef.current !== runId) return;
        handlersRef.current = null;
        setError(msg);
        setIsUploading(false);
        handlers.onError?.(msg);
      };

      try {
        const fileName =
          file?.name && typeof file.name === 'string' ? file.name.trim() : 'Untitled Video';

        const response = await fetch('/api/v1/videos/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // fileSize lets the server reject oversized uploads before it spends a
          // Mux direct-upload URL on them.
          body: JSON.stringify({ fileName, fileSize: file?.size ?? null }),
        });

        const data = await response.json().catch(() => ({}));
        if (runIdRef.current !== runId) return;

        if (!response.ok) {
          fail(
            data.error ||
              (response.status === 409
                ? 'This video is already in your library.'
                : response.status === 403
                  ? 'You have reached your video upload limit.'
                  : `Server error: ${response.status}`),
          );
          return;
        }

        const uploadUrl = data.data?.url || data.url;
        const uploadId = data.data?.uploadId || data.uploadId;
        if (!uploadUrl) {
          fail('Server did not return a valid upload URL');
          return;
        }

        const upload = UpChunk.createUpload({
          endpoint: uploadUrl,
          file,
          chunkSize: VIDEO_CONFIG.CHUNK_SIZE,
        });
        uploadRef.current = upload;

        upload.on('error', (err) => {
          if (runIdRef.current !== runId) return;
          uploadRef.current = null;
          fail(err?.detail?.message || err?.detail || err?.message || 'Upload failed');
        });

        upload.on('progress', (progress) => {
          if (runIdRef.current !== runId) return;
          const pct = Math.floor(progress.detail);
          setUploadProgress(pct);
          handlers.onProgress?.(pct);
        });

        upload.on('success', async () => {
          if (runIdRef.current !== runId) return;
          uploadRef.current = null;
          setUploadProgress(100);
          handlers.onProgress?.(100);
          // Bytes are in Mux; it is encoding now. Hand back the uploadId so the
          // caller can offer "Check again" if the poll later times out.
          handlers.onUploaded?.(uploadId);

          const result = await pollForPlaybackId(uploadId, fileName, runId);
          if (runIdRef.current !== runId) return;
          setIsUploading(false);
          handlersRef.current = null;
          settlePoll(result, handlers);
        });
      } catch (err) {
        fail(err?.message || 'Failed to start upload');
      }
    },
    [pollForPlaybackId, settlePoll, retireActive],
  );

  return {
    uploadProgress,
    isUploading,
    error,
    setError,
    uploadVideo,
    cancelUpload,
    repoll,
  };
}
