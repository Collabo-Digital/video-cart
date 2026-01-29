# Troubleshooting 500 Error in App Proxy

## Current Issue

Getting 500 error when calling `/apps/video-widget/feeds/list`

## Debugging Steps

### 1. Check Server Logs

The most important step - check your terminal where `shopify app dev` is running. Look for:
- Error messages
- Stack traces
- Authentication errors

### 2. Test App Proxy is Working

First, test if app proxy works at all:

Visit in browser:
```
https://athul-kumar.myshopify.com/apps/video-widget/test?shop=athul-kumar.myshopify.com
```

Should return:
```json
{
  "success": true,
  "message": "App proxy is working!",
  "shop": "athul-kumar.myshopify.com"
}
```

### 3. Check App Proxy Configuration

Verify `shopify.app.toml`:
```toml
[access_scopes]
scopes = "write_products,write_app_proxy"

[app_proxy]
url = "/apps"
prefix = "apps"
subpath = "video-widget"
```

### 4. Grant App Proxy Scope

In development, you might need to:
1. Stop `shopify app dev`
2. Run `shopify app deploy` to update scopes
3. Restart `shopify app dev`

Or manually grant scope:
1. Go to Shopify Admin → Settings → Apps and sales channels
2. Find your app → Click "Configure"
3. Ensure "App proxy" permission is granted

### 5. Check Route Path

The route should be at:
- File: `app/routes/apps+/feeds+/list.jsx`
- Handles: `/apps/feeds/list`
- Accessible via: `/apps/video-widget/feeds/list`

### 6. Common Issues

#### Authentication Error
If you see "App proxy authentication not configured":
- Run `shopify app deploy` to grant `write_app_proxy` scope
- Restart `shopify app dev`
- Check server logs for auth errors

#### Route Not Found (404)
- Verify file exists: `app/routes/apps+/feeds+/list.jsx`
- Check route exports `loader` function
- Verify `shopify.app.toml` app_proxy config

#### Import Errors
- Check that `../../services/feed/feed.service` path is correct
- Verify service file exists
- Check for circular dependencies

### 7. Check Browser Console

In the theme editor, open browser console (F12) and look for:
- Network tab → Check the actual request/response
- Console tab → Look for JavaScript errors
- The error response should show `details` field in development mode

### 8. Verify Database Connection

The error might be from database:
- Check MongoDB connection
- Verify feeds exist in database
- Check Prisma client is working

## Quick Fixes

### Option 1: Temporarily Skip Auth (Development Only)

Edit `app/routes/apps+/feeds+/list.jsx`:

```javascript
export const loader = async ({ request }) => {
  try {
    // Temporarily skip auth in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('Skipping app proxy auth in development');
    } else {
      await authenticate.public.appProxy(request);
    }
    // ... rest of code
```

### Option 2: Check Actual Error

The error response now includes `details` field in development. Check the browser console or network tab to see the full error message.

## Next Steps

1. **Check server logs** - This will show the actual error
2. **Test simple route** - Visit `/apps/video-widget/test` to verify app proxy works
3. **Grant scope** - Run `shopify app deploy` if needed
4. **Check database** - Verify feeds exist and MongoDB is connected

## Getting More Info

The route now logs detailed error information. Check:
- Server terminal output
- Browser network tab → Response body
- Browser console → Error messages
