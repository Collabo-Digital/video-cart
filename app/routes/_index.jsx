import { redirect, Form, useLoaderData } from "react-router";
import { login } from "../config/shopify.server";

export const loader = async ({ request }) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function Index() {
  const { showForm } = useLoaderData();

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.8", padding: "2rem" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        <h1>Video Cart - Shopify App</h1>
        <p>
          A powerful video commerce solution for your Shopify store.
        </p>
        {showForm && (
          <Form method="post" action="/auth/login" style={{ marginTop: "2rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem" }}>
              <span style={{ display: "block", marginBottom: "0.25rem" }}>Shop domain</span>
              <input 
                style={{ 
                  padding: "0.5rem", 
                  width: "100%", 
                  border: "1px solid #ccc", 
                  borderRadius: "4px" 
                }} 
                type="text" 
                name="shop" 
                placeholder="my-shop-domain.myshopify.com"
              />
            </label>
            <button 
              style={{ 
                marginTop: "1rem", 
                padding: "0.75rem 1.5rem", 
                backgroundColor: "#5469d4", 
                color: "white", 
                border: "none", 
                borderRadius: "4px", 
                cursor: "pointer" 
              }} 
              type="submit"
            >
              Log in
            </button>
          </Form>
        )}
        <ul style={{ marginTop: "2rem" }}>
          <li>
            <strong>Video Management</strong>. Upload and manage shoppable videos.
          </li>
          <li>
            <strong>Analytics</strong>. Track video performance and conversions.
          </li>
          <li>
            <strong>Easy Integration</strong>. Seamlessly integrate with your Shopify store.
          </li>
        </ul>
      </div>
    </div>
  );
}
