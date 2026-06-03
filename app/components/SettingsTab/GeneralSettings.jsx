import { useEffect, useRef } from "react";
import { Controller } from "react-hook-form";
import PropTypes from "prop-types";
import {
    TextField,
    Select,
    InlineGrid,
    Box,
    Text,
    Icon,
    BlockStack,
    InlineStack,
    Tooltip,
    Checkbox,
} from "@shopify/polaris";
import {
    InfoIcon,
} from "@shopify/polaris-icons";

const WIDGET_TYPE_OPTIONS = [
    { label: "Carousel", value: "carousel" },
    { label: "Grid", value: "grid" },
    { label: "Stories", value: "stories" },
    { label: "Floating", value: "floating" },
];

const ADD_TO_CART_BUTTON_BEHAVIOR_OPTIONS = [
    { label: "Add to cart", value: "addToCart" },
    { label: "Open product page", value: "openProductPage" },
];

const WIDGET_DISPLAY_PAGE_OPTIONS = [
    { label: "Homepage", value: "homePage" },
    { label: "Product page", value: "productPage" },
    { label: "Collection page", value: "collectionPage" },
    { label: "Custom", value: "custom" },
];

const AUTO_PLAY_OPTIONS = [
    { label: "Always", value: "always" },
    { label: "On Hover", value: "onHover" },
    { label: "Never", value: "never" },
];

/**
 * General settings: feed name, widget type, status.
 * Uses react-hook-form control from parent.
 */
export function GeneralSettings({ control, watch, errors = {}, setValue }) {
    const widgetType = watch("widgetType");
    const widgetPage = watch("widgetPage");
    const prevWidgetType = useRef(widgetType);
    useEffect(() => {
        if (prevWidgetType.current && prevWidgetType.current !== widgetType) {
            setValue("settings.design.template", "default");
        }
        prevWidgetType.current = widgetType;
    }, [widgetType, setValue]);

    return (
        <BlockStack gap="200">
            <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                <BlockStack gap="400">
                    <Text as="p" variant="bodyMd" fontWeight="semibold">
                        Widget Identity
                    </Text>
                    <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
                        <Controller
                            name="feedName"
                            control={control}
                            rules={{
                                required: "Feed name is required",
                                minLength: {
                                    value: 3,
                                    message: "Feed name must be at least 3 characters",
                                },
                            }}
                            render={({ field }) => (
                                <TextField
                                    label={
                                        <InlineStack gap="200">
                                            <Text as="p">Feed Name</Text>
                                            <Tooltip
                                                dismissOnMouseOut
                                                content="Give your feed a name to help you identify it."
                                            >
                                                <Icon source={InfoIcon} />
                                            </Tooltip>
                                        </InlineStack>
                                    }
                                    placeholder="e.g., Homepage Video Feed"
                                    autoComplete="off"
                                    value={field.value}
                                    onChange={field.onChange}
                                    error={errors.feedName?.message}
                                />
                            )}
                        />
                        <Controller
                            name="widgetType"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    label={
                                        <InlineStack gap="200">
                                            <Text as="p">Widget Layout</Text>
                                            <Tooltip
                                                dismissOnMouseOut
                                                content="Choose the type of widget you want to create."
                                            >
                                                <Icon source={InfoIcon} />
                                            </Tooltip>
                                        </InlineStack>
                                    }
                                    options={WIDGET_TYPE_OPTIONS}
                                    value={field.value}
                                    onChange={field.onChange}
                                />
                            )}
                        />

                        <Controller
                            name="widgetPage"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    label={
                                        <InlineStack gap="200">
                                            <Text as="p">Display Page</Text>
                                            <Tooltip
                                                dismissOnMouseOut
                                                content="Choose the page where you want to display the widget."
                                            >
                                                <Icon source={InfoIcon} />
                                            </Tooltip>
                                        </InlineStack>
                                    }
                                    options={WIDGET_DISPLAY_PAGE_OPTIONS}
                                    value={field.value}
                                    onChange={field.onChange}
                                />
                            )}
                        />

                        {widgetPage === "custom" && (
                            <Controller
                                name="customPagePath"
                                control={control}
                                rules={{
                                    required: "Page path is required",
                                    pattern: {
                                        value: /^\/.*/,
                                        message: "Path must start with /",
                                    },
                                }}
                                render={({ field }) => (
                                    <TextField
                                        label="Custom Page Path"
                                        placeholder="/pages/about, /blogs/news, etc."
                                        autoComplete="off"
                                        value={field.value}
                                        onChange={field.onChange}
                                        error={errors.customPagePath?.message}
                                        helpText="Enter the URL path where the widget should display."
                                    />
                                )}
                            />
                        )}
                    </InlineGrid>
                </BlockStack>
            </Box>
            <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                <BlockStack gap="400">
                    <Text as="p" variant="bodyMd" fontWeight="semibold">
                        Widget Behavior
                    </Text>
                    <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
                        <Controller
                            name="settings.general.buttonBehavior"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    label={
                                        <InlineStack gap="200">
                                            <Text as="p">Button Action</Text>
                                            <Tooltip
                                                dismissOnMouseOut
                                                content="Choose the behavior of the add to cart button."
                                            >
                                                <Icon source={InfoIcon} />
                                            </Tooltip>
                                        </InlineStack>
                                    }
                                    options={ADD_TO_CART_BUTTON_BEHAVIOR_OPTIONS}
                                    value={field.value}
                                    onChange={field.onChange}
                                />
                            )}
                        />
                        <Controller
                            name="settings.general.autoPlay"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    label={
                                        <InlineStack gap="200">
                                            <Text as="p">Auto Play</Text>
                                            <Tooltip
                                                dismissOnMouseOut
                                                content="Choose the page where you want to display the widget."
                                            >
                                                <Icon source={InfoIcon} />
                                            </Tooltip>
                                        </InlineStack>
                                    }
                                    options={AUTO_PLAY_OPTIONS}
                                    value={field.value}
                                    onChange={field.onChange}
                                />
                            )}
                        />
                        <BlockStack gap="200">
                            <Text as="p">Device Visibility</Text>
                            <InlineStack gap="600">
                                <Controller
                                    name="settings.general.visibleOnDesktop"
                                    control={control}
                                    render={({ field }) => (
                                        <Checkbox
                                            label="Desktop"
                                            checked={field.value}
                                            onChange={field.onChange}
                                        />
                                    )}
                                />
                                <Controller
                                    name="settings.general.visibleOnMobile"
                                    control={control}
                                    render={({ field }) => (
                                        <Checkbox
                                            label="Mobile"
                                            checked={field.value}
                                            onChange={field.onChange}
                                        />
                                    )}
                                />
                            </InlineStack>
                        </BlockStack>
                        {
                            widgetType === "grid" && (
                                <Controller
                                    name="settings.general.videosPerRow"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            label="Videos Per Row"
                                            type="number"
                                            value={field.value}
                                            onChange={field.onChange}
                                            autoComplete="off"
                                        />
                                    )}
                                />
                            )}

                    </InlineGrid>
                </BlockStack>
            </Box>
        </BlockStack>
    );
}

GeneralSettings.propTypes = {
    control: PropTypes.object.isRequired,
    watch: PropTypes.func.isRequired,
    errors: PropTypes.object,
};
