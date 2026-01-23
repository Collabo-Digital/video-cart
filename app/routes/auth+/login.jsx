import { redirect, Form, useLoaderData } from "react-router";
import { login } from "../../config/shopify.server";

export const loader = async ({ request }) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function LoginPage() {
  const { showForm } = useLoaderData();

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.8", padding: "2rem" }}>
      <div style={{ maxWidth: "400px", margin: "0 auto" }}>
        <h1>Log in to Video Cart</h1>
        {showForm && (
          <Form method="post" action="/auth/login" style={{ marginTop: "2rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem" }}>
              <span style={{ display: "block", marginBottom: "0.25rem", fontWeight: "600" }}>
                Shop domain
              </span>
              <input 
                style={{ 
                  padding: "0.5rem", 
                  width: "100%", 
                  border: "1px solid #ccc", 
                  borderRadius: "4px",
                  fontSize: "1rem"
                }} 
                type="text" 
                name="shop" 
                placeholder="my-shop-domain.myshopify.com"
              />
              <span style={{ display: "block", marginTop: "0.25rem", fontSize: "0.875rem", color: "#666" }}>
                e.g: my-shop-domain.myshopify.com
              </span>
            </label>
            <button 
              style={{ 
                marginTop: "1rem", 
                padding: "0.75rem 1.5rem", 
                backgroundColor: "#5469d4", 
                color: "white", 
                border: "none", 
                borderRadius: "4px", 
                cursor: "pointer",
                width: "100%",
                fontSize: "1rem",
                fontWeight: "600"
              }} 
              type="submit"
            >
              Log in
            </button>
          </Form>
        )}
      </div>
    </div>
  );
}
