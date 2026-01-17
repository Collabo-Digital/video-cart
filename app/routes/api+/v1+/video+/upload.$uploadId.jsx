import { data } from "react-router";
import mux from "../../../../utils/muxClient.server.js";

export const loader = async ({ params }) => {
  const { uploadId } = params;

  if (!uploadId) {
    return data({ error: "Upload ID is required" }, { status: 400 });
  }

  try {
    const upload = await mux.video.uploads.retrieve(uploadId);

    return data({
      id: upload.id,
      status: upload.status,
      asset_id: upload.asset_id,
      error: upload.error,
    }, { status: 200 });
  } catch (error) {
    console.error("Mux upload retrieval error:", error);
    return data(
      { error: "Failed to retrieve upload status" },
      { status: 500 }
    );
  }
};