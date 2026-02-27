import { Controller } from "react-hook-form";
import PropTypes from "prop-types";
import { TextField, Box, InlineGrid, InlineStack, Tooltip, Icon, Text } from "@shopify/polaris";
import { InfoIcon } from '@shopify/polaris-icons';

/**
 * Translation settings: carousel title, description, add to cart text.
 * Uses react-hook-form control from parent.
 */
export function TranslationSettings({ control }) {
    return (
        <Box padding="400" background="bg-surface-secondary" borderRadius="200">
            <InlineGrid columns={{ xs: 1, md: 2 }} gap="300">
                <Controller
                    name="settings.translation.carouselTitle"
                    control={control}
                    render={({ field }) => (
                        <TextField
                            label={<InlineStack gap="200"><Text as="p" variant="bodyLg">Carousel Title</Text><Tooltip dismissOnMouseOut content="Choose the title of the carousel."><Icon  source={InfoIcon} /></Tooltip></InlineStack>}
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            autoComplete="off"
                        />
                    )}
                />
                <Controller
                    name="settings.translation.carouselDescription"
                    control={control}
                    render={({ field }) => (
                        <TextField
                            label={<InlineStack gap="200"><Text as="p" variant="bodyLg">Carousel Description</Text><Tooltip dismissOnMouseOut content="Choose the description of the carousel."><Icon  source={InfoIcon} /></Tooltip></InlineStack>}
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            autoComplete="off"
                        />
                    )}
                />
                <Controller
                    name="settings.translation.addToCartText"
                    control={control}
                    render={({ field }) => (
                        <TextField
                            label={<InlineStack gap="200"><Text as="p" variant="bodyLg">Add to Cart Text</Text><Tooltip dismissOnMouseOut content="Choose the text of the add to cart button."><Icon  source={InfoIcon} /></Tooltip></InlineStack>}
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
};
