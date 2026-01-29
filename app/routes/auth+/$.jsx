import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../../config/shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
