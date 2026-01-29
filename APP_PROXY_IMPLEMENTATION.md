# App Proxy Implementation

## Overview

The feed selector now uses **Shopify App Proxy** instead of direct API calls. This eliminates CORS issues and simplifies authentication.

## How It Works

### Configuration (`shopify.app.toml`)

```toml
[access_scopes]
scopes = "write_products,write_app_proxy"

[app_proxy]
url = "/apps"
prefix = "apps"
subpath = "video-widget"
```

### URL Mapping

When a request is made to:
```
https://shop.myshopify.com/apps/video-widget/feeds/list?shop=shop.myshopify.com
```

Shopify automatically proxies it to:
```
https://your-app-url.com/apps/feeds/list?shop=shop.myshopify.com
```

### Routes Created

1. **`app/routes/apps+/feeds+/list.jsx`**
   - Handles: `GET /apps/feeds/list`
   - Accessible via: `/apps/video-widget/feeds/list`
   - Returns: List of feeds for the shop

2. **`app/routes/apps+/feeds+/$feedId.jsx`**
   - Handles: `GET /apps/feeds/:feedId`
   - Accessible via: `/apps/video-widget/feeds/:feedId`
   - Returns: Full feed data with videos

### Authentication

Both routes use:
```javascript
await authenticate.public.appProxy(request);
```

This automatically:
- Validates the request came from Shopify
- Verifies the shop parameter
- No manual authentication needed!

## Updated Files

### Theme Block (`extensions/video-cart/blocks/video-carousel.liquid`)

**Before:**
```javascript
const apiUrl = appUrl + '/api/v1/feeds/list?shop=' + shop;
```

**After:**
```javascript
const apiUrl = '/apps/video-widget/feeds/list?shop=' + shop;
```

✅ No app URL needed!
✅ No CORS issues!
✅ Works on same domain!

### Widget Runtime (`widgets/src/runtime.jsx`)

**Before:**
```javascript
const appUrl = window.__video_cart_app_url__ || window.location.origin;
const apiUrl = `${appUrl}/api/v1/feeds/${feedId}?shop=${shop}`;
```

**After:**
```javascript
const apiUrl = `/apps/video-widget/feeds/${feedId}?shop=${shop}`;
```

## Benefits

1. **No CORS Issues** - Requests are on the same domain
2. **No App URL Configuration** - Works automatically
3. **Automatic Authentication** - Shopify handles it
4. **Better Security** - Requests are validated by Shopify
5. **Simpler Code** - Less configuration needed

## Testing

### Test Feed List Endpoint

Visit in browser:
```
https://your-shop.myshopify.com/apps/video-widget/feeds/list?shop=your-shop.myshopify.com
```

Should return:
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "feedName": "My Feed",
      "widgetType": "carousel",
      "isEnabled": true,
      "videoCount": 5,
      "createdAt": "2026-01-27T..."
    }
  ]
}
```

### Test Feed Data Endpoint

Visit in browser:
```
https://your-shop.myshopify.com/apps/video-widget/feeds/FEED_ID?shop=your-shop.myshopify.com
```

Should return full feed data with videos.

## Deployment

1. **Update Scopes**: Run `shopify app deploy` to grant `write_app_proxy` scope
2. **Verify Routes**: Make sure routes exist at `app/routes/apps+/feeds+/`
3. **Test**: Visit the proxy URLs to verify they work

## Troubleshooting

### 404 Errors

- Check that routes exist: `app/routes/apps+/feeds+/list.jsx`
- Verify route exports `loader` function
- Check `shopify.app.toml` app_proxy configuration

### Authentication Errors

- Ensure `write_app_proxy` scope is granted
- Run `shopify app deploy` to update scopes
- Verify `authenticate.public.appProxy` is called

### Empty Responses

- Check that `shop` parameter is passed
- Verify feeds exist in database
- Check server logs for errors

## Migration from Direct API

If you were using direct API calls before:

1. ✅ Remove `window.__video_cart_app_url__` configuration
2. ✅ Update API URLs to use `/apps/video-widget/` prefix
3. ✅ Remove CORS headers (not needed with app proxy)
4. ✅ Test endpoints work via proxy URLs

## References

- [Shopify App Proxy Documentation](https://shopify.dev/docs/apps/build/online-store/app-proxies)
- [React Router App Proxy Guide](https://shopify.dev/docs/apps/build/online-store/app-proxies)
