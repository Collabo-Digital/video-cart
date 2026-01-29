import { createSignal, For, onMount, Show, createEffect } from 'solid-js';

export function VideoCarousel({ feed, videos, settings, widgetId, onEvent }) {
  console.log('feed of video carousel', feed);
  console.log('videos of video carousel', videos);
  console.log('settings of video carousel', settings);
  console.log('widgetId of video carousel', widgetId);
  console.log('onEvent of video carousel', onEvent);
  const [currentIndex, setCurrentIndex] = createSignal(0);
  const [videoRefs, setVideoRefs] = createSignal([]);

  // Get current video
  const currentVideo = () => videos?.[currentIndex()];

  // Handle next video
  const nextVideo = () => {
    if (currentIndex() < videos.length - 1) {
      const newIndex = currentIndex() + 1;
      setCurrentIndex(newIndex);
      onEvent?.('video_change', { 
        feedId: feed?.id, 
        videoId: videos[newIndex]?.id,
        index: newIndex 
      });
    }
  };

  // Handle previous video
  const prevVideo = () => {
    if (currentIndex() > 0) {
      const newIndex = currentIndex() - 1;
      setCurrentIndex(newIndex);
      onEvent?.('video_change', { 
        feedId: feed?.id, 
        videoId: videos[newIndex]?.id,
        index: newIndex 
      });
    }
  };

  // Handle video play
  const handlePlay = (videoId) => {
    onEvent?.('video_play', { feedId: feed?.id, videoId });
  };

  // Handle video pause
  const handlePause = (videoId) => {
    onEvent?.('video_pause', { feedId: feed?.id, videoId });
  };

  // Handle product click
  const handleProductClick = (productId) => {
    onEvent?.('product_click', { feedId: feed?.id, productId });
    // Navigate to product page
    if (productId) {
      window.location.href = `/products/${productId}`;
    }
  };

  // Get Mux playback URL
  const getPlaybackUrl = (playbackId) => {
    if (!playbackId) return null;
    return `https://stream.mux.com/${playbackId}.m3u8`;
  };

  // Auto-play current video when index changes
  createEffect(() => {
    // This effect runs whenever currentIndex() changes
    const idx = currentIndex();
    const refs = videoRefs();
    
    if (refs[idx] && settings?.autoplay) {
      // Small delay to ensure video element is ready
      setTimeout(() => {
        refs[idx]?.play().catch(err => {
          console.log('Autoplay prevented:', err);
        });
      }, 100);
    }
  });

  // Early return if no videos
  if (!videos || videos.length === 0) {
    return (
      <div style="padding: 40px; text-align: center; color: #6d7175;">
        <p>No videos available in this feed.</p>
      </div>
    );
  }

  return (
    <div className="video-carousel-container" style="position: relative; width: 100%;">
      {/* Main Video Display */}
      <div 
        className="video-carousel-main" 
        style="position: relative; width: 100%; background: #000; aspect-ratio: 16/9; overflow: hidden;"
      >
        <For each={videos}>
          {(video, index) => (
            <video
              ref={(el) => {
                if (el) {
                  const refs = videoRefs();
                  const idx = index();
                  refs[idx] = el;
                  setVideoRefs([...refs]);
                }
              }}
              src={getPlaybackUrl(video.playbackId)}
              controls={settings?.showControls !== false}
              autoPlay={settings?.autoplay && index() === currentIndex()}
              muted={settings?.autoplay}
              loop={false}
              style={{
                display: index() === currentIndex() ? 'block' : 'none',
                width: '100%',
                height: '100%',
                objectFit: 'contain'
              }}
              onPlay={() => handlePlay(video.id)}
              onPause={() => handlePause(video.id)}
            />
          )}
        </For>

        {/* Video Title */}
        <Show when={settings?.showTitle !== false && currentVideo()?.title}>
          <div style="position: absolute; bottom: 60px; left: 0; right: 0; padding: 16px; background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);">
            <h3 style="color: white; font-size: 18px; font-weight: 600; margin: 0;">
              {currentVideo()?.title}
            </h3>
          </div>
        </Show>

        {/* Navigation Arrows */}
        <Show when={videos.length > 1}>
          <button
            onClick={prevVideo}
            disabled={currentIndex() === 0}
            style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'rgba(255, 255, 255, 0.9)',
              border: 'none',
              borderRadius: '50%',
              width: '48px',
              height: '48px',
              cursor: currentIndex() === 0 ? 'not-allowed' : 'pointer',
              opacity: currentIndex() === 0 ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              fontWeight: 'bold'
            }}
          >
            ‹
          </button>
          <button
            onClick={nextVideo}
            disabled={currentIndex() === videos.length - 1}
            style={{
              position: 'absolute',
              right: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'rgba(255, 255, 255, 0.9)',
              border: 'none',
              borderRadius: '50%',
              width: '48px',
              height: '48px',
              cursor: currentIndex() === videos.length - 1 ? 'not-allowed' : 'pointer',
              opacity: currentIndex() === videos.length - 1 ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              fontWeight: 'bold'
            }}
          >
            ›
          </button>
        </Show>

        {/* Video Counter */}
        <Show when={videos.length > 1}>
          <div style="position: absolute; top: 16px; right: 16px; background: rgba(0, 0, 0, 0.7); color: white; padding: 8px 12px; border-radius: 20px; font-size: 14px;">
            {currentIndex() + 1} / {videos.length}
          </div>
        </Show>
      </div>

      {/* Tagged Products */}
      <Show when={currentVideo()?.productsTagged && currentVideo().productsTagged.length > 0}>
        <div style="padding: 20px; background: #f6f6f7;">
          <h4 style="font-size: 16px; font-weight: 600; margin: 0 0 12px 0; color: #202223;">
            Shop Products
          </h4>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 16px;">
            <For each={currentVideo()?.productsTagged || []}>
              {(productId) => (
                <button
                  onClick={() => handleProductClick(productId)}
                  style={{
                    padding: '12px',
                    background: 'white',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#d1d5db';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style="font-size: 14px; color: #202223; font-weight: 500;">
                    Product {productId}
                  </div>
                  <div style="font-size: 12px; color: #6d7175; margin-top: 4px;">
                    View →
                  </div>
                </button>
              )}
            </For>
          </div>
        </div>
      </Show>

      {/* Thumbnail Strip */}
      <Show when={videos.length > 1}>
        <div style="padding: 16px; background: #f6f6f7; overflow-x: auto;">
          <div style="display: flex; gap: 12px;">
            <For each={videos}>
              {(video, index) => (
                <button
                  onClick={() => {
                    setCurrentIndex(index());
                    onEvent?.('video_change', { feedId: feed?.id, videoId: video.id, index: index() });
                  }}
                  style={{
                    minWidth: '120px',
                    height: '68px',
                    background: index() === currentIndex() ? '#3b82f6' : '#e5e7eb',
                    border: index() === currentIndex() ? '2px solid #3b82f6' : '2px solid transparent',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    position: 'relative',
                    padding: 0
                  }}
                >
                  <Show when={video.playbackId}>
                    <img
                      src={`https://image.mux.com/${video.playbackId}/thumbnail.jpg?width=240&height=135`}
                      alt={video.title || `Video ${index() + 1}`}
                      style="width: 100%; height: 100%; object-fit: cover;"
                    />
                  </Show>
                  <Show when={index() === currentIndex()}>
                    <div style="position: absolute; inset: 0; background: rgba(59, 130, 246, 0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">
                      ●
                    </div>
                  </Show>
                </button>
              )}
            </For>
          </div>
        </div>
      </Show>
    </div>
  );
}
