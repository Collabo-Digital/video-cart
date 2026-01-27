import { render } from 'solid-js/web';
import { getWidget } from './core/registry';

// Track rendered widgets
const renderedWidgets = new Set();

// Main render function
export function renderWidget(config) {
  if (renderedWidgets.has(config.id)) {
    console.warn(`Widget ${config.id} already rendered`);
    return;
  }
  
  const definition = getWidget(config.type);
  if (!definition) {
    console.error(`Widget type "${config.type}" not registered`);
    return;
  }
  
  // Create container
  const container = document.createElement('div');
  container.id = `widget-${config.id || "demo-id"}`;
  container.className = 'storefront-widget-container';
  
  // Apply positioning
  if (config.position) {
    container.style.cssText = `
      position: fixed;
      z-index: ${config.zIndex || 9999};
    `;
  }
  
  document.getElementById('video-carousel').appendChild(container);
  
  // Render Solid component
  const Component = definition.component;
  render(
    () => Component({
      config: config.config,
      widgetId: config.id,
      onEvent: (event, data) => handleEvent(config, event, data),
    }),
    container
  );
  
  renderedWidgets.add(config.id);
}

// Handle widget events
function handleEvent(config, event, data) {
  // Log in development
  if (import.meta.env.DEV) {
    console.log('Widget event:', { event, data, widgetId: config.id });
  }
  
  // Send to analytics if endpoint provided
  if (config.analyticsEndpoint) {
    fetch(config.analyticsEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        widgetId: config.id,
        event, 
        data,
        timestamp: Date.now(),
        shop: window.Shopify?.shop,
        page: window.location.pathname,
      }),
    }).catch(err => {
      console.error('Analytics error:', err);
    });
  }
}

// Initialize all widgets
export function initWidgets() {
  const config = window.__video_cart_config__;
  
  if (!config) {
    console.warn('No widget config found on window.__video_cart_config__');
    return;
  }
  
  // Handle single widget or array of widgets
  if (Array.isArray(config)) {
    config.forEach(widget => renderWidget(widget));
  } else {
    renderWidget(config);
  }
}

// Cleanup function (useful for SPAs)
export function cleanupWidgets() {
  renderedWidgets.forEach(widgetId => {
    const container = document.getElementById(`widget-${widgetId}`);
    if (container) {
      container.remove();
    }
  });
  renderedWidgets.clear();
}

// Get current page type
export function getCurrentPage() {
  const path = window.location.pathname;
  if (path === '/') return 'home';
  if (path.includes('/products/')) return 'product';
  if (path.includes('/collections/')) return 'collection';
  if (path.includes('/cart')) return 'cart';
  if (path.includes('/search')) return 'search';
  return 'other';
}

// Check if widget should render based on targeting
export function shouldRenderWidget(widget) {
  const currentPage = getCurrentPage();
  
  // Check page targeting
  if (widget.targeting?.pages) {
    if (!widget.targeting.pages.includes('all')) {
      if (!widget.targeting.pages.includes(currentPage)) {
        return false;
      }
    }
  }
  
  // Check device type
  if (widget.targeting?.deviceTypes) {
    const deviceType = getDeviceType();
    if (!widget.targeting.deviceTypes.includes(deviceType)) {
      return false;
    }
  }
  
  return true;
}

// Get device type
function getDeviceType() {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}