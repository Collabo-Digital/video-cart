import { render } from 'solid-js/web';
import { getWidget } from './core/registry';

export async function initFeeds() {
  
  const carouselWidget = getWidget('carousel');
  if (!carouselWidget) return;
  
  const Component = carouselWidget.component;
  
  for (const feedConfig of window.__video_cart_feeds__) {
    const { feedId, containerId, shop } = feedConfig;
    const container = document.getElementById(containerId);
    
    if (!container) continue;
    
    // Fetch feed data from API
    fetch(`/apps/video-widget/feeds/${feedId}?shop=${encodeURIComponent(shop)}`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(result => {
        if (result.success && result.data) {
          const feed = result.data;

          console.log("feed data", feed);
          
          // Render carousel widget with feed data
          render(
            () => Component({
              feed: feed,
              videos: feed.videos || [],
              settings: feed.settings || {},
            }),
            container
          );
        } else {
          console.error('Invalid feed response:', result);
        }
      })
      .catch(error => {
        console.error('Error fetching feed:', error);
        container.innerHTML = '<p>Error loading video feed</p>';
      });
  }
}