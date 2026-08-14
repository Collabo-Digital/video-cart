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
import InfoTooltip from "../InfoTooltip/InfoTooltip.jsx";

/**
 * Design settings tab. Placeholder for future design options.
 */
export function DesignSettings({ control, watch, errors = {}, mode = "widget" }) {
  const widgetType = watch("widgetType");

  if (mode === "global") {
    return (
      <Box padding="400" background="bg-surface-secondary" borderRadius="200">
        <BlockStack gap="400">
          <BlockStack gap="100">
            <Text as="p" variant="bodyMd" fontWeight="semibold">
              Advanced styling
            </Text>
            <Text as="p" tone="subdued">
              Apply custom CSS to refine the appearance of Video Discovery on your storefront.
            </Text>
          </BlockStack>
          <InlineGrid columns={{ xs: 1, md: 1 }} gap="300">
            <Controller
              name="settings.design.uniqueClassIdentifier"
              control={control}
              render={({ field }) => (
                <TextField
                  label={
                    <InlineStack gap="200">
                      <Text as="p">Custom class name</Text>
                      <Tooltip
                        dismissOnMouseOut
                        content="Assign a unique CSS class to the Video Discovery component for targeted styling."
                      >
                        <Icon source={InfoIcon} />
                      </Tooltip>
                    </InlineStack>
                  }
                  placeholder="video-discovery-custom"
                  helpText="Use this class name to scope your CSS rules to Video Discovery only."
                  autoComplete="off"
                  value={field.value ?? ""}
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
                      <Text as="p">Custom stylesheet</Text>
                      <Tooltip
                        dismissOnMouseOut
                        content="Enter CSS rules to customize Video Discovery. Scope styles using your custom class name."
                      >
                        <Icon source={InfoIcon} />
                      </Tooltip>
                    </InlineStack>
                  }
                  placeholder=".video-discovery-custom .vc-discovery-trigger { font-weight: 600; }"
                  helpText="Supported selectors: .vc-discovery-trigger, .vc-discovery-label, .vc-discovery-floating, .vc-discovery-inline"
                  multiline={4}
                  autoComplete="off"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  error={errors.customCss?.message}
                />
              )}
            />
          </InlineGrid>
        </BlockStack>
      </Box>
    );
  }

  return (
    <BlockStack gap="200">
      <Box padding="400" background="bg-surface-secondary" borderRadius="200">
        <BlockStack gap="400">
          <Text as="p" variant="bodyMd" fontWeight="semibold">
            Layout & Spacing
          </Text>
          <InlineGrid columns={{ xs: 1, md: 2 }} gap="300">

            {mode === "widget" && (
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
            )}

            {mode === "widget" && (
              <Controller
                name="settings.design.titleAlignment"
                control={control}
                render={({ field }) => (
                  <Select
                    label={
                      <InlineStack gap="200">
                        <Text as="p">Widget Title Alignment</Text>
                        <InfoTooltip
                          content="Choose how the widget title is aligned within the video section."
                          items={[
                            { term: "Start", description: "The title is aligned to the left." },
                            { term: "Center", description: "The title is centered." },
                            { term: "End", description: "The title is aligned to the right." },
                          ]}
                          media={{
                            src: "/images/widget-alignment.webp",
                            alt: "Widget title aligned to the left above a row of video cards",
                          }}
                        />
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
            )}

           {mode === "widget" && <Controller
              name="settings.design.cardCornerRadius"
              control={control}
              render={({ field }) => (
                <BlockStack gap="300">
                  <RangeSlider
                    label={
                      <InlineStack gap="200">
                        <Text as="p">Card Corner Radius</Text>
                        <InfoTooltip
                          content="Adjust the roundness of the video card corners."
                          media={{
                            src: "/images/card-corner-radius.webp",
                            alt: "Video cards in a carousel with their rounded corners highlighted",
                          }}
                        />
                      </InlineStack>
                    }
                    value={field.value}
                    onChange={(value) => field.onChange(value)}
                    output
                  />
                </BlockStack>
              )}
            />
}
            {
              mode === "widget" && (widgetType === "carousel" || widgetType === "grid") && (
                <Controller
                  name="settings.design.hoverEffect"
                  control={control}
                  render={({ field }) => (
                    <Select
                      label={
                        <InlineStack gap="200">
                          <Text as="p">Card Hover Effect</Text>
                          <InfoTooltip
                            content="Choose how video cards respond when a customer hovers over them."
                            items={[
                              { term: "Expand", description: "The video card smoothly expands when hovered." },
                              { term: "Lift", description: "The video card slightly lifts upward when hovered." },
                              { term: "None", description: "No hover effect is applied." },
                            ]}
                            media={{
                              src: "/video/card-hover-effect.mp4",
                              alt: "Video card lifting as the cursor moves over it",
                            }}
                          />
                        </InlineStack>
                      }
                      options={[
                        { label: "Lift", value: "lift" },
                        { label: "Expand", value: "expand" },
                        { label: "None", value: "none" },
                      ]}
                      value={field.value ?? "lift"}
                      onChange={field.onChange}
                    />
                  )}
                />
              )
            }

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
              mode === "widget" && (widgetType === "stories") && (
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
                        content="A custom class added to this widget on the storefront for scoping your CSS."
                      >
                        <Icon source={InfoIcon} />
                      </Tooltip>
                    </InlineStack>
                  }
                  placeholder="e.g., video-cart-widget"
                  autoComplete="off"
                  value={field.value ?? ""}
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
                      <Tooltip dismissOnMouseOut content="Add custom CSS to the widget.">
                        <Icon source={InfoIcon} />
                      </Tooltip>
                    </InlineStack>
                  }
                  placeholder="e.g., .video-cart-widget { background-color: #000080; }"
                  multiline={4}
                  autoComplete="off"
                  value={field.value ?? ""}
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
  mode: PropTypes.oneOf(["widget", "global"]),
};
