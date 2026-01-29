/* eslint-disable react/prop-types */
import {
  Modal,
  Text,
  TextField,
  Button,
  Banner,
  BlockStack,
  InlineStack,
  Grid,
  Checkbox,
  Thumbnail,
  Spinner,
} from "@shopify/polaris";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SOCIAL_SOURCE } from "../../lib/constants/video";
import { useSocialImport } from "../../lib/hooks/useSocialImport";

function parseUrls(text) {
  return (text || "")
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function SocialImportModal({ source, open, onClose, onImported }) {
  const sourceLabel = source === SOCIAL_SOURCE.INSTAGRAM ? "Instagram" : "TikTok";
  const { resolveUrls, importByUrl, loading, error, setError } = useSocialImport(source);

  const [urlInput, setUrlInput] = useState("");
  const [importing, setImporting] = useState(false);
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(() => new Set());

  useEffect(() => {
    if (!open) return;
    setUrlInput("");
    setImporting(false);
    setError(null);
    setItems([]);
    setSelected(new Set());
  }, [open, setError]);

  const canFetch = useMemo(() => parseUrls(urlInput).length > 0 && !loading, [urlInput, loading]);

  const fetchPreviews = useCallback(async () => {
    const urls = parseUrls(urlInput);
    if (urls.length === 0) {
      setError("Please paste at least one URL");
      return;
    }
    setItems([]);
    setSelected(new Set());
    const results = await resolveUrls(urls);
    setItems(results);
    setSelected(new Set(results.map((r) => r.id)));
  }, [urlInput, resolveUrls, setError]);

  const toggle = useCallback((id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const importSelected = useCallback(async () => {
    if (selected.size === 0) {
      setError("Select at least one video");
      return;
    }
    setImporting(true);
    setError(null);
    try {
      const toImport = items.filter((i) => selected.has(i.id));
      for (const item of toImport) {
        const data = await importByUrl(item.postUrl);
        onImported?.(data);
      }
      onClose();
    } catch (e) {
      setError(e.message || "Import failed");
    } finally {
      setImporting(false);
    }
  }, [selected, items, importByUrl, onImported, onClose, setError]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Import videos from ${sourceLabel}`}
      primaryAction={{
        content: "Import",
        onAction: importSelected,
        loading: importing,
        disabled: importing || selected.size === 0 || items.length === 0,
      }}
      secondaryActions={[
        { content: "Cancel", onAction: onClose, disabled: importing },
      ]}
      large
    >
      <Modal.Section>
        <BlockStack gap="400">
          <Banner tone="info">
            <Text variant="bodySm">
              Paste {sourceLabel} video/post URLs. Private content cannot be imported.
            </Text>
          </Banner>

          {error && (
            <Banner tone="critical" onDismiss={() => setError(null)}>
              {error}
            </Banner>
          )}

          <BlockStack gap="300">
            <TextField
              label={`${sourceLabel} URL(s)`}
              value={urlInput}
              onChange={setUrlInput}
              multiline={4}
              placeholder={`Paste one or more ${sourceLabel} URLs (space/newline separated)`}
              autoComplete="off"
            />
            <InlineStack gap="200">
              <Button onClick={fetchPreviews} disabled={!canFetch} loading={loading}>
                Show videos
              </Button>
            </InlineStack>
          </BlockStack>

          {loading && (
            <InlineStack gap="200" blockAlign="center">
              <Spinner size="small" />
              <Text variant="bodySm" tone="subdued">
                Fetching previews…
              </Text>
            </InlineStack>
          )}

          {items.length > 0 && (
            <BlockStack gap="300">
              <Text variant="headingSm" as="h3">
                Select videos to import
              </Text>
              <Grid>
                {items.map((v) => (
                  <Grid.Cell columnSpan={{ xs: 6, sm: 4, md: 3 }} key={v.id}>
                    <BlockStack gap="200">
                      <div style={{ position: "relative" }}>
                        <Thumbnail
                          source={v.thumbnail || ""}
                          alt={v.title || "Video"}
                          size="large"
                        />
                        <div style={{ position: "absolute", top: 8, left: 8 }}>
                          <Checkbox
                            checked={selected.has(v.id)}
                            onChange={() => toggle(v.id)}
                            label=""
                            labelHidden
                          />
                        </div>
                      </div>
                      <Text variant="bodySm" truncate>
                        {v.title}
                      </Text>
                    </BlockStack>
                  </Grid.Cell>
                ))}
              </Grid>
            </BlockStack>
          )}
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}

