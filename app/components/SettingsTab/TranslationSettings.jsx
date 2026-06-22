import { Controller } from "react-hook-form";
import PropTypes from "prop-types";
import { TextField, Box, BlockStack, InlineGrid, InlineStack, Tooltip, Icon, Text } from "@shopify/polaris";
import { InfoIcon } from '@shopify/polaris-icons';

/**
 * Translation settings: carousel title, description, add to cart text.
 * Uses react-hook-form control from parent.
 */
export function TranslationSettings({ control, watch, errors = {}, mode = "widget" }) {
    const widgetType = watch("widgetType");

    if (mode === "global") {
        return (
            <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                <BlockStack gap="400">
                    <BlockStack gap="100">
                        <Text as="p" variant="bodyMd" fontWeight="semibold">More settings option will be available soon</Text>
                        <Text as="p" tone="subdued">
                            More settings options will be available soon.
                        </Text>
                    </BlockStack>
                    {/* <InlineGrid columns={{ xs: 1, md: 2 }} gap="300">
                        <Controller
                            name="settings.translation.addToCartText"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    label={
                                        <InlineStack gap="200">
                                            <Text as="p">Product action label</Text>
                                            <Tooltip dismissOnMouseOut content="Text displayed on the product call-to-action within the video viewer.">
                                                <Icon source={InfoIcon} />
                                            </Tooltip>
                                        </InlineStack>
                                    }
                                    placeholder="Shop Now"
                                    value={field.value ?? ""}
                                    onChange={field.onChange}
                                    autoComplete="off"
                                />
                            )}
                        />
                        <Controller
                            name="settings.translation.videoDiscoveryPageTitle"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    label={
                                        <InlineStack gap="200">
                                            <Text as="p">Discovery title</Text>
                                            <Tooltip dismissOnMouseOut content="Primary heading shown when customers open Video Discovery.">
                                                <Icon source={InfoIcon} />
                                            </Tooltip>
                                        </InlineStack>
                                    }
                                    placeholder="Video Discovery"
                                    value={field.value ?? ""}
                                    onChange={field.onChange}
                                    autoComplete="off"
                                />
                            )}
                        />
                        <Controller
                            name="settings.translation.videoDiscoveryPageDescription"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    label={
                                        <InlineStack gap="200">
                                            <Text as="p">Discovery description</Text>
                                            <Tooltip dismissOnMouseOut content="Supporting text displayed beneath the discovery title.">
                                                <Icon source={InfoIcon} />
                                            </Tooltip>
                                        </InlineStack>
                                    }
                                    placeholder="Explore products through video"
                                    value={field.value ?? ""}
                                    onChange={field.onChange}
                                    autoComplete="off"
                                />
                            )}
                        />
                        <Controller
                            name="settings.translation.videoDiscoveryNavLabel"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    label={
                                        <InlineStack gap="200">
                                            <Text as="p">Default entry label</Text>
                                            <Tooltip dismissOnMouseOut content="Fallback text for the discovery entry point. Device-specific labels in Discovery settings take precedence.">
                                                <Icon source={InfoIcon} />
                                            </Tooltip>
                                        </InlineStack>
                                    }
                                    placeholder="Videos"
                                    value={field.value ?? ""}
                                    onChange={field.onChange}
                                    autoComplete="off"
                                />
                            )}
                        />
                        <Controller
                            name="settings.translation.videoDiscoveryEmptyText"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    label={
                                        <InlineStack gap="200">
                                            <Text as="p">Empty collection message</Text>
                                            <Tooltip dismissOnMouseOut content="Message displayed when no videos are available to show.">
                                                <Icon source={InfoIcon} />
                                            </Tooltip>
                                        </InlineStack>
                                    }
                                    placeholder="No videos are available at this time."
                                    value={field.value ?? ""}
                                    onChange={field.onChange}
                                    autoComplete="off"
                                />
                            )}
                        />
                    </InlineGrid> */}
                </BlockStack>
            </Box>
        );
    }

    return (
        <Box padding="400" background="bg-surface-secondary" borderRadius="200">
            <InlineGrid columns={{ xs: 1, md: 2 }} gap="300">
                {mode === "widget" && (widgetType === "carousel" || widgetType === "grid" || widgetType === "stories") && (
                    <Controller
                        name="settings.translation.widgetHeading"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                label={<InlineStack gap="200"><Text as="p">Widget Heading</Text><Tooltip dismissOnMouseOut content="Choose the heading of the widget."><Icon source={InfoIcon} /></Tooltip></InlineStack>}
                                value={field.value ?? ""}
                                onChange={field.onChange}
                                autoComplete="off"
                            />
                        )}
                    />
                )}
                {mode === "widget" && (widgetType === "carousel" || widgetType === "grid" || widgetType === "stories") && (
                    <Controller
                        name="settings.translation.widgetDescription"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                label={<InlineStack gap="200"><Text as="p">Widget Description</Text><Tooltip dismissOnMouseOut content="Choose the description of the widget."><Icon source={InfoIcon} /></Tooltip></InlineStack>}
                                value={field.value ?? ""}
                                onChange={field.onChange}
                                autoComplete="off"
                            />
                        )}
                    />
                )}
                <Controller
                    name="settings.translation.addToCartText"
                    control={control}
                    render={({ field }) => (
                        <TextField
                            label={<InlineStack gap="200"><Text as="p">Button Text</Text><Tooltip dismissOnMouseOut content="Choose the text of the button."><Icon source={InfoIcon} /></Tooltip></InlineStack>}
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            autoComplete="off"
                        />
                    )}
                />
            </InlineGrid>
        </Box>
    );
}

TranslationSettings.propTypes = {
    control: PropTypes.object.isRequired,
    watch: PropTypes.func.isRequired,
    errors: PropTypes.object,
    mode: PropTypes.oneOf(["widget", "global"]),
};
