import { authenticate } from "../../config/shopify.server";

export const action = async ({ request }) => {
  try {
    // Clone the request before passing it to authenticate.webhook()
    const requestClone = request.clone();
    
    // Get the raw body first
    const rawBody = await request.text();
    const payload = JSON.parse(rawBody);
    
    try {
      // Now use the cloned request for authentication
      const { shop, topic } = await authenticate.webhook(requestClone);

      console.log(`Received ${topic} webhook from ${shop}`);

      switch (topic) {
        case "customers/data_request":
          //Logic for requesting custoers data goes here...
          console.log(`📌 No customer data stored. Responding to data request for shop: ${shop}`);
          
          break;

        case "customers/redact":
          //Logic for removing customer data goes here...
          console.log(`📌 No customer data stored. Ignoring redaction request for shop: ${shop}`);
          break;

        case "shop/redact":
          //Logic for removing shop data goes here...
          console.log(`📌 No shop data stored. Acknowledging shop deletion request for shop: ${shop}`);
          break;

        default:
          console.warn(`❌ Unhandled webhook topic: ${topic}`);
          return new Response("Unhandled webhook topic", { status: 400 });
      }

      // Return 200 only if authentication and processing succeeded
      return new Response("Webhook received", { status: 200 });

    } catch (authError) {
      // Specifically handle HMAC validation failures
      console.error("🔒 Webhook authentication failed:", authError);
      return new Response("Webhook HMAC validation failed", { status: 401 });
    }

  } catch (error) {
    // Handle other types of errors (like JSON parsing)
    console.error("🚨 Webhook processing error:", error);
    return new Response("Error processing webhook", { status: 500 });
  }
};