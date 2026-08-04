import { Avatar, BlockStack, InlineStack, Text, Tooltip } from "@shopify/polaris";

/**
 * TaggedProductsAvatars
 *
 * Read-only display of tagged products as overlapping avatars with a tooltip
 * listing all of them. No picker logic here — purely presentational.
 *
 * @param {Object} props
 * @param {Array<{ id, title?, image? }>} [props.selectedProducts]
 */
export default function TaggedProductsAvatars({ selectedProducts = [] }) {
  const products = Array.isArray(selectedProducts) ? selectedProducts : [];

  if (products.length === 0) return null;

  const firstProduct = products[0];
  const secondProduct = products[1];
  const hasTwoOrMore = products.length >= 2;
  const extraCount = products.length > 2 ? products.length - 1 : 0; // 3 -> +2, 5 -> +4

  const tooltipContent = (
    <BlockStack gap="200">
      {products.map((p) => (
        <InlineStack key={p?.id} gap="200" blockAlign="center">
          <Avatar
            source={p?.image ? p.image : undefined}
            initials={
              p?.image ? undefined : (p?.title || "?").slice(0, 1).toUpperCase()
            }
            accessibilityLabel={p?.title || "Product"}
          />
          <Text as="span" variant="bodySm">
            {p?.title || `Product ${p?.id ?? ""}`}
          </Text>
        </InlineStack>
      ))}
    </BlockStack>
  );

  return (
    <InlineStack gap="200" blockAlign="center">
      <Tooltip content={tooltipContent} width="wide">
        <Avatar
          source={firstProduct.image ? firstProduct.image : undefined}
          initials={
            firstProduct.image
              ? undefined
              : (firstProduct.title || String(firstProduct.id || "?"))
                  .slice(0, 1)
                  .toUpperCase()
          }
          accessibilityLabel={firstProduct.title || "Product 1"}
        />
      </Tooltip>
      {hasTwoOrMore && (
        <Tooltip content={tooltipContent} width="wide">
          <Avatar
            source={
              extraCount > 0
                ? undefined
                : secondProduct?.image
                  ? secondProduct.image
                  : undefined
            }
            initials={
              extraCount > 0
                ? `+${extraCount}`
                : secondProduct?.image
                  ? undefined
                  : (secondProduct?.title || String(secondProduct?.id || "?"))
                      .slice(0, 1)
                      .toUpperCase()
            }
            accessibilityLabel={
              extraCount > 0
                ? `${extraCount} more products`
                : secondProduct?.title || "Product 2"
            }
          />
        </Tooltip>
      )}
    </InlineStack>
  );
}

// TaggedProductsAvatars.propTypes = {
//   selectedProducts: PropTypes.arrayOf(
//     PropTypes.shape({    