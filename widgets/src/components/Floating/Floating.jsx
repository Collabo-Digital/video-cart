/* eslint-disable react/prop-types -- widget contract: feed, videos, settings, onEvent */
import { Show } from 'solid-js';
import { getThumbnailPreviewUrl } from '../../shared/mux';
import './floating.css';

export function VideoFloating({ feed, videos, settings, onEvent }) {
  const firstVideo = () => (Array.isArray(videos) && videos.length ? videos[0] : null);

  const title = () => settings?.translation?.floatingTitle || feed?.name || 'Watch now';

  const subtitle = () => {
    const count = videos?.length || 0;
    return `${count} video${count === 1 ? '' : 's'} available`;
  };

  const thumb = () => {
    const playbackId = firstVideo()?.playbackId;
    return playbackId ? getThumbnailPreviewUrl(playbackId, 320, 180) : null;
  };

  const openVideo = () => {
    const video = firstVideo();
    if (!video) return;
    onEvent?.('video_change', {
      feedId: feed?.id,
      videoId: video.id,
      index: 0,
      source: 'floating',
    });
  };

  return (
    <div className="video-floating">
      <Show when={firstVideo()} fallback={<div className="video-floating-empty">No videos available.</div>}>
        <button
          type="button"
          onClick={openVideo}
          className="video-floating-button"
          aria-label="Open featured video"
        >
          <div className="video-floating-thumb-wrap">
            <Show
              when={thumb()}
              fallback={<div className="video-floating-thumb video-floating-thumb-fallback" aria-hidden="true" />}
            >
              <img className="video-floating-thumb" src={thumb()} alt="" loading="lazy" />
            </Show>
            <div className="video-floating-thumb-overlay" />
            <span className="video-floating-play">▶</span>
          </div>

          <div className="video-floating-content">
            <div className="video-floating-title">{title()}</div>
            <div className="video-floating-subtitle">{subtitle()}</div>
          </div>
        </button>
      </Show>
    </div>
  );
}