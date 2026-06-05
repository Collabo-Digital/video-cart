import { Box, BlockStack, Tabs, Icon, InlineStack } from "@shopify/polaris";
import {
    AppsIcon, PaintBrushFlatIcon, TextIcon
} from "@shopify/polaris-icons";
import PropTypes from "prop-types";
import { GeneralSettings } from "./GeneralSettings";
import { DesignSettings } from "./DesignSettings";
import { TranslationSettings } from "./TranslationSettings";

const WIDGET_SETTINGS_TABS = [
    {
        id: "settings-general",
        content: (
            <InlineStack gap="200" blockAlign="center">
                <Icon source={AppsIcon} />
                <span>General</span>
            </InlineStack>
        ),
        panelID: "settings-general-content",
    },
    {
        id: "settings-design", content: (
            <InlineStack gap="200" blockAlign="center">
                <Icon source={PaintBrushFlatIcon} />
                <span>Design</span>
            </InlineStack>
        ), panelID: "settings-design-content"
    },
    {
        id: "settings-translation", content: (
            <InlineStack gap="200" blockAlign="center">
                <Icon source={TextIcon} />
                <span>Content</span>
            </InlineStack>
        ), panelID: "settings-translation-content"
    },
];

const GLOBAL_SETTINGS_TABS = [
    {
        id: "settings-general",
        content: (
            <InlineStack gap="200" blockAlign="center">
                <Icon source={AppsIcon} />
                <span>Discovery</span>
            </InlineStack>
        ),
        panelID: "settings-general-content",
    },
    {
        id: "settings-design", content: (
            <InlineStack gap="200" blockAlign="center">
                <Icon source={PaintBrushFlatIcon} />
                <span>Appearance</span>
            </InlineStack>
        ), panelID: "settings-design-content"
    },
    {
        id: "settings-translation", content: (
            <InlineStack gap="200" blockAlign="center">
                <Icon source={TextIcon} />
                <span>Messaging</span>
            </InlineStack>
        ), panelID: "settings-translation-content"
    },
];

/**
 * Shared settings tabs: General, Design, Content.
 * Renders different fields based on mode ("widget" for feed editor, "global" for app settings).
 */
export function SettingsTab({
    control, watch, errors, selectedTab, onTabChange, setValue,
    mode = "widget",
    feeds = [],
}) {
    return (
        <Box padding="400">
            <BlockStack gap="400">
                <Box borderRadius="200" background="bg-fill-secondary">
                    <Tabs
                        tabs={mode === "global" ? GLOBAL_SETTINGS_TABS : WIDGET_SETTINGS_TABS}
                        selected={selectedTab}
                        onSelect={onTabChange}
                        fitted
                    />
                </Box>
                {selectedTab === 0 && (
                    <GeneralSettings
                        control={control} watch={watch} errors={errors} setValue={setValue}
                        mode={mode} feeds={feeds}
                    />
                )}
                {selectedTab === 1 && (
                    <DesignSettings control={control} watch={watch} errors={errors} mode={mode} />
                )}
                {selectedTab === 2 && (
                    <TranslationSettings control={control} watch={watch} errors={errors} mode={mode} />
                )}
            </BlockStack>
        </Box>
    );
}

SettingsTab.propTypes = {
    control: PropTypes.object.isRequired,
    watch: PropTypes.func.isRequired,
    errors: PropTypes.object,
    selectedTab: PropTypes.number.isRequired,
    onTabChange: PropTypes.func.isRequired,
    setValue: PropTypes.func.isRequired,
    mode: PropTypes.oneOf(["widget", "global"]),
    feeds: PropTypes.array,
};

export { GeneralSettings } from "./GeneralSettings";
export { DesignSettings } from "./DesignSettings";
export { TranslationSettings } from "./TranslationSettings";
