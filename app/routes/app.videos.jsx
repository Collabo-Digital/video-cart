import {
  Page,
  Button,
  Popover,
  ActionList,
  Modal,
  TextContainer,
  Frame,
  DropZone,
  MediaCard,
  VideoThumbnail,
  
} from "@shopify/polaris";
import { useState, useCallback } from "react";
import VideoUploader from "../components/VideoUploader/VideoUploader";
import VideoDisplay from "../components/VideoContainer/VideoContainer";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { useLoaderData } from "react-router";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  const videos = await prisma.video.findMany();
  console.log(videos);
  return { videos };
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
