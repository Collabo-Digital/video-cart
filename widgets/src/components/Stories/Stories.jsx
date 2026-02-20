/* eslint-disable react/prop-types -- widget contract: feed, videos, settings, onEvent */
import { For, Show, createSignal } from 'solid-js';
import { getThumbnailPreviewUrl } from '../../shared/mux';
import './stories.css';

export function VideoStories({ feed, videos, settings, onEvent }) {
  const [activeIndex, setActiveIndex] = createSignal(0);

  const title = () => settings?.translation?.storiesTitle || feed?.name || 'Stories';

  const openStory = (video, index) => {
    setActiveIndex(index);
    onEvent?.('video_change', {
      feedId: feed?.id,
      videoId: video?.id,
      index,
      source: 'stories',
    });
  };

  return (
    <section className="video-stories">
      <Show when={title()}>
        <h3 className="video-stories-title">{title()}</h3>
      </Show>

      <Show
        when={Array.isArray(videos) && videos.length > 0}
        fallback={<p className="video-stories-empty">No stories available.</p>}
      >
        <div className="video-stories-list" role="list" aria-label="Video stories">
          <For each={videos}>
            {(video, index) => {
              const thumbUrl = () => getThumbnailPreviewUrl(video?.playbackId, 200, 200);
              const isActive = () => activeIndex() === index();

              return (
                <button
                  type="button"
                  className={`video-story ${isActive() ? 'is-active' : ''}`}
                  onClick={() => openStory(video, index())}
                  aria-label={video?.title || `Story ${index() + 1}`}
                >
                  <span className="video-story-ring">
                    <Show when={thumbUrl()} fallback={<span className="video-story-thumb video-story-thumb-fallback" />}>
                      <img className="video-story-thumb" src={thumbUrl()} alt="" loading="lazy" />
                    </Show>
                  </span>
                  <span className="video-story-label">{video?.title || `Story ${index() + 1}`}</span>
                </button>
              );
            }}
          </For>
        </div>
      </Show>
    </section>
  );
}