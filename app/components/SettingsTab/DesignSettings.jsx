import { Text, Box, InlineGrid } from "@shopify/polaris";
import { Controller } from "react-hook-form";

/**
 * Design settings tab. Placeholder for future design options.
 */
export function DesignSettings({ control, errors = {} }) {
  return (
    <Box padding="400" background="bg-surface-secondary" borderRadius="200">
      <InlineGrid columns={{ xs: 1, md: 2 }} gap="300">
        <Controller
          name="settings.design.backgroundColor"
          control={control}
          defaultValue="#ffffff"
          render={({ field }) => (
            <s-color-field
              label="Add to Cart Button Color"
              placeholder="Select a color (e.g., #FF0000)"
              value={field.value ?? "#ffffff"}
              details="Color for the add to cart button"
              onInput={(e) => field.onChange(e.currentTarget?.value ?? field.value)}
              onChange={(e) => field.onChange(e.currentTarget?.value ?? field.value)}
            />
          )}
        />
      </InlineGrid>
      {/* <Text as="p" tone="subdued">
        Design options will be available here in a future update.
        
      </Text> */}
    </Box>
  );
}
