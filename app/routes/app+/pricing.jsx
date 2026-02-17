import { InlineStack, Page } from "@shopify/polaris";
import { PricingCard } from "../../components/Pricing/Pricing";
import { authenticate } from "../../config/shopify.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  return { shop: session.shop };
};

export default function PricingPage({ loaderData = {} }) {
  const { shop = "" } = loaderData;
  console.log("shop IMP 000000000000000000000000000000000000000000----->", shop);
  return (
    <Page title="Pricing">  
    <InlineStack gap="600" align="center" blockAlign="start">
      <PricingCard
        title="Free"
        description="This is a free plan for stores that are just starting out"
        features={[
          "Process up to 1,000 orders/mo",
          "100% free",
          "24/7 Customer Support",
        ]}
        price="Free"
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
      />
    </InlineStack>
    </Page>
  );
}
