/**
 * GET /theme-editor/feed-selector
 * 
 * Renders the feed selector UI for theme editor app_embed block.
 * This page is loaded in an iframe within the theme editor.
 * Returns HTML directly as a resource route.
 */

import { authenticate } from '../../config/shopify.server';
import { getFeedsByShop } from '../../services/feed/feed.service';

export const loader = async ({ request }) => {
  try {
    // Authenticate the request (theme editor requests are authenticated)
    const { session } = await authenticate.admin(request);
    
    // Fetch feeds for this shop
    const feeds = await getFeedsByShop(session.shop);

    // Format feeds for display
    const feedOptions = feeds
      .filter(feed => feed.isEnabled)
      .map((feed) => ({
        id: feed.id,
        name: feed.feedName,
        type: feed.widgetType,
        videoCount: feed.videos?.length || 0,
        createdAt: feed.createdAt,
      }));

    // Return HTML response
    const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Select Feed</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        padding: 16px;
        background: #f6f6f7;
      }
      .feed-selector {
        background: white;
        border-radius: 8px;
        padding: 16px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      }
      .feed-selector label {
        display: block;
        font-size: 13px;
        font-weight: 600;
        color: #202223;
        margin-bottom: 8px;
      }
      .feed-selector select {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 14px;
        background: white;
        color: #202223;
        cursor: pointer;
      }
      .feed-selector select:focus {
        outline: none;
        border-color: #008060;
        box-shadow: 0 0 0 1px #008060;
      }
      .feed-selector .info {
        margin-top: 8px;
        font-size: 12px;
        color: #6d7175;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .feed-selector .info-icon {
        width: 16px;
        height: 16px;
        opacity: 0.6;
        flex-shrink: 0;
      }
      .feed-selector .save-button {
        margin-top: 12px;
        padding: 8px 16px;
        background: #008060;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        width: 100%;
      }
      .feed-selector .save-button:hover {
        background: #006e52;
      }
      .feed-selector .save-button:disabled {
        background: #d1d5db;
        cursor: not-allowed;
      }
      .feed-selector .empty-state {
        text-align: center;
        padding: 24px;
        color: #6d7175;
        font-size: 14px;
      }
      .feed-selector .empty-state a {
        color: #008060;
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <div class="feed-selector">
      <label for="feed-select">Select feed</label>
      <select id="feed-select">
        <option value="">Loading feeds...</option>
      </select>
      <div class="info">
        <svg class="info-icon" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
        </svg>
        <span>Visible only to you. This selector will not appear on your storefront.</span>
      </div>
      <button class="save-button" id="save-button" disabled>Save</button>
    </div>
    <script>
      (function() {
        const shop = '${session.shop}';
        const feeds = ${JSON.stringify(feedOptions)};
        let currentFeedId = '';
        
        // Get current feed ID from URL params or try to get from Shopify block settings
        const urlParams = new URLSearchParams(window.location.search);
        currentFeedId = urlParams.get('feed_id') || '';
        
        const select = document.getElementById('feed-select');
        const saveButton = document.getElementById('save-button');
        
        // Populate dropdown
        function populateFeeds() {
          if (!feeds || feeds.length === 0) {
            select.innerHTML = '<option value="">No feeds available. <a href="/app/feeds/new" target="_blank">Create a feed</a> in your app.</option>';
            select.disabled = true;
            saveButton.disabled = true;
            return;
          }
          
          select.innerHTML = '<option value="">Select a feed...</option>';
          feeds.forEach(feed => {
            const option = document.createElement('option');
            option.value = feed.id;
            const date = new Date(feed.createdAt);
            const formattedDate = date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
            option.textContent = feed.name + ' (Created: ' + formattedDate + ')';
            
            if (feed.id === currentFeedId) {
              option.selected = true;
              saveButton.disabled = false;
            }
            
            select.appendChild(option);
          });
        }
        
        // Handle selection change
        select.addEventListener('change', function() {
          saveButton.disabled = !this.value;
        });
        
        // Handle save - communicate with Shopify theme editor
        saveButton.addEventListener('click', function() {
          const selectedFeedId = select.value;
          
          // Try to communicate with Shopify theme editor via postMessage
          if (window.parent && window.parent !== window) {
            try {
              window.parent.postMessage({
                type: 'shopify:block:update',
                feed_id: selectedFeedId
              }, '*');
            } catch (e) {
              console.log('Could not send message to parent:', e);
            }
          }
          
          // Update URL to persist selection
          const url = new URL(window.location);
          url.searchParams.set('feed_id', selectedFeedId);
          window.history.replaceState({}, '', url);
          
          // Show success feedback
          const originalText = saveButton.textContent;
          saveButton.textContent = 'Saved!';
          saveButton.style.background = '#008060';
          setTimeout(() => {
            saveButton.textContent = originalText;
          }, 2000);
        });
        
        // Initial population
        populateFeeds();
        
        // Listen for messages from theme editor (if available)
        window.addEventListener('message', function(event) {
          if (event.data && event.data.type === 'shopify:block:settings') {
            currentFeedId = event.data.feed_id || '';
            populateFeeds();
          }
        });
      })();
    </script>
  </body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    console.error('Feed selector loader error:', error);
    
    const errorHtml = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Error</title>
  </head>
  <body>
    <p>Error loading feed selector: ${error.message}</p>
  </body>
</html>`;
    
    return new Response(errorHtml, {
      status: 500,
      headers: {
        'Content-Type': 'text/html',
      },
    });
  }
};
