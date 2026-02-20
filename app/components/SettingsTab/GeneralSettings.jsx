import { Controller } from "react-hook-form";
import PropTypes from "prop-types";
import {
    TextField,
    Select,
    ChoiceList,
    InlineGrid,
    Box,
} from "@shopify/polaris";

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
];

/**
 * General settings: feed name, widget type, status.
 * Uses react-hook-form control from parent.
 */
export function GeneralSettings({ control, errors = {} }) {
    return (
        <Box padding="400" background="bg-surface-secondary" borderRadius="200">
            <InlineGrid columns={{ xs: 1, md: 2 }} gap="300">
                <Controller
                    name="feedName"
                    control={control}
                    rules={{
                        required: "Feed name is required",
                        minLength: { value: 3, message: "Feed name must be at least 3 characters" },
                    }}
                    render={({ field }) => (
                        <TextField
                            label="Feed Name"
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
                            label="Widget Type"
                            options={WIDGET_TYPE_OPTIONS}
                            value={field.value}
                            onChange={field.onChange}
                        />
                    )}
                />
                <Controller
                    name="settings.general.addToCartButtonBehavior"
                    control={control}
                    render={({ field }) => (
                        <Select
                            label="Add to cart button behavior"
                            options={ADD_TO_CART_BUTTON_BEHAVIOR_OPTIONS}
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
                            label="Widget display page"
                            options={WIDGET_DISPLAY_PAGE_OPTIONS}
                            value={field.value}
                            onChange={field.onChange}
                        />
                    )}
                />
                {/* <Controller
                    name="isEnabled"
                    control={control}
                    render={({ field }) => (
                        <ChoiceList
                            title="Status"
                            choices={[
                                { label: "Enabled", value: "true" },
                                { label: "Disabled", value: "false" },
                            ]}
                            selected={[String(field.value)]}
                            onChange={(value) => field.onChange(value[0] === "true")}
                        />
                    )}
                /> */}
            </InlineGrid>
        </Box>
    );
}

GeneralSettings.propTypes = {
    control: PropTypes.object.isRequired,
    errors: PropTypes.object,
};
