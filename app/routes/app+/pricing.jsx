import { Grid, InlineStack, Page } from "@shopify/polaris";
import { useLoaderData, useRevalidator } from "react-router";

import { authenticate } from "../../config/shopify.server";
import { PricingCard } from "../../components/Pricing/Pricing";
import { captureRouteError } from "~/lib/utils/observability/errorCapture";
import { toClientShop } from "../../lib/dto/shop";
import { apiError, apiSuccess } from "../../lib/utils/apiResponse";
import {
  APP_BILLING_PLANS_NAMES,
  APP_FREE_PLAN,
  APP_PAID_PLANS,
  VIDEO_UPLOAD_LIMITS,
  VIDEO_VIEW_LIMITS,
} from "../../lib/constants/common";
import * as ShopModel from "../../models/shop.server";

export const loader = async ({ request }) => {
  const { billing, session } = await authenticate.admin(request);

  try {
    const chargeId = new URL(request.url).searchParams.get("charge_id");

    let shopData = await ShopModel.findByDomain(session.shop);
    // When Shopify redirects back after a plan selection, confirm and persist it
    if (chargeId) {
      const billingCheck = await billing.check({
        plans: APP_BILLING_PLANS_NAMES,
      });

      const planName = billingCheck?.appSubscriptions?.[0]?.name ?? "Free";
      
      if (planName && session.shop) {
        shopData = await ShopModel.updateByDomain(session.shop, {
          appPlan: planName,
          planLimits: {
            videoViewLimit: VIDEO_VIEW_LIMITS[planName.toLowerCase()],
            videoUploadLimit: VIDEO_UPLOAD_LIMITS[planName.toLowerCase()],
          },
        });
      }
    }
    // Strip the access token before it crosses to the client.
    return apiSuccess({ shopData: toClientShop(shopData) });
  } catch (error) {
    console.error("Error fetching pricing:", error);

    captureRouteError(error, {
      route: "pricing",
      url: request.url,
      method: request.method,
      shop: session?.shop ?? "unknown",
    });

    return apiError(error, {
      route: "pricing",
      code: "FETCH_PRICING_ERROR",
      statusCode: 500,
      requestId: request.id,
    });
  }
};


export default function PricingPage() {
  const { data } = useLoaderData();
  const revalidator = useRevalidator();
  const { shopData } = data;
  const currentPlan = shopData?.appPlan ?? "Free";

   const handlePlanChange = () => {
    revalidator.revalidate(); 
  };

  return (
    <Page title="Pricing" subtitle="Choose the plan that's right for you">
      <InlineStack gap="600" align="center" blockAlign="start">
        <Grid columns={{ xs: 1, sm: 2, md: 3, lg: 3 }} gap="400">
          {APP_PAID_PLANS.map((plan) => (
            <Grid.Cell
              key={plan.id}
              columnSpan={{ xs: 1, sm: 1, md: 1, lg: 1 }}
            >
              <PricingCard
                title={plan.name}
                value={plan.value}
                description={plan.description}
                features={plan.features}
                price={plan.price}
                frequency={plan.frequency}
                featuredText={plan.name === currentPlan ? "Active Plan" : null}
                onPlanChange={handlePlanChange}
              />
            </Grid.Cell>
          ))}

          <Grid.Cell columnSpan={{ xs: 1, sm: 2, md: 3, lg: 3 }}>
            <PricingCard
              title={APP_FREE_PLAN.name}
              value={APP_FREE_PLAN.value}
              description={APP_FREE_PLAN.description}
              features={APP_FREE_PLAN.features}
              price={APP_FREE_PLAN.price}
              frequency={APP_FREE_PLAN.frequency}
              featuredText={
                APP_FREE_PLAN.name === currentPlan ? "Active Plan" : null
              }
              onPlanChange={handlePlanChange}
            />
          </Grid.Cell>
        </Grid>
      </InlineStack>
    </Page>
  );
}