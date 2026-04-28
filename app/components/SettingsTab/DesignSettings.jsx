import {
  Text,
  Box,
  InlineGrid,
  BlockStack,
  TextField,
  InlineStack,
  Icon,
  Tooltip,
  RangeSlider,
  Select,
} from "@shopify/polaris";
import { InfoIcon } from "@shopify/polaris-icons";
import PropTypes from "prop-types";
import { Controller } from "react-hook-form";
import { WIDGET_TEMPLATES, getTemplatesForType } from "../../lib/constants/templates";

/**
 * Design settings tab. Placeholder for future design options.
 */
export function DesignSettings({ control, watch, errors = {} }) {
  const widgetType = watch("widgetType");

  return (
    <BlockStack gap="200">
      <Box padding="400" background="bg-surface-secondary" borderRadius="200">
        <BlockStack gap="400">
          <Text as="p" variant="bodyMd" fontWeight="semibold">
            Layout & Spacing
          </Text>
          <InlineGrid columns={{ xs: 1, md: 2 }} gap="300">

            <Controller
              name="settings.design.template"
              control={control}
              render={({ field }) => (
                <Select
                  label={
                    <InlineStack gap="200">
                      <Text as="p">Template</Text>
                      <Tooltip
                        dismissOnMouseOut
                        content="Choose the template you want to use for the widget."
                      >
                        <Icon source={InfoIcon} />
                      </Tooltip>
                    </InlineStack>
                  }
                  options={getTemplatesForType(widgetType).map((t) => ({ label: t.name, value: t.id }))}
value={field.value ?? getTemplatesForType(widgetType)[0].id}
                  onChange={field.onChange}
                />
              )}
            />

            <Controller
              name="settings.design.titleAlignment"
              control={control}
              render={({ field }) => (
                <Select
                  label={
                    <InlineStack gap="200">
                      <Text as="p">Widget Title Alignment</Text>
                      <Tooltip
                        dismissOnMouseOut
                        content="Choose the page where you want to display the widget."
                      >
                        <Icon source={InfoIcon} />
                      </Tooltip>
                    </InlineStack>
                  }
                  options={[
                    { label: "Start", value: "start" },
                    { label: "Center", value: "center" },
                    { label: "End", value: "end" },
                  ]}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />


            <Controller
              name="settings.design.cardCornerRadius"
              control={control}
              render={({ field }) => (
                <BlockStack gap="300">
                  <Text as="p">Card Corner Radius</Text>
                  <RangeSlider
                    // label="Card Corner Radius"
                    value={field.value}
                    onChange={(value) => field.onChange(value)}
                    output
                  />
                </BlockStack>
              )}
            />

            {
              (widgetType !== "floating") && (
                <Controller
                  name="settings.design.videoGap"
                  control={control}
                  render={({ field }) => (
                    <BlockStack gap="300">
                      <Text as="p">Video Gap</Text>
                      <RangeSlider
                        // label="Video Gap"
                        value={field.value}
                        onChange={(value) => field.onChange(value)}
                        output
                      />
                    </BlockStack>
                  )}
                />

              )
            }

            {
              (widgetType === "stories") && (
                <Controller
                  name="settings.design.ringColor"
                  control={control}
                  defaultValue="#000080"
                  render={({ field }) => (
                    <BlockStack gap="100">
                      <Text as="p">Ring Color</Text>
                      <s-color-field
                        placeholder="Select a color (e.g., #FF0000)"
                        value={field.value ?? "#000080"}
                        onInput={(e) =>
                          field.onChange(e.currentTarget?.value ?? field.value)
                        }
                        onChange={(e) =>
                          field.onChange(e.currentTarget?.value ?? field.value)
                        }
                      />
                    </BlockStack>
                  )}
                />
              )
            }
          </InlineGrid>
        </BlockStack>
      </Box>

      <Box padding="400" background="bg-surface-secondary" borderRadius="200">
        <BlockStack gap="400">
          <Text as="p" variant="bodyMd" fontWeight="semibold">
            Button Style
          </Text>
          <InlineGrid columns={{ xs: 1, md: 2 }} gap="300">
            <Controller
              name="settings.design.buttonBackgroundColor"
              control={control}
              defaultValue="#000080"
              render={({ field }) => (
                <BlockStack gap="100">
                  <Text as="p">Button Background Color</Text>
                  <s-color-field
                    placeholder="Select a color (e.g., #FF0000)"
                    value={field.value ?? "#000080"}
                    onInput={(e) =>
                      field.onChange(e.currentTarget?.value ?? field.value)
                    }
                    onChange={(e) =>
                      field.onChange(e.currentTarget?.value ?? field.value)
                    }
                  />
                </BlockStack>
              )}
            />
            <Controller
              name="settings.design.buttonTextColor"
              control={control}
              defaultValue="#ffffff"
              render={({ field }) => (
                <BlockStack gap="100">
                  <Text as="p">Button Text Color</Text>
                  <s-color-field
                    placeholder="Select a color (e.g., #FF0000)"
                    value={field.value ?? "#ffffff"}
                    onInput={(e) =>
                      field.onChange(e.currentTarget?.value ?? field.value)
                    }
                    onChange={(e) =>
                      field.onChange(e.currentTarget?.value ?? field.value)
                    }
                  />
                </BlockStack>
              )}
            />
          </InlineGrid>
          {/* <Text as="p" tone="subdued">
        Design options will be available here in a future update.
        
      </Text> */}
        </BlockStack>
      </Box>

      <Box padding="400" background="bg-surface-secondary" borderRadius="200">
        <BlockStack gap="400">
          <Text as="p" variant="bodyMd" fontWeight="semibold">
            Custom Styles
          </Text>
          <InlineGrid columns={{ xs: 1, md: 1 }} gap="300">
            <Controller
              name="settings.design.uniqueClassIdentifier"
              control={control}
              render={({ field }) => (
                <TextField
                  label={
                    <InlineStack gap="200">
                      <Text as="p">Unique class identifier</Text>
                      <Tooltip
                        dismissOnMouseOut
                        content="Give your feed a name to help you identify it."
                      >
                        <Icon source={InfoIcon} />
                      </Tooltip>
                    </InlineStack>
                  }
                  placeholder="e.g., video-cart-widget"
                  autoComplete="off"
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.uniqueClassIdentifier?.message}
                />
              )}
            />
            <Controller
              name="settings.design.customCss"
              control={control}
              render={({ field }) => (
                <TextField
                  label={
                    <InlineStack gap="200">
                      <Text as="p">Custom CSS</Text>
                      <Tooltip
                        dismissOnMouseOut
                        content="Add custom CSS to the widget."
                      >
                        <Icon source={InfoIcon} />
                      </Tooltip>
                    </InlineStack>
                  }
                  placeholder="e.g., .video-cart-widget { background-color: #000080; }"
                  multiline={4}
                  autoComplete="off"
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.customCss?.message}
                />
              )}
            />
          </InlineGrid>
        </BlockStack>
      </Box>
    </BlockStack>
  );
}

DesignSettings.propTypes = {
  control: PropTypes.object.isRequired,
  watch: PropTypes.func.isRequired,
  errors: PropTypes.object,
};
