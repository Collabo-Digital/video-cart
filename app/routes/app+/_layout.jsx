import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider as ShopifyAppProvider } from "@shopify/shopify-app-react-router/react";
import {  FooterHelp, AppProvider as PolarisAppProvider, Text } from "@shopify/polaris";
import { authenticate } from "../../config/shopify.server";
import * as ShopModel from "../../models/shop.server";
import enTranslations from '@shopify/polaris/locales/en.json';
import polarisStyles from '@shopify/polaris/build/esm/styles.css?url';
import polarisVizStyles from '@shopify/polaris-viz/build/esm/styles.css?url';

export const links = () => [
  { rel: "stylesheet", href: polarisStyles },
  { rel: "stylesheet", href: polarisVizStyles },
];

/** How long /blocks/assign stays writable after the merchant uses the admin.
 *  Long enough to cover a whole theme-editing session. */
const THEME_SETUP_WINDOW_MS = 2 * 60 * 60 * 1000;

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  // /blocks/assign is storefront-reachable — app-proxy signing proves the
  // request came through this shop, not that it came from staff — so it only
  // accepts writes while this window is open. Refreshing it here means simply
  // having used the app recently is enough: a merchant who jumps straight to
  // the theme editor (the natural thing to do) can still pick a feed, while an
  // anonymous visitor still cannot write unless staff were just in the admin.
  ShopModel.updateByDomain(session.shop, {
    themeSetupUntil: new Date(Date.now() + THEME_SETUP_WINDOW_MS),
  }).catch(() => {
    // Never block rendering the admin over this.
  });

  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function AppLayout() {
  const { apiKey } = useLoaderData();

  return (
    <ShopifyAppProvider embedded apiKey={apiKey}>
      <PolarisAppProvider i18n={enTranslations}>
        <s-app-nav>
          <s-link href="/app">Home</s-link>
          <s-link href="/app/feeds">Feeds</s-link>
          <s-link href="/app/videos">Videos</s-link>
          <s-link href="/app/analytics">Analytics</s-link>
          <s-link href="/app/settings">Settings</s-link>
          <s-link href="/app/pricing">Pricing</s-link>
        </s-app-nav>
          <Outlet />
          <FooterHelp>
            <Text as="p" variant="bodySm" tone="subdued">All rights reserved © 2026 Video Cart. All rights reserved.</Text>
          </FooterHelp>
      </PolarisAppProvider>
    </ShopifyAppProvider>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
