import {
  BlockStack,
  Card,
  Text,
  InlineStack,
  Box,
  Button,
  Badge,
  ButtonGroup,
  Icon,
  Divider
} from '@shopify/polaris';
import { CheckIcon, StatusActiveIcon } from '@shopify/polaris-icons';
import { useNavigate } from 'react-router';

export const PricingCard = ({
  id,
  title,
  value,
  featuredText,
  description,
  features,
  price,
  frequency,
}) => {
  const navigate = useNavigate();

  const handleSelectSubscription = async (plan) => {
    const response = await fetch(`/api/v1/pricing/selectSubscription`, {
      method: 'POST',
      body: JSON.stringify({ plan: plan }),
    });
    const data = await response.json();
    console.log(data);
  }

  const downgradeSubscription = async (plan) => {
    const response = await fetch(`/api/v1/pricing/cancelSubscription`, {
      method: 'POST',
      body: JSON.stringify({ plan: plan }),
    });
    const data = await response.json();
    console.log(data);
  }

  return (
    <div
      style={{
        // width: '18rem',
        // boxShadow: featuredText ? '0px 0px 15px 4px #CDFEE1' : 'none',
        // borderRadius: '.75rem',
        position: 'relative',
        // zIndex: '0'
      }}
    >
      {featuredText ? (
        <div style={{ position: 'absolute', top: '-8px', right: '15px', zIndex: '100' }}>
          <Badge size='large' tone='magic'>
            {featuredText}
          </Badge>
        </div>
      ) : null}
      {value === 'free' ? (
        <Card>
        <InlineStack gap='400' blockAlign='start' inlineAlign='start' align='start'>
          <Box paddingBlockStart='200' borderInlineEndWidth='050' b borderColor='border-disabled' paddingInlineEnd='600'>
          <BlockStack gap='400' align='center' blockAlign='center' inlineAlign='center'>
            <Text as='h3' variant='headingLg'>
              {title}
            </Text>
            <Text as='h2' variant='heading2xl'>
              ${price}<Text as='span' variant='bodySm' tone='subdued'>/month</Text>
            </Text>
            {description ? (
              <Text as='p' variant='bodySm' tone='subdued'>
                {description}
              </Text>
            ) : null}
            <Button disabled={featuredText} onClick={() => downgradeSubscription(title)} fullWidth={true} variant="primary" size="slim">{featuredText ? "Selected" : `Choose ${title}`}</Button>
             <Box paddingBlockStart='200' background='bg-surface-secondary' borderRadius='200' paddingInline='200' paddingBlock='100' width='100%'>
              <Text as='p' variant='bodyMd' fontWeight='semibold' alignment='center'>Free forever</Text>
             </Box>
          </BlockStack>

            </Box>
          

          <InlineStack blockAlign='end' gap='100' align='start'>
            
            {/* <Box paddingBlockEnd='200'> */}
              {/* <Text as='p' variant='bodySm'>
                / {frequency}
              </Text> */}
            {/* </Box> */}
          </InlineStack>

          <BlockStack gap='300'>
            <Text as='p' variant='bodyLg' fontWeight='semibold'>Features</Text>
            {features?.map((feature, id) => (
              <InlineStack gap='100' align='start' key={id}>
              <BlockStack gap='100' align='start' key={id}>
                <Icon source={StatusActiveIcon} tone='success' />
              </BlockStack>
              <Text tone='subdued' as='p' variant='bodyMd' key={id}>
                {feature}
              </Text>
              </InlineStack>
            ))}
          </BlockStack>

         
        </InlineStack>
      </Card>
      ) : (
        <Card>
        <BlockStack gap='400'>
          <BlockStack gap='400' align='center' blockAlign='center' inlineAlign='center'>
            <Text as='h3' variant='headingLg'>
              {title}
            </Text>
            <Text as='h2' variant='heading2xl'>
              ${price}<Text as='span' variant='bodySm' tone='subdued'>/month</Text>
            </Text>
            {description ? (
              <Text as='p' variant='bodySm' tone='subdued'>
                {description}
              </Text>
            ) : null}
            <Button disabled={featuredText} onClick={() => handleSelectSubscription(title)} fullWidth={true} variant="primary" size="slim">{featuredText ? "Selected" : `Choose ${title}`}</Button>
             
          </BlockStack>

          <InlineStack blockAlign='end' gap='100' align='start'>
            
            {/* <Box paddingBlockEnd='200'> */}
              {/* <Text as='p' variant='bodySm'>
                / {frequency}
              </Text> */}
            {/* </Box> */}
          </InlineStack>

          <BlockStack gap='200'>
            <Text as='p' variant='bodyLg' fontWeight='semibold'>Features</Text>
            {features?.map((feature, id) => (
              <InlineStack gap='100' align='start' key={id}>
              <BlockStack gap='100' align='start' key={id}>
                <Icon source={StatusActiveIcon} tone='success' />
              </BlockStack>
              <Text tone='subdued' as='p' variant='bodyMd' key={id}>
                {feature}
              </Text>
              </InlineStack>
            ))}
          </BlockStack>

         
        </BlockStack>
      </Card>
      )}
    </div>
  );
};
