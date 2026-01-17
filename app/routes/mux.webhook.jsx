import prisma from "../db.server";
import mux from "../utils/muxClient.server"



export const action = async ({ request }) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const body = await request.text();

  let event;
  try {
    event = mux.webhooks.unwrap(
      body,
      request.headers,
      process.env.MUX_WEBHOOK_SIGNING_SECRET
    );
  } catch (err) {
    console.error("Mux webhook signature verification failed", err);
    return new Response("Invalid signature", { status: 400 });
  }

  console.log("Mux webhook event", event.type);

  switch (event.type) {
    case "video.asset.ready": {
      const {
        upload_id,
        id: assetId,
        playback_ids,
        duration,
        aspect_ratio,
      } = event.data;

      const playbackId = playback_ids?.[0]?.id;

      if (!upload_id || !assetId) {
        console.error("Missing upload_id or assetId");
        break;
      }

      await prisma.video.upsert({
        where: { videoUploadId: upload_id }, 
        update: {
          videoAssetId: assetId,
          videoPlaybackId: playbackId,
          duration,
          aspectRatio: aspect_ratio,
          status: "READY",
        },
        create: {
          title: "Untitled Video",   
          serviceProvider: "mux",
          videoUploadId: upload_id,
          videoAssetId: assetId,
          videoPlaybackId: playbackId,
          duration,
          aspectRatio: aspect_ratio,
          status: "READY",
        },
      });

      console.log("Video upserted for upload:", upload_id);
      break;
    }

    case "video.asset.errored": {
      const { upload_id } = event.data;

      if (!upload_id) break;

      await prisma.video.upsert({
        where: { videoUploadId: upload_id },
        update: { status: "ERRORED" },
        create: {
          title: "Untitled Video",
          serviceProvider: "mux",
          videoUploadId: upload_id,
          status: "ERRORED",
        },
      });

      console.log("Video upserted as ERRORED:", upload_id);
      break;
    }

    default:
      console.log("Unhandled Mux event:", event.type);
      break;
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
};