# Feed Selector Setup Guide

## ✅ Using App Proxy (Recommended)

The feed selector now uses **Shopify App Proxy**, which means:
- ✅ No CORS issues
- ✅ No need to configure app URL
- ✅ Automatic authentication
- ✅ Works seamlessly on storefront

The app proxy is already configured in `shopify.app.toml`:
```toml
[app_proxy]
url = "/apps"
prefix = "apps"
subpath = "video-widget"
```

This means:
- Theme editor calls: `/apps/video-widget/feeds/list?shop=...`
- Storefront calls: `/apps/video-widget/feeds/:feedId?shop=...`

Both proxy to your app routes at `/apps/feeds/list` and `/apps/feeds/:feedId`.

## Quick Fix for "Error loading feeds"

If you're still seeing errors, check:

### 1. Verify App Proxy Configuration

Make sure `shopify.app.toml` has:
```toml
[access_scopes]
scopes = "write_products,write_app_proxy"

[app_proxy]
url = "/apps"
prefix = "apps"
subpath = "video-widget"
```

### 2. Verify Routes Exist

Check that these routes exist:
- `app/routes/apps+/feeds+/list.jsx` - Lists feeds
- `app/routes/apps+/feeds+/$feedId.jsx` - Gets feed data

### 3. Test App Proxy

Visit in your browser (replace with your shop domain):
```
https://your-shop.myshopify.com/apps/video-widget/feeds/list?shop=your-shop.myshopify.com
```

Should return JSON with feeds.

## Testing

After setting the app URL:

1. Save the changes
2. Reload the theme editor
3. The feed selector should now load feeds from your API

## Troubleshooting

### Still seeing "Error loading feeds"?

1. **Check browser console** (F12) for the actual error message
2. **Verify app proxy is working**:
   - Visit: `https://your-shop.myshopify.com/apps/video-widget/feeds/list?shop=your-shop.myshopify.com`
   - Should return JSON with feeds
3. **Check app proxy configuration**:
   - Verify `write_app_proxy` scope is in `shopify.app.toml`
   - Run `shopify app deploy` to update scopes
4. **Verify shop parameter** - Make sure `{{ shop.permanent_domain }}` is working

### App proxy returns 404?

- Make sure routes exist at `app/routes/apps+/feeds+/list.jsx`
- Verify the route exports a `loader` function
- Check that `authenticate.public.appProxy(request)` is called

### Authentication errors?

- Ensure `write_app_proxy` scope is granted
- Check that `authenticate.public.appProxy` is imported correctly
- Verify the app proxy URL matches your `shopify.app.toml` configuration

## Next Steps

Once the feed selector is working:
1. Create feeds in your app admin (`/app/feeds`)
2. Select a feed in the theme editor
3. Save and preview your storefront
4. Videos should appear on the storefront!
