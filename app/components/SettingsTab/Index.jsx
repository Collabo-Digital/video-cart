import { Box, BlockStack, Tabs, Icon, InlineStack } from "@shopify/polaris";
import {
    AppsIcon, PaintBrushFlatIcon, TextIcon

} from "@shopify/polaris-icons";

import PropTypes from "prop-types";
import { GeneralSettings } from "./GeneralSettings";
import { DesignSettings } from "./DesignSettings";
import { TranslationSettings } from "./TranslationSettings";

const SETTINGS_TABS = [
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

/**
 * Settings tab content: sub-tabs General, Design, Translation with their panels.
 * Parent manages selected index and passes control/errors from react-hook-form.
 */
export function SettingsTab({ control, watch, errors, selectedTab, onTabChange }) {
    return (
        <Box padding="400">
            <BlockStack gap="400">
                <Box borderRadius="200" background="bg-fill-secondary">
                    {/* <Card padding="0" background="bg-surface-secondary"> */}

                    <Tabs
                        tabs={SETTINGS_TABS}
                        selected={selectedTab}
                        onSelect={onTabChange}
                        fitted
                    />

                </Box>
                {/* </Card> */}
                {selectedTab === 0 && (
                    <GeneralSettings control={control} watch={watch} errors={errors} />
                )}
                {selectedTab === 1 && <DesignSettings control={control} watch={watch} errors={errors} />}
                {selectedTab === 2 && (
                    <TranslationSettings control={control} watch={watch} errors={errors} />
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
};

export { GeneralSettings } from "./GeneralSettings";
export { DesignSettings } from "./DesignSettings";
export { TranslationSettings } from "./TranslationSettings";
