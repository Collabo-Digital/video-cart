import {
  Badge,
  BlockStack,
  Box,
  Button,
  Card,
  Icon,
  InlineStack,
  Text,
} from "@shopify/polaris";
import { StatusActiveIcon } from "@shopify/polaris-icons";
import { selectSubscription, cancelSubscription } from "../../lib/utils/api/pricingApi";

function PricingCardHeader({ title, price, featuredText, isFree, onAction }) {
  return (
    <BlockStack gap="400" align="center" blockAlign="center" inlineAlign="center">
      <Text as="h3" variant="headingLg">
        {title}
      </Text>

      <Text as="h2" variant="heading2xl">
        ${price}
        <Text as="span" variant="bodySm" tone="subdued">
          /month
        </Text>
      </Text>

      <Button
        fullWidth
        variant="primary"
        size="slim"
        disabled={!!featuredText}
        onClick={onAction}
      >
        {featuredText ? "Selected" : `Choose ${title}`}
      </Button>

      {isFree && (
        <Box
          paddingBlockStart="200"
          background="bg-surface-secondary"
          borderRadius="200"
          paddingInline="200"
          paddingBlock="100"
          width="100%"
        >
          <Text as="p" variant="bodyMd" fontWeight="semibold" alignment="center">
            Free forever
          </Text>
        </Box>
      )}
    </BlockStack>
  );
}

function FeatureList({ features }) {
  return (
    <BlockStack gap="200">
      <Text as="p" variant="bodyLg" fontWeight="semibold">
        Features
      </Text>
      {features?.map((feature, index) => (
        <InlineStack key={index} gap="200" align="start">
          <InlineStack gap="100" align="start">
          <Icon source={StatusActiveIcon} tone="success" />
          </InlineStack>
          <Text as="p" variant="bodyMd" tone="subdued">
            {feature}
          </Text>
        </InlineStack>
      ))}
    </BlockStack>
  );
}


export function PricingCard({
  title,
  value,
  featuredText,
  description,
  features,
  price,
}) {
  const isFree = value === "free";

  const handleSelectPlan = async () => {
    await selectSubscription(title);
  };

  const handleCancelPlan = async () => {
    await cancelSubscription(title);
  };

  const onAction = isFree ? handleCancelPlan : handleSelectPlan;

  return (
    <div style={{ position: "relative" }}>
      {featuredText && (
        <div
          style={{
            position: "absolute",
            top: "-8px",
            right: "15px",
            zIndex: 100,
          }}
        >
          <Badge size="large" tone="magic">
            {featuredText}
          </Badge>
        </div>
      )}

      <Card>
        {isFree ? (
          <InlineStack gap="400" blockAlign="start" align="start">
            <Box
              paddingBlockStart="200"
              borderInlineEndWidth="050"
              borderColor="border-disabled"
              paddingInlineEnd="600"
            >
              <PricingCardHeader
                title={title}
                price={price}
                featuredText={featuredText}
                isFree
                onAction={onAction}
              />
              {description && (
                <Box paddingBlockStart="200">
                  <Text as="p" variant="bodySm" tone="subdued">
                    {description}
                  </Text>
                </Box>
              )}
            </Box>

            <FeatureList features={features} />
          </InlineStack>
        ) : (
          <BlockStack gap="400">
            <PricingCardHeader
              title={title}
              price={price}
              featuredText={featuredText}
              isFree={false}
              onAction={onAction}
            />
            {description && (
              <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                {description}
              </Text>
            )}
            <FeatureList features={features} />
          </BlockStack>
        )}
      </Card>
    </div>
  );
}