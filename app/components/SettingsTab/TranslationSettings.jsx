import { Controller } from "react-hook-form";
import PropTypes from "prop-types";
import { TextField, Box, InlineGrid } from "@shopify/polaris";

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
                            label="Carousel Title"
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
                            label="Carousel Description"
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
                            label="Add to Cart Text"
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
