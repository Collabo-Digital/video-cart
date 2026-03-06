import { Controller } from "react-hook-form";
import PropTypes from "prop-types";
import { TextField, Box, InlineGrid, InlineStack, Tooltip, Icon, Text } from "@shopify/polaris";
import { InfoIcon } from '@shopify/polaris-icons';

/**
 * Translation settings: carousel title, description, add to cart text.
 * Uses react-hook-form control from parent.
 */
export function TranslationSettings({ control, watch, errors = {} }) {
    const widgetType = watch("widgetType");

    return (
        <Box padding="400" background="bg-surface-secondary" borderRadius="200">
            <InlineGrid columns={{ xs: 1, md: 2 }} gap="300">
                {
                    (widgetType === "carousel" || widgetType === "grid" || widgetType === "stories") && (
                        <Controller
                            name="settings.translation.widgetHeading"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    label={<InlineStack gap="200"><Text as="p" >Widget Heading</Text><Tooltip dismissOnMouseOut content="Choose the heading of the widget."><Icon source={InfoIcon} /></Tooltip></InlineStack>}
                                    value={field.value ?? ""}
                                    onChange={field.onChange}
                                    autoComplete="off"
                                />
                            )}
                        />
                    )
                }
                {
                    (widgetType === "carousel" || widgetType === "grid" || widgetType === "stories") && (
                        <Controller
                            name="settings.translation.widgetDescription"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    label={<InlineStack gap="200"><Text as="p" >Widget Description</Text><Tooltip dismissOnMouseOut content="Choose the description of the widget."><Icon source={InfoIcon} /></Tooltip></InlineStack>}
                                    value={field.value ?? ""}
                                    onChange={field.onChange}
                                    autoComplete="off"
                                />
                            )}
                        />
                    )
                }
                <Controller
                    name="settings.translation.buttonText"
                    control={control}
                    render={({ field }) => (
                        <TextField
                            label={<InlineStack gap="200"><Text as="p" >Button Text</Text><Tooltip dismissOnMouseOut content="Choose the text of the button."><Icon source={InfoIcon} /></Tooltip></InlineStack>}
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
};
