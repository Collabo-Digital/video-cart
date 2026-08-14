import PropTypes from "prop-types";
import { Tooltip, Icon, BlockStack, Text, InlineStack, List } from "@shopify/polaris";
import { InfoIcon } from "@shopify/polaris-icons";

// The tooltip overlay caps at 275px (width="wide") minus 8px of horizontal padding.
const MEDIA_WIDTH = 240;

const MEDIA_STYLE = {
    display: "block",
    width: `${MEDIA_WIDTH}px`, // fixed px — a % width collapses the overlay
    height: "auto", // keeps the asset's real aspect ratio
    borderRadius: "var(--p-border-radius-200)",
    border: "var(--p-border-width-025) solid var(--p-color-border-secondary)",
};

// Polaris only mounts tooltip content while the tooltip is open, so the asset
// is still fetched on hover — whether it's a GIF or a looping muted video.
function TooltipMedia({ src, alt }) {
    if (/\.(mp4|webm)$/i.test(src)) {
        return (
            <video
                src={src}
                aria-label={alt}
                width={MEDIA_WIDTH}
                autoPlay
                loop
                muted
                playsInline
                style={MEDIA_STYLE}
            />
        );
    }

    return <img src={src} alt={alt} width={MEDIA_WIDTH} loading="lazy" style={MEDIA_STYLE} />;
}

TooltipMedia.propTypes = {
    src: PropTypes.string.isRequired,
    alt: PropTypes.string.isRequired,
};

function renderItem(item, index) {
    const { term, description } = typeof item === "string" ? { description: item } : item;

    return (
        <List.Item key={term || index}>
            <Text as="span" variant="bodySm">
                {term ? (
                    <Text as="span" variant="bodySm" fontWeight="semibold">
                        {term}
                    </Text>
                ) : null}
                {term && description ? " — " : null}
                {description}
            </Text>
        </List.Item>
    );
}

export default function InfoTooltip({ content, items, media, width = "default" }) {
    const hasItems = Array.isArray(items) && items.length > 0;
    // Media and bullet lists both need the full 275px overlay to stay readable.
    const isStructured = Boolean(media) || hasItems;

    const body = isStructured ? (
        <BlockStack gap="200">
            {media ? (
                <InlineStack align="center" blockAlign="center" gap="200">
                    <TooltipMedia src={media.src} alt={media.alt} />
                </InlineStack>
            ) : null}
            {content ? (
                <Text as="p" variant="bodySm">
                    {content}
                </Text>
            ) : null}
            {hasItems ? (
                <List type="bullet" gap="extraTight">
                    {items.map(renderItem)}
                </List>
            ) : null}
        </BlockStack>
    ) : (
        content
    );

    return (
        <Tooltip dismissOnMouseOut width={isStructured ? "wide" : width} content={body}>
            <Icon source={InfoIcon} />
        </Tooltip>
    );
}

InfoTooltip.propTypes = {
    content: PropTypes.node,
    items: PropTypes.arrayOf(
        PropTypes.oneOfType([
            PropTypes.string,
            PropTypes.shape({
                term: PropTypes.string,
                description: PropTypes.node,
            }),
        ]),
    ),
    media: PropTypes.shape({
        src: PropTypes.string.isRequired,
        alt: PropTypes.string.isRequired,
    }),
    width: PropTypes.oneOf(["default", "wide"]),
};
