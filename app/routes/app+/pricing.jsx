import { InlineStack, Page } from "@shopify/polaris";
import { PricingCard } from "../../components/Pricing/Pricing";
import { authenticate } from "../../config/shopify.server";
import  ShopModel  from "../../models/shop.server";
import { useLoaderData } from "react-router";
import { APP_PLANS } from "../../lib/constants/common";

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
  console.log("shopData ----->", shopData);
  const currentPlan = shopData?.appPlan || 'free';

  return (
    <Page title="Pricing">  
    <InlineStack gap="600" align="center" blockAlign="start">
      {APP_PLANS.map((plan) => (
        <PricingCard
          key={plan.id}
          title={plan.name}
          featuredText={plan.value === currentPlan ? "Active Plan" : null}
          description={plan.description}
          features={plan.features}
          price={plan.price}
          frequency={plan.frequency}
        />
      ))}
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
