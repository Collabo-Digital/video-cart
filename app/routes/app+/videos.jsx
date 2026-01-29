
import {
  Page,
  Frame,
} from "@shopify/polaris";
import { useLoaderData } from "react-router";
import VideoUploader from "../../components/VideoUploader/VideoUploader";
import VideoDisplay from "../../components/VideoContainer/VideoContainer";
import { authenticate } from "../../config/shopify.server";
import * as VideoModel from "../../models/video.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  const videos = await VideoModel.findAll();
  console.log(videos);
  return new Response(
    JSON.stringify({ videos }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
};

export default function VideosPage() {

  const { videos } = useLoaderData();
 

  return (
    <Frame>
      <Page title="Videos Library">

       <VideoUploader />

      <VideoDisplay videos={videos} />

      </Page>
    </Frame>
  );
}
