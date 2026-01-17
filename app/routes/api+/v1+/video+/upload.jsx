import { data } from "react-router";
import mux from "../../../../utils/muxClient.server.js";

export const action = async ({ request }) => {
  if (request.method !== "POST") {
    return data({ error: "Method not allowed" }, { status: 405 });
  }

  try {

    const upload = await mux.video.uploads.create({
      new_asset_settings: {
        playback_policy: ["public"],
        video_quality: "basic",
      },
      cors_origin: "*",
      test: process.env.NODE_ENV !== "production",
    });

    return data({
      uploadId: upload.id,
      url: upload.url,
    }, { status: 200 });
  } catch (error) {
    console.error("Mux upload creation error:", error);
    return data(
      { error: "Failed to create upload URL" },
      { status: 500 }
    );
  }
};