import { useAppBridge } from "@shopify/app-bridge-react";
import { Avatar, BlockStack, Button, InlineStack, Text, Tooltip } from "@shopify/polaris";
import { useCallback } from "react";
import { toSelectionGid, normalizeProduct } from "../../lib/utils/resourcePicker";

/**
 * ResourcePicker
 *
 * Lets the user tag products (and variants) for a video via Shopify Resource Picker.
 * Shows up to two avatars for selected products; second avatar shows "+N" when more than two.
 * Selected products are passed to onProductsSelected and persisted only when feed is saved.
 *
 * @param {Object} props
 * @param {Array<{ id, title?, image?, variants? }>} [props.selectedProducts] - Currently tagged products
 * @param {function(Array): void} [props.onProductsSelected] - Callback with normalized product list
 */
export default function ResourcePicker({
  selectedProducts = [],
  onProductsSelected,
}) {
  const appBridge = useAppBridge();

  const products = Array.isArray(selectedProducts) ? selectedProducts : [];

  const handleTagProducts = useCallback(() => {
    const selectionIds = products
      .filter((p) => p?.id)
      .map((p) => {
        const productGid = toSelectionGid(p.id);
        const variants = Array.isArray(p.variants) && p.variants.length > 0
          ? p.variants.map((v) => ({
            id: String(v?.id).startsWith("gid://")
              ? v.id
              : `gid://shopify/ProductVariant/${v?.id ?? ""}`,
          }))
          : undefined;
        return variants ? { id: productGid, variants } : { id: productGid };
      });

    appBridge
      .resourcePicker({
        type: "product",
        multiple: true,
        selectionIds: selectionIds.length > 0 ? selectionIds : undefined,
      })
      .then((selection) => {
        console.log('selection', selection);
        if (!selection || !Array.isArray(selection)) return;
        const normalized = selection.map(normalizeProduct);
        onProductsSelected?.(normalized);
        console.log('normalized', normalized);
      })
      .catch((err) => {
        console.error("Resource picker error:", err);
      });
  }, [appBridge, onProductsSelected, products]);
  const firstProduct = products[0];
  const secondProduct = products[1];
  const hasTwoOrMore = products.length >= 2;
  const extraCount = products.length > 2 ? products.length - 1 : 0; // e.g. 3 products -> +2, 5 products -> +4

  const tooltipContent = (
    <BlockStack gap="200">
      {products.map((p) => (
        <InlineStack key={p?.id} gap="200" blockAlign="center">
          <Avatar
            source={p?.image ? p.image : undefined}
            initials={
              p?.image
                ? undefined
                : (p?.title || "?").slice(0, 1).toUpperCase()
            }
            accessibilityLabel={p?.title || "Product"}
          />
          <Text as="span" variant="bodySm">{p?.title || `Product ${p?.id ?? ""}`}</Text>
        </InlineStack>
      ))}
    </BlockStack>
  );

  return (
    <>
      <InlineStack align="space-between" blockAlign="center" gap="300">
        <InlineStack gap="200" blockAlign="center">
          {firstProduct && (
            <Tooltip content={tooltipContent} width="wide">
              <Avatar
                source={firstProduct.image ? firstProduct.image : undefined}
                initials={
                  firstProduct.image
                    ? undefined
                    : (firstProduct.title || String(firstProduct.id || "?")).slice(0, 1).toUpperCase()
                }
                accessibilityLabel={firstProduct.title || "Product 1"}
              />
            </Tooltip>
          )}
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
                      : (secondProduct?.title || String(secondProduct?.id || "?")).slice(0, 1).toUpperCase()
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
        <Button onClick={handleTagProducts}>Tag Products</Button>
      </InlineStack>
    </>
  );
}
