import { Grid, InlineGrid, InlineStack, Page } from "@shopify/polaris";
import { PricingCard } from "../../components/Pricing/Pricing";
import { authenticate } from "../../config/shopify.server";
import * as ShopModel  from "../../models/shop.server";
import { useLoaderData, useSearchParams } from "react-router";
import { APP_PAID_PLANS, APP_FREE_PLAN } from "../../lib/constants/common";
import { useEffect } from "react";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  try {
    const shopData = await ShopModel.findByDomain(session.shop);
    return { shopData };
  } catch (error) {
    console.error("Error fetching pricing:", error);
    return { shop: session.shop };
  }
};

export default function PricingPage() {
  const { shopData } = useLoaderData();
  const [searchParams] = useSearchParams();
  const chargeId = searchParams.get('charge_id');
  const currentPlan = shopData?.appPlan || 'free';

  useEffect(() => {
    if (chargeId) {
      const confirmCharge = async () => {
        const response = await fetch(
          `/api/v1/pricing/accpetSubscription?charge_id=${chargeId}`,
          { method: 'GET' }
        );
        const data = await response.json();
        console.log("accept/confirm result -->", data);
      };
      confirmCharge();
    }
  }, [chargeId, currentPlan]);

  return (
    <Page title="Pricing" subtitle="Choose the plan that's right for you">  
    <InlineStack gap="600" align="center" blockAlign="start">
      <Grid columns={{ xs: 1, sm: 2, md: 3, lg: 3 }} gap="400">
        {APP_PAID_PLANS.map((plan) => (
        <Grid.Cell columnSpan={{ xs: 1, sm: 1, md:1 , lg: 1 }} key={plan.id}>
        <PricingCard
          key={plan.id}
          title={plan.name}
          value={plan.value}
          featuredText={plan.name === currentPlan ? "Active Plan" : null}
          description={plan.description}
          features={plan.features}
          price={plan.price}
          frequency={plan.frequency}
        />
      </Grid.Cell>
      ))}
      <Grid.Cell columnSpan={{ xs: 1, sm: 2, md: 3, lg: 3 }}>
      <PricingCard
        key={APP_FREE_PLAN.id}
        title={APP_FREE_PLAN.name}
        value={APP_FREE_PLAN.value}
        featuredText={APP_FREE_PLAN.name === currentPlan ? "Active Plan" : null}
        description={APP_FREE_PLAN.description}
        features={APP_FREE_PLAN.features}
        price={APP_FREE_PLAN.price}
        frequency={APP_FREE_PLAN.frequency}
      />
      </Grid.Cell>
      </Grid>
      
      {/* <PricingCard
        title="Advanced"
        featuredText="Most Popular"
        description="For stores that are growing and need a reliable solution to scale with them"
        features={[
          "Process up to 10,000 orders/mo",
          "Amazing feature",
          "Another really cool feature",
          "24/7 Customer Support",
        ]}
        price="$49"
        frequency="month"
        button={{
          content: "Select Plan",
          props: {
            variant: "primary",
            onClick: () => console.log("clicked plan!"),
          },
        }}
      />
      <PricingCard
        title="Premium"
        description="The best of the best, for stores that have the highest order processing needs"
        features={[
          "Process up to 100,000 orders/mo",
          "Amazing feature",
          "Another really cool feature",
          "24/7 Customer Support",
        ]}
        price="$99"
        frequency="month"
        button={{
          content: "Select Plan",
          props: {
            variant: "primary",
            onClick: () => console.log("clicked plan!"),
          },
        }}
      /> */}
    </InlineStack>
    </Page>
  );
}
