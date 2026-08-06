// app/routes/_index.jsx  — replace the whole file
import { redirect } from "react-router";
import { authenticate } from "../config/shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return redirect("/app");
};