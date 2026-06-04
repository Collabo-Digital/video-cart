import { useEffect, useRef, useState } from "react";
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
    Banner,
    Tabs,
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

const FEED_SOURCE_OPTIONS = [
    { label: "All feeds", value: "all" },
    { label: "Carousel feeds", value: "carousel" },
    { label: "Grid feeds", value: "grid" },
    { label: "Stories feeds", value: "stories" },
    { label: "Floating feeds", value: "floating" },
];

const SORT_ORDER_OPTIONS = [
    { label: "Newest first", value: "newest" },
    { label: "Most popular", value: "popular" },
    { label: "Random", value: "random" },
];

const ICON_POSITION_OPTIONS = [
    { label: "Bottom", value: "bottomBar" },
    { label: "Top", value: "topBar" },
    { label: "Left", value: "leftBar" },
    { label: "Right", value: "rightBar" },
];

const LAYOUT_STYLE_OPTIONS = [
    { label: "Floating", value: "floating" },
    { label: "Inline", value: "inline" },
];

const FLOATING_POSITION_OPTIONS = [
    { label: "Top", value: "top" },
    { label: "Bottom", value: "bottom" },
    { label: "Left", value: "left" },
    { label: "Right", value: "right" },
];

const DEVICE_TABS = [
    { id: "desktop", content: "Desktop", panelID: "desktop-panel" },
    { id: "mobile", content: "Mobile", panelID: "mobile-panel" },
];

function DeviceSettings({ device, control, watch }) {
    const prefix = `settings.general.videoDiscovery.${device}`;
    const layoutStyle = watch(`${prefix}.layoutStyle`);

    return (
        <BlockStack gap="400">
            <Controller
                name={`${prefix}.isVisible`}
                control={control}
                render={({ field: { value, onChange, ...field } }) => (
                    <Checkbox
                        label={`Show Video Discovery on ${device === "desktop" ? "Desktop" : "Mobile"}`}
                        checked={value}
                        onChange={onChange}
                        {...field}
                    />
                )}
            />

            {!watch(`${prefix}.isVisible`) && (
                <Banner tone="info">
                    Video Discovery is hidden on {device === "desktop" ? "desktop" : "mobile"} devices.
                </Banner>
            )}

            {watch(`${prefix}.isVisible`) && (
            <>
            <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
                <Controller
                    name={`${prefix}.layoutStyle`}
                    control={control}
                    render={({ field }) => (
                        <Select
                            label={
                                <InlineStack gap="200">
                                    <Text as="p">Layout Style</Text>
                                    <Tooltip dismissOnMouseOut content="How Video Discovery appears on the storefront.">
                                        <Icon source={InfoIcon} />
                                    </Tooltip>
                                </InlineStack>
                            }
                            options={LAYOUT_STYLE_OPTIONS}
                            value={field.value}
                            onChange={field.onChange}
                        />
                    )}
                />

                {layoutStyle === "floating" && (
                    <Controller
                        name={`${prefix}.floatingPosition`}
                        control={control}
                        render={({ field }) => (
                            <Select
                                label={
                                    <InlineStack gap="200">
                                        <Text as="p">Floating Position</Text>
                                        <Tooltip dismissOnMouseOut content="Where the floating widget appears on screen.">
                                            <Icon source={InfoIcon} />
                                        </Tooltip>
                                    </InlineStack>
                                }
                                options={FLOATING_POSITION_OPTIONS}
                                value={field.value}
                                onChange={field.onChange}
                            />
                        )}
                    />
                )}

                {layoutStyle === "inline" && (
                    <Controller
                        name={`${prefix}.inlinePosition`}
                        control={control}
                        render={({ field }) => (
                            <TextField
                                label={
                                    <InlineStack gap="200">
                                        <Text as="p">CSS Selector</Text>
                                        <Tooltip dismissOnMouseOut content="CSS selector for where the inline widget is inserted (e.g. .header, #main).">
                                            <Icon source={InfoIcon} />
                                        </Tooltip>
                                    </InlineStack>
                                }
                                placeholder=".header, #main, etc."
                                autoComplete="off"
                                value={field.value ?? ""}
                                onChange={field.onChange}
                            />
                        )}
                    />
                )}
            </InlineGrid>

            <Text as="p" variant="bodyMd" fontWeight="semibold">Navigation</Text>
            <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
                <Controller
                    name={`${prefix}.showNavIcon`}
                    control={control}
                    render={({ field: { value, onChange, ...field } }) => (
                        <Checkbox
                            label="Show navigation icon"
                            helpText="Adds a Video Discovery entry point on the storefront."
                            checked={value}
                            onChange={onChange}
                            {...field}
                        />
                    )}
                />
                {watch(`${prefix}.showNavIcon`) && (
                    <>
                        <Controller
                            name={`${prefix}.iconPosition`}
                            control={control}
                            render={({ field }) => (
                                <Select
                                    label={
                                        <InlineStack gap="200">
                                            <Text as="p">Icon Position</Text>
                                            <Tooltip dismissOnMouseOut content="Where the icon appears on the storefront.">
                                                <Icon source={InfoIcon} />
                                            </Tooltip>
                                        </InlineStack>
                                    }
                                    options={ICON_POSITION_OPTIONS}
                                    value={field.value}
                                    onChange={field.onChange}
                                />
                            )}
                        />
                        <Controller
                            name={`${prefix}.navLabel`}
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    label={
                                        <InlineStack gap="200">
                                            <Text as="p">Navigation Label</Text>
                                            <Tooltip dismissOnMouseOut content="Text shown on the navigation link.">
                                                <Icon source={InfoIcon} />
                                            </Tooltip>
                                        </InlineStack>
                                    }
                                    placeholder="Videos"
                                    autoComplete="off"
                                    value={field.value ?? ""}
                                    onChange={field.onChange}
                                />
                            )}
                        />
                    </>
                )}
            </InlineGrid>
            </>
            )}
        </BlockStack>
    );
}

DeviceSettings.propTypes = {
    device: PropTypes.oneOf(["desktop", "mobile"]).isRequired,
    control: PropTypes.object.isRequired,
    watch: PropTypes.func.isRequired,
};

export function GeneralSettings({ control, watch, errors = {}, setValue, mode = "widget", feeds = [] }) {
    const widgetType = watch("widgetType");
    const widgetPage = watch("widgetPage");
    const prevWidgetType = useRef(widgetType);
    const [deviceTab, setDeviceTab] = useState(0);

    useEffect(() => {
        if (mode === "widget" && prevWidgetType.current && prevWidgetType.current !== widgetType) {
            setValue("settings.design.template", "default");
        }
        prevWidgetType.current = widgetType;
    }, [widgetType, setValue, mode]);

    return (
        <BlockStack gap="200">
            {/* Widget Identity — widget only */}
            {mode === "widget" && (
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
                                    minLength: { value: 3, message: "Feed name must be at least 3 characters" },
                                }}
                                render={({ field }) => (
                                    <TextField
                                        label={
                                            <InlineStack gap="200">
                                                <Text as="p">Feed Name</Text>
                                                <Tooltip dismissOnMouseOut content="Give your feed a name to help you identify it.">
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
                                                <Tooltip dismissOnMouseOut content="Choose the type of widget you want to create.">
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
                                                <Tooltip dismissOnMouseOut content="Choose the page where you want to display the widget.">
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
                                        pattern: { value: /^\/.*/, message: "Path must start with /" },
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
            )}

            {/* Widget Behavior — shared */}
            <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                <BlockStack gap="400">
                    <Text as="p" variant="bodyMd" fontWeight="semibold">
                        {mode === "widget" ? "Widget Behavior" : "Default Widget Behavior"}
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
                                            <Tooltip dismissOnMouseOut content="Choose the behavior of the add to cart button.">
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
                                            <Tooltip dismissOnMouseOut content="Control video autoplay behavior.">
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
                        <Controller
                            name="settings.general.autoLoop"
                            control={control}
                            render={({ field: { value, onChange, ...field } }) => (
                                <Checkbox
                                    label={
                                        <InlineStack gap="200">
                                            <Text as="p">Auto Loop Video</Text>
                                            <Tooltip
                                                dismissOnMouseOut
                                                content="When enabled, videos will loop automatically after they finish playing."
                                            >
                                                <Icon source={InfoIcon} />
                                            </Tooltip>
                                        </InlineStack>
                                    }
                                    checked={value}
                                    onChange={onChange}
                                    {...field}
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
                                        <Checkbox label="Desktop" checked={field.value} onChange={field.onChange} />
                                    )}
                                />
                                <Controller
                                    name="settings.general.visibleOnMobile"
                                    control={control}
                                    render={({ field }) => (
                                        <Checkbox label="Mobile" checked={field.value} onChange={field.onChange} />
                                    )}
                                />
                            </InlineStack>
                        </BlockStack>
                        {mode === "widget" && widgetType === "grid" && (
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

            {/* Video Discovery — global only */}
            {mode === "global" && (
                <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                    <BlockStack gap="400">
                        <Controller
                            name="settings.general.videoDiscovery.isEnabled"
                            control={control}
                            render={({ field: { value, onChange, ...field } }) => (
                                <Checkbox
                                    label="Enable Video Discovery"
                                    helpText="Adds a dedicated video browsing page on your storefront where customers can discover all your shoppable videos."
                                    checked={value}
                                    onChange={onChange}
                                    {...field}
                                />
                            )}
                        />

                        {!watch("settings.general.videoDiscovery.isEnabled") && (
                            <Banner tone="info">
                                Enable Video Discovery to configure how customers browse your videos.
                            </Banner>
                        )}

                        {watch("settings.general.videoDiscovery.isEnabled") && (
                            <BlockStack gap="400">
                                {/* Common settings */}
                                <Text as="p" variant="bodyMd" fontWeight="semibold">Content</Text>
                                <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
                                    <Controller
                                        name="settings.general.videoDiscovery.feedSource"
                                        control={control}
                                        render={({ field }) => (
                                            <Select
                                                label={
                                                    <InlineStack gap="200">
                                                        <Text as="p">Include videos from</Text>
                                                        <Tooltip dismissOnMouseOut content="Show videos from all feeds or filter by type.">
                                                            <Icon source={InfoIcon} />
                                                        </Tooltip>
                                                    </InlineStack>
                                                }
                                                options={FEED_SOURCE_OPTIONS}
                                                value={field.value}
                                                onChange={field.onChange}
                                            />
                                        )}
                                    />
                                    <Controller
                                        name="settings.general.videoDiscovery.sortOrder"
                                        control={control}
                                        render={({ field }) => (
                                            <Select
                                                label={
                                                    <InlineStack gap="200">
                                                        <Text as="p">Sort Order</Text>
                                                        <Tooltip dismissOnMouseOut content="How videos are ordered in Video Discovery.">
                                                            <Icon source={InfoIcon} />
                                                        </Tooltip>
                                                    </InlineStack>
                                                }
                                                options={SORT_ORDER_OPTIONS}
                                                value={field.value}
                                                onChange={field.onChange}
                                            />
                                        )}
                                    />
                                </InlineGrid>

                                {/* {watch("settings.general.videoDiscovery.feedSource") === "selected" && (
                                    <BlockStack gap="200">
                                        <Text as="p" variant="bodyMd" fontWeight="semibold">Select Feeds</Text>
                                        {feeds.length > 0 ? feeds.map((feedOption) => (
                                            <Controller
                                                key={feedOption.id}
                                                name="settings.general.videoDiscovery.selectedFeedIds"
                                                control={control}
                                                render={({ field: { value = [], onChange } }) => (
                                                    <Checkbox
                                                        label={feedOption.feedName}
                                                        checked={value.includes(feedOption.id)}
                                                        onChange={(checked) => {
                                                            const next = checked
                                                                ? [...value, feedOption.id]
                                                                : value.filter((id) => id !== feedOption.id);
                                                            onChange(next);
                                                        }}
                                                    />
                                                )}
                                            />
                                        )) : (
                                            <Text as="p" tone="subdued">No feeds created yet.</Text>
                                        )}
                                    </BlockStack>
                                )} */}

                                {/* Desktop / Mobile tabs */}
                                <Box borderRadius="200" background="bg-fill-secondary">
                                    <Tabs
                                        tabs={DEVICE_TABS}
                                        selected={deviceTab}
                                        onSelect={setDeviceTab}
                                        fitted
                                    />
                                </Box>

                                <DeviceSettings
                                    device={deviceTab === 0 ? "desktop" : "mobile"}
                                    control={control}
                                    watch={watch}
                                />
                            </BlockStack>
                        )}
                    </BlockStack>
                </Box>
            )}
        </BlockStack>
    );
}

GeneralSettings.propTypes = {
    control: PropTypes.object.isRequired,
    watch: PropTypes.func.isRequired,
    errors: PropTypes.object,
    setValue: PropTypes.func,
    mode: PropTypes.oneOf(["widget", "global"]),
    feeds: PropTypes.array,
};
