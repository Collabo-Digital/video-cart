import { useEffect, useRef, useState } from "react";
import { Controller, useWatch } from "react-hook-form";
import PropTypes from "prop-types";
import {
    TextField,
    Select,
    InlineGrid,
    Box,
    Text,
    BlockStack,
    InlineStack,
    Checkbox,
    Banner,
    Tabs,
    Card,
} from "@shopify/polaris";
import InfoTooltip from "../InfoTooltip/InfoTooltip.jsx";

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
    { label: "All video feeds", value: "all" },
    { label: "Carousel feeds only", value: "carousel" },
    { label: "Grid feeds only", value: "grid" },
    { label: "Stories feeds only", value: "stories" },
    { label: "Floating widget feeds only", value: "floating" },
];

const SORT_ORDER_OPTIONS = [
    { label: "Newest first", value: "newest" },
    { label: "Most popular", value: "popular" },
    { label: "Randomized", value: "random" },
];

const LAYOUT_STYLE_OPTIONS = [
    { label: "Floating button", value: "floating" },
    { label: "Inline navigation link", value: "inline" },
];

const FLOATING_POSITION_OPTIONS = [
    { label: "Top", value: "top" },
    { label: "Bottom", value: "bottom" },
    { label: "Left", value: "left" },
    { label: "Right", value: "right" },
];

const INLINE_INSERT_MODE_OPTIONS = [
    { label: "Append — inside, at the end", value: "append" },
    { label: "Prepend — inside, at the start", value: "prepend" },
    { label: "Before — outside, above the target", value: "before" },
    { label: "After — outside, below the target", value: "after" },
];

const DEVICE_TABS = [
    { id: "desktop", content: "Desktop", panelID: "desktop-panel" },
    { id: "mobile", content: "Mobile", panelID: "mobile-panel" },
];

function DeviceSettings({ device, control }) {
    const prefix = `settings.general.videoDiscovery.${device}`;
    const deviceValues = useWatch({ control, name: prefix }) ?? {};
    const isVisible = deviceValues.isVisible ?? true;
    const layoutStyle = deviceValues.layoutStyle ?? "floating";

    return (
        <BlockStack gap="400">
            <Controller
                name={`${prefix}.isVisible`}
                control={control}
                render={({ field: { value, onChange, ...field } }) => (
                    <Checkbox
                        label={`Enable on ${device === "desktop" ? "Desktop" : "Mobile"}`}
                        helpText={`Control whether Video Discovery is visible to customers on ${device === "desktop" ? "desktop" : "mobile"} devices.`}
                        checked={value}
                        onChange={onChange}
                        {...field}
                    />
                )}
            />

            {!isVisible && (
                <Banner tone="info">
                    Video Discovery is currently disabled for {device === "desktop" ? "desktop" : "mobile"} visitors.
                </Banner>
            )}

            {isVisible && (
                <>
                    <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
                        <Controller
                            name={`${prefix}.layoutStyle`}
                            control={control}
                            render={({ field }) => (
                                <Select
                                    label={
                                        <InlineStack gap="200">
                                            <Text as="p">Display format</Text>
                                            <InfoTooltip
                                                content="Choose how the Video Discovery entry point appears on your storefront."
                                                items={[
                                                    { term: "Floating button", description: "A button that floats on the screen, allowing customers to access Video Discovery from any page." },
                                                    { term: "Inline navigation link", description: "A link that appears within your site's navigation menu, providing a more integrated experience." },
                                                ]}
                                                media={{
                                                    src: "/images/inline-discovery.webp",
                                                    alt: "A Videos link in the storefront navigation menu",
                                                }} />
                                        </InlineStack>
                                    }
                                    options={LAYOUT_STYLE_OPTIONS}
                                    value={field.value}
                                    onChange={field.onChange}
                                />
                            )}
                        />

                        {layoutStyle === "floating" && (
                            <>
                                <Controller
                                    name={`${prefix}.floatingPosition`}
                                    control={control}
                                    render={({ field }) => (
                                        <Select
                                            label={
                                                <InlineStack gap="200">
                                                    <Text as="p">Button placement</Text>
                                                    <InfoTooltip content="Specify the screen position of the floating entry point." />
                                                </InlineStack>
                                            }
                                            options={FLOATING_POSITION_OPTIONS}
                                            value={field.value}
                                            onChange={field.onChange}
                                        />
                                    )}
                                />
                                <Controller
                                    name={`${prefix}.floatingBgColor`}
                                    control={control}
                                    defaultValue="#111827"
                                    render={({ field }) => (
                                        <BlockStack gap="100">
                                            <InlineStack gap="200">
                                                <Text as="p">Button color</Text>
                                                <InfoTooltip content="Set the background color of the floating discovery button." />
                                            </InlineStack>
                                            <s-color-field
                                                placeholder="Select a color (e.g., #111827)"
                                                value={field.value ?? "#111827"}
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
                            </>
                        )}

                        {layoutStyle === "inline" && (
                            <>
                                <Controller
                                    name={`${prefix}.inlinePosition`}
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            label={
                                                <InlineStack gap="200">
                                                    <Text as="p">Navigation target</Text>
                                                    <InfoTooltip
                                                        content="Enter the CSS class of the theme element where you want the discovery link to be rendered."
                                                        items={[
                                                            "Open your storefront and right-click the element you want to use as the target.",
                                                            "Select Inspect to open your browser's Developer Tools.",
                                                            "Find the HTML element you want to target.",
                                                            "Look for its class attribute.",
                                                            "Copy the class name and enter it in this field.",
                                                            "Add a . before the class name.",
                                                        ]}
                                                    />
                                                </InlineStack>
                                            }
                                            placeholder="nav or .header__menu"
                                            helpText="Example selectors: nav, header__inline-menu, .header__menu"
                                            autoComplete="off"
                                            value={field.value ?? "nav"}
                                            onChange={field.onChange}
                                        />
                                    )}
                                />
                                <Controller
                                    name={`${prefix}.inlineInsertMode`}
                                    control={control}
                                    defaultValue="append"
                                    render={({ field }) => (
                                        <Select
                                            label={
                                                <InlineStack gap="200">
                                                    <Text as="p">Insertion mode</Text>
                                                    <InfoTooltip content="Where to place the link relative to the navigation target. Append and Prepend insert inside the target; Before and After insert outside it, as a sibling." />
                                                </InlineStack>
                                            }
                                            options={INLINE_INSERT_MODE_OPTIONS}
                                            value={field.value ?? "append"}
                                            onChange={field.onChange}
                                        />
                                    )}
                                />
                            </>
                        )}
                    </InlineGrid>

                    <Text as="p" variant="bodyMd" fontWeight="semibold">Storefront appearance</Text>
                    <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
                        <Controller
                            name={`${prefix}.showNavIcon`}
                            control={control}
                            defaultValue={true}
                            render={({ field: { value, onChange } }) => (
                                <Checkbox
                                    label={
                                        <InlineStack gap="200">
                                            <Text as="p">Display icon</Text>
                                            <InfoTooltip content="Show a video icon alongside the entry point label." />
                                        </InlineStack>
                                    }
                                    checked={value !== false}
                                    onChange={(checked) => onChange(checked)}
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
                                            <Text as="p">Navigation label</Text>
                                            <InfoTooltip content="The text displayed on the floating button or navigation link." />
                                        </InlineStack>
                                    }
                                    placeholder="Videos"
                                    autoComplete="off"
                                    value={field.value ?? ""}
                                    onChange={field.onChange}
                                />
                            )}
                        />
                    </InlineGrid>
                </>
            )}
        </BlockStack>
    );
}

DeviceSettings.propTypes = {
    device: PropTypes.oneOf(["desktop", "mobile"]).isRequired,
    control: PropTypes.object.isRequired,
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
                                                <InfoTooltip content="Give your feed a name to help you identify it." />
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
                                                <InfoTooltip content="Choose the type of widget you want to create." />
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
                                                <InfoTooltip content="Choose the page where you want to display the widget." />
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

            {/* Widget Behavior — widget only */}
            {mode === "widget" && (
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
                                                <InfoTooltip content="Choose the behavior of the add to cart button." />
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
                                                <InfoTooltip
                                                    content="Choose when your videos should start playing automatically."
                                                    items={[
                                                        { term: "Always", description: "Videos play automatically and continuously, similar to a GIF." },
                                                        { term: "On Hover", description: "Videos play only when the customer hovers over them." },
                                                        { term: "Never", description: "Videos remain paused until the customer interacts with them." },
                                                    ]}
                                                    media={{
                                                        src: "/video/auto-play.mp4",
                                                        alt: "Video card in the widget playing on its own",
                                                    }}
                                                />
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
                                                <InfoTooltip
                                                    content="Automatically move through the videos in your carousel without requiring manual scrolling."
                                                    items={[
                                                        { term: "Enabled", description: "The carousel automatically moves to the next video." },
                                                        { term: "Disabled", description: "Customers can move through the videos manually." },
                                                    ]}
                                                    media={{
                                                        src: "/video/auto-loop.mp4",
                                                        alt: "Carousel advancing through videos on its own",
                                                    }}
                                                />
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
                                            label={
                                                <InlineStack gap="200">
                                                    <Text as="p">Videos per row</Text>
                                                    <InfoTooltip
                                                        content="Set the number of videos displayed in each row to control the layout of your video feed."
                                                        media={{
                                                            src: "/images/videos-per-row.webp",
                                                            alt: "Grid widget showing three videos per row",
                                                        }}
                                                    />
                                                </InlineStack>
                                            }
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
            )}

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
                                    helpText="Provide customers with a dedicated way to browse your shoppable video content from anywhere on your storefront."
                                    checked={value}
                                    onChange={onChange}
                                    {...field}
                                />
                            )}
                        />

                        {!watch("settings.general.videoDiscovery.isEnabled") && (
                            <Banner tone="info">
                                Enable Video Discovery to configure video sourcing, display preferences, and device-specific placement.
                            </Banner>
                        )}

                        {watch("settings.general.videoDiscovery.isEnabled") && (
                            <BlockStack gap="400">
                                {/* Common settings */}
                                <Text as="p" variant="bodyMd" fontWeight="semibold">Video sourcing</Text>
                                <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
                                    <Controller
                                        name="settings.general.videoDiscovery.feedSource"
                                        control={control}
                                        render={({ field }) => (
                                            <Select
                                                label={
                                                    <InlineStack gap="200">
                                                        <Text as="p">Video source</Text>
                                                        <InfoTooltip content="Select which video feeds are included in Video Discovery." />
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
                                                        <Text as="p">Display order</Text>
                                                        <InfoTooltip content="Define how videos are prioritized when customers browse your collection." />
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

                                <Text as="p" variant="bodyMd" fontWeight="semibold">Device configuration</Text>
                                <Card>
                                    <Tabs
                                        tabs={DEVICE_TABS}
                                        selected={deviceTab}
                                        onSelect={setDeviceTab}
                                        fitted
                                    />
                                    <Box borderRadius="200" background="bg-fill-secondary" padding="400">
                                        <DeviceSettings
                                            key={deviceTab === 0 ? "desktop" : "mobile"}
                                            device={deviceTab === 0 ? "desktop" : "mobile"}
                                            control={control}
                                        />
                                    </Box>
                                </Card>
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
