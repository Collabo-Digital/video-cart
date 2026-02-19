/* eslint-disable react/prop-types */
import {
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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SOCIAL_SOURCE } from "../../lib/constants/video";
import { useSocialImport } from "../../lib/hooks/useSocialImport";

function parseUrls(text) {
  return (text || "")
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const MODAL_IDS = {
  [SOCIAL_SOURCE.INSTAGRAM]: "social-import-instagram",
  [SOCIAL_SOURCE.TIKTOK]: "social-import-tiktok",
};

export default function SocialImportModal({ source, open, onClose, onImported }) {
  const sourceLabel = source === SOCIAL_SOURCE.INSTAGRAM ? "Instagram" : "TikTok";
  const modalRef = useRef(null);
  const { resolveUrls, importByUrl, loading, error, setError } = useSocialImport(source);

  const [urlInput, setUrlInput] = useState("");
  const [importing, setImporting] = useState(false);
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(() => new Set());

  useEffect(() => {
    const el = modalRef.current;
    if (!el) return;
    if (open) {
      el.showOverlay?.();
      setUrlInput("");
      setImporting(false);
      setError(null);
      setItems([]);
      setSelected(new Set());
    } else {
      el.hideOverlay?.();
    }
  }, [open, setError]);

  useEffect(() => {
    const el = modalRef.current;
    if (!el) return;
    const handleAfterHide = () => onClose?.();
    el.addEventListener("afterhide", handleAfterHide);
    return () => el.removeEventListener("afterhide", handleAfterHide);
  }, [onClose]);

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
      modalRef.current?.hideOverlay?.();
      onClose?.();
    } catch (e) {
      setError(e.message || "Import failed");
    } finally {
      setImporting(false);
    }
  }, [selected, items, importByUrl, onImported, onClose, setError]);

  const modalId = MODAL_IDS[source];
  const isImportDisabled = importing || selected.size === 0 || items.length === 0;

  return (
    <s-modal
      ref={modalRef}
      id={modalId}
      heading={`Import videos from ${sourceLabel}`}
      size="large"
    >
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

      <s-button
        slot="primary-action"
        variant="primary"
        disabled={isImportDisabled}
        onClick={importSelected}
      >
        {importing ? "Importing…" : "Import"}
      </s-button>
      <s-button
        slot="secondary-actions"
        variant="secondary"
        commandFor={modalId}
        command="--hide"
        disabled={importing}
      >
        Cancel
      </s-button>
    </s-modal>
  );
}

