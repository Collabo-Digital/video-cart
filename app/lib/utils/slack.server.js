const SLACK_INSTALL_WEBHOOK_URL = process.env.SLACK_INSTALL_WEBHOOK_URL;

export async function notifyShopInstall({ shopDomain, name, email, plan }) {
    if (!SLACK_INSTALL_WEBHOOK_URL) {
        console.warn("SLACK_INSTALL_WEBHOOK_URL not set, skipping notification");
        return;
    }

    const payload = {
        text: `🎉 New App Install!`,
        blocks: [
            {
                type: "header",
                text: { type: "plain_text", text: "🎉 New App Install!" },
            },
            {
                type: "section",
                fields: [
                    { type: "mrkdwn", text: `*Shop:*\n${name || "N/A"}` },
                    { type: "mrkdwn", text: `*Domain:*\n${shopDomain}` },
                    { type: "mrkdwn", text: `*Email:*\n${email || "N/A"}` },
                    { type: "mrkdwn", text: `*Plan:*\n${plan || "N/A"}` },
                ],
            },
        ],
    };

    try {
        const res = await fetch(SLACK_INSTALL_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            console.error("Slack webhook failed:", res.status, await res.text());
        }
    } catch (error) {
        console.error("Slack notification error:", error.message);
    }
}