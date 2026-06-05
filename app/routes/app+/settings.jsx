import { Banner, BlockStack, Card, Page } from "@shopify/polaris";
import { useActionData, useLoaderData, useNavigation, useSubmit } from "react-router";
import { SaveBar, useAppBridge } from "@shopify/app-bridge-react";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { authenticate } from "../../config/shopify.server";
import { apiError, apiSuccess } from "../../lib/utils/apiResponse";
import { getAppSettingsFormDefaults } from "../../lib/constants/globalSettings";
import { captureRouteError } from "../../lib/utils/observability/errorCapture.server";
import * as GlobalSettingsModel from "../../models/globalSettings.server";
import * as FeedModel from "../../models/feed.server";
import { SettingsTab } from "../../components/SettingsTab/Index";

const SAVE_BAR_ID = "app-settings-save-bar";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  try {
    const [globalSettingsRecord, feeds] = await Promise.all([
      GlobalSettingsModel.findByShopDomain(session.shop),
      FeedModel.findAll({ shopDomain: session.shop }),
    ]);
    return apiSuccess({
      appSettings: globalSettingsRecord?.settings ?? null,
      feeds: feeds.map((f) => ({ id: f.id, feedName: f.feedName, widgetType: f.widgetType })),
    });
  } catch (error) {
    captureRouteError(error, {
      route: "settings-loader",
      url: request.url,
      method: request.method,
      shop: session?.shop ?? "unknown",
    });
    return apiError(error, { route: "settings", code: "FETCH_SETTINGS_ERROR", statusCode: 500 });
  }
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  try {
    const formData = await request.formData();
    const settings = JSON.parse(formData.get("appSettings") ?? "{}");
    await GlobalSettingsModel.upsertByShopDomain(session.shop, settings);
    return apiSuccess({ saved: true });
  } catch (error) {
    captureRouteError(error, {
      route: "settings-action",
      url: request.url,
      method: request.method,
      shop: session?.shop ?? "unknown",
    });
    return apiError(error, { route: "settings", code: "SAVE_SETTINGS_ERROR", statusCode: 400 });
  }
};

export default function SettingsPage() {
  const loaderData = useLoaderData();
  const { appSettings = null, feeds = [] } = loaderData?.data ?? {};

  const actionData = useActionData();
  const navigation = useNavigation();
  const submit = useSubmit();
  const shopify = useAppBridge();

  const [settingsTab, setSettingsTab] = useState(0);
  const formDefaults = getAppSettingsFormDefaults(appSettings);

  const {
    control,
    watch,
    reset,
    setValue,
    formState: { errors, isDirty },
  } = useForm({ values: formDefaults });

  const isSubmitting = navigation.state === "submitting";

  useEffect(() => {
    if (!shopify) return;
    isDirty
      ? shopify.saveBar.show(SAVE_BAR_ID)
      : shopify.saveBar.hide(SAVE_BAR_ID);
    return () => shopify?.saveBar?.hide(SAVE_BAR_ID);
  }, [isDirty, shopify]);

  const handleSave = useCallback(() => {
    const values = watch();
    submit({ appSettings: JSON.stringify(values.settings) }, { method: "post" });
    shopify.toast.show("Settings saved", { isSuccess: true });
    shopify?.saveBar?.hide(SAVE_BAR_ID);
  }, [watch, submit, shopify]);

  const handleDiscard = useCallback(() => {
    reset(formDefaults);
    shopify?.saveBar?.hide(SAVE_BAR_ID);
  }, [reset, formDefaults, shopify]);

  return (
    <>
      <Page
        title="Global Settings"
        subtitle="Manage Video Discovery, storefront presentation, and customer-facing messaging across your store."
      >
        <BlockStack gap="400">
          {actionData?.error && (
            <Banner tone="critical" onDismiss={() => {}}>
              {actionData.error}
            </Banner>
          )}
          <Card padding="0">
            <SettingsTab
              control={control}
              watch={watch}
              errors={errors}
              setValue={setValue}
              selectedTab={settingsTab}
              onTabChange={setSettingsTab}
              mode="global"
              feeds={feeds}
            />
          </Card>
        </BlockStack>
      </Page>

      <SaveBar id={SAVE_BAR_ID} discardConfirmation>
        <button
          variant="primary"
          onClick={handleSave}
          disabled={isSubmitting}
          {...(isSubmitting && { loading: "" })}
        />
        <button onClick={handleDiscard} disabled={isSubmitting} />
      </SaveBar>
    </>
  );
}