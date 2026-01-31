import { useState } from 'react';
import { Controller } from 'react-hook-form';
import PropTypes from 'prop-types';
import { Card, Box, InlineStack, Text, Collapsible, Icon, BlockStack, TextField, Select, ChoiceList } from '@shopify/polaris';
import { ChevronUpIcon, ChevronDownIcon, SettingsIcon, PlayCircleIcon, ProductIcon } from "@shopify/polaris-icons";

const WIDGET_TYPE_OPTIONS = [
  { label: 'Carousel', value: 'carousel' },
  { label: 'Grid', value: 'grid' },
];

/**
 * Accordion
 *
 * Settings form rendered as accordion sections. Receives react-hook-form control
 * so all fields are part of the parent form and can be submitted together.
 * Extensible for future sections/fields via control and defaultValues.
 *
 * @param {Object} props
 * @param {import('react-hook-form').Control} props.control - Form control from useForm
 * @param {import('react-hook-form').FieldErrors} [props.errors] - Form errors
 */
export function Accordion({ control, errors = {} }) {
  const [expanded, setExpanded] = useState(0);

  const buildItems = () => [
    {
      id: 0,
      title: 'General',
      icon: SettingsIcon,
      content: (
        <BlockStack gap="200">
          <Controller
            name="feedName"
            control={control}
            rules={{
              required: 'Feed name is required',
              minLength: { value: 3, message: 'Feed name must be at least 3 characters' },
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
            name="isEnabled"
            control={control}
            render={({ field }) => (
              <ChoiceList
                title="Status"
                choices={[
                  { label: 'Enabled', value: 'true' },
                  { label: 'Disabled', value: 'false' },
                ]}
                selected={[String(field.value)]}
                onChange={(value) => field.onChange(value[0] === 'true')}
              />
            )}
          />
        </BlockStack>
      ),
    },
    {
      id: 1,
      title: 'Design',
      icon: PlayCircleIcon,
      content: (
        <Text as="p" tone="subdued">
          Design options will be available here in a future update.
        </Text>
      ),
    },
    {
      id: 2,
      title: 'Translations',
      icon: ProductIcon,
      content: (
        <BlockStack gap="200">
          <Controller
            name="settings.translation.carouselTitle"
            control={control}
            render={({ field }) => (
              <TextField
                label="Carousel Title"
                value={field.value ?? ''}
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
                value={field.value ?? ''}
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
                value={field.value ?? ''}
                onChange={field.onChange}
                autoComplete="off"
              />
            )}
          />
        </BlockStack>
      ),
    },
  ];

  const items = buildItems();

  return (
    <Card padding="0">
      {items.map(({ title, id, content, icon }) => {
        const isExpanded = expanded === id;
        return (
          <Box
            borderBlockEndWidth="025"
            borderColor="border"
            background="bg-surface-secondary"
            key={id}
          >
            <Box paddingBlock="300" paddingInline="400">
              <div
                style={{ cursor: 'pointer' }}
                onClick={() => setExpanded((prev) => (id === prev ? null : id))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setExpanded((prev) => (id === prev ? null : id));
                  }
                }}
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
              >
                <InlineStack align="space-between" blockAlign="center">
                  <InlineStack gap="200">
                    {icon && <Icon source={icon} width="1.5rem" height="1.5rem" />}
                    <Text variant="headingSm" as="p">
                      {title}
                    </Text>
                  </InlineStack>
                  {isExpanded ? (
                    <ChevronUpIcon width="1.5rem" height="1.5rem" />
                  ) : (
                    <ChevronDownIcon width="1.5rem" height="1.5rem" />
                  )}
                </InlineStack>
              </div>
            </Box>
            <Collapsible open={isExpanded}>
              <Box padding="400" background="bg-surface">
                {content}
              </Box>
            </Collapsible>
          </Box>
        );
      })}
    </Card>
  );
}

Accordion.propTypes = {
  control: PropTypes.object.isRequired,
  errors: PropTypes.object,
};
