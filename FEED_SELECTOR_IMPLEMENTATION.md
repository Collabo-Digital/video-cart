# Feed Selector Implementation Guide

This document explains how the feed selector feature works in your Shopify app.

## Overview

The feed selector allows store owners to select a video feed from a dropdown in the Shopify theme editor. The selector is **only visible in the theme editor** (admin) and **does not appear on the storefront**. Once a feed is selected, the videos from that feed are displayed on the storefront.

## Architecture

### 1. API Endpoints

#### `/api/v1/feeds/list`
- **Purpose**: Lists all feeds for a shop (used by theme editor)
- **Method**: GET
- **Parameters**: `shop` (query parameter)
- **Returns**: Array of feed objects with basic info (id, name, type, video count, created date)

#### `/api/v1/feeds/:feedId`
- **Purpose**: Gets full feed data with videos for storefront rendering
- **Method**: GET
- **Parameters**: 
  - `feedId` (URL parameter)
  - `shop` (query parameter)
- **Returns**: Complete feed object with videos, settings, and metadata

### 2. Theme Block (`video-carousel.liquid`)

The block includes:

1. **Feed Selector UI** (visible only in `request.design_mode`):
   - Dropdown that loads feeds from `/api/v1/feeds/list`
   - Shows feed name and creation date
   - "Visible only to you" message
   - Save button to update the feed ID

2. **Block Setting**:
   - `feed_id` (text field) - stores the selected feed ID

3. **Storefront Rendering**:
   - Renders container for the widget
   - Initializes widget with feed ID
   - Widget fetches feed data and renders videos

### 3. Widget System (`widgets/`)

The SolidJS widget system:

1. **Detects feed containers** on the page via `data-feed-id` attributes
2. **Fetches feed data** from `/api/v1/feeds/:feedId`
3. **Renders appropriate widget** based on feed's `widgetType` (carousel/grid)

## How It Works

### In Theme Editor

1. Store owner opens theme editor and adds/edits the "Video Carousel" block
2. The feed selector dropdown appears (only visible to admin)
3. JavaScript fetches feeds from `/api/v1/feeds/list?shop={shop_domain}`
4. User selects a feed and clicks "Save"
5. Feed ID is saved to block settings
6. Block settings are saved via Shopify's theme editor

### On Storefront

1. Page loads with block containing `feed_id` setting
2. Widget bundle (`bundle-video-cart.iife.js`) loads
3. JavaScript detects feed containers via `data-feed-id` attributes
4. For each feed container:
   - Fetches feed data from `/api/v1/feeds/:feedId?shop={shop_domain}`
   - Renders appropriate widget (carousel/grid) with feed's videos
   - Applies feed settings (autoplay, controls, etc.)

## Setup Instructions

### 1. Configure App URL

Make sure your app URL is accessible. The feed selector needs to know where your app API is hosted.

**Option A**: Set app URL in Liquid (if available):
```liquid
{{ app.metafields.app_url }}
```

**Option B**: Set it in JavaScript:
```javascript
window.__video_cart_app_url__ = 'https://your-app-url.com';
```

### 2. Create Widget Components

You need to create SolidJS widget components for each widget type:

**Carousel Widget** (`widgets/src/components/VideoCarousel.jsx`):
```jsx
export function VideoCarousel({ feed, videos, settings, onEvent }) {
  // Your carousel implementation
  return (
    <div class="video-carousel">
      {/* Render videos in carousel format */}
    </div>
  );
}
```

**Grid Widget** (`widgets/src/components/VideoGrid.jsx`):
```jsx
export function VideoGrid({ feed, videos, settings, onEvent }) {
  // Your grid implementation
  return (
    <div class="video-grid">
      {/* Render videos in grid format */}
    </div>
  );
}
```

**Register widgets** in `widgets/src/main.jsx`:
```jsx
import { VideoCarousel } from './components/VideoCarousel';
import { VideoGrid } from './components/VideoGrid';

registerWidget({
  type: 'carousel',
  component: VideoCarousel,
});

registerWidget({
  type: 'grid',
  component: VideoGrid,
});
```

### 3. Build Widgets

```bash
cd widgets
npm install
npm run build
```

This builds `bundle-video-cart.iife.js` to `extensions/video-cart/assets/`

## Usage

### For Store Owners

1. Go to **Online Store > Themes > Customize**
2. Add or edit the **Video Carousel** block
3. In the feed selector dropdown, choose a feed
4. Click **Save** in the feed selector
5. Click **Save** in the theme editor
6. The selected feed's videos will appear on the storefront

### For Developers

#### Adding New Widget Types

1. Create widget component in `widgets/src/components/`
2. Register in `widgets/src/main.jsx`
3. Update feed's `widgetType` to use new type
4. Rebuild widgets: `npm run build` in `widgets/` directory

#### Customizing Feed Selector

The feed selector UI is in `extensions/video-cart/blocks/video-carousel.liquid` in the `{% if request.design_mode %}` section.

#### API Customization

- Feed list endpoint: `app/routes/api/v1/feeds/list.jsx`
- Feed data endpoint: `app/routes/api/v1/feeds/$feedId.jsx`

## Security Notes

- Feed list endpoint should validate shop domain
- Feed data endpoint validates shop ownership before returning data
- Both endpoints include CORS headers for storefront access
- Feed data is cached for 5 minutes to reduce API calls

## Troubleshooting

### Feed selector not loading
- Check that `/api/v1/feeds/list` is accessible
- Verify `shop` parameter is being passed correctly
- Check browser console for errors

### Videos not showing on storefront
- Verify `feed_id` is set in block settings
- Check that feed is enabled (`isEnabled: true`)
- Ensure feed has videos with `status: 'READY'`
- Check browser console for API errors
- Verify widget bundle is loaded

### Widget not rendering
- Ensure widget type is registered in `main.jsx`
- Check that widget component is properly exported
- Verify feed's `widgetType` matches registered widget type
- Rebuild widgets after making changes

## Future Enhancements

- [ ] Add feed preview in theme editor
- [ ] Support for dynamic feeds (context-aware)
- [ ] Add more widget types (masonry, list, etc.)
- [ ] Improve error handling and user feedback
- [ ] Add feed caching on storefront
- [ ] Support for feed-specific styling options
