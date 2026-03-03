import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider as ShopifyAppProvider } from "@shopify/shopify-app-react-router/react";
import { FooterHelp, AppProvider as PolarisAppProvider, Text } from "@shopify/polaris";
import { authenticate } from "../../config/shopify.server";
import enTranslations from '@shopify/polaris/locales/en.json';
import polarisStyles from '@shopify/polaris/build/esm/styles.css?url';
import polarisVizStyles from '@shopify/polaris-viz/build/esm/styles.css?url';

export const links = () => [
  { rel: "stylesheet", href: polarisStyles },
  { rel: "stylesheet", href: polarisVizStyles },
];

export const loader = async ({ request }) => {
  await authenticate.admin(request);
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
