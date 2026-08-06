import { useAppBridge } from "@shopify/app-bridge-react";
import { Button } from "@shopify/polaris";
import { ProductAddIcon } from "@shopify/polaris-icons";
import { useCallback } from "react";
import { toSelectionGid, normalizeProduct } from "../../lib/utils/resourcePicker";

/**
 * ResourcePicker
 *
 * Button that opens Shopify's Resource Picker to tag products (and variants)
 * for a video. Purely the picker trigger now — display of tagged products
 * lives in TaggedProductsAvatars. Selected products are passed to
 * onProductsSelected and persisted only when the feed is saved.
 *
 * @param {Object} props
 * @param {Array<{ id, variants? }>} [props.selectedProducts] - Currently tagged products (used to preselect in the picker)
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
        const variants =
          Array.isArray(p.variants) && p.variants.length > 0
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
        if (!selection || !Array.isArray(selection)) return;
        const normalized = selection.map(normalizeProduct);
        onProductsSelected?.(normalized);
      })
      .catch((err) => {
        console.error("Resource picker error:", err);
      });
  }, [appBridge, onProductsSelected, products]);

  return (
    <Button variant="primary" onClick={handleTagProducts} icon={ProductAddIcon}>
      Tag Products
    </Button>
  );
}