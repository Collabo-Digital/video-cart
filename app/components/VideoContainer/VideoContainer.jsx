// Simple component to display and play videos
import { MediaCard, VideoThumbnail } from "@shopify/polaris";
import { useState } from "react";

export default function VideoDisplay({ videos }) {
  const [playingVideo, setPlayingVideo] = useState(null);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  console.log("Videos received:", videos); // Debug log

  return (
    <>
      {/* Video Grid */}
      {/* <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", 
        gap: "20px",
        padding: "20px"
      }}> */}
        {videos && videos.length > 0 ? (
          videos.map((video) => (
            <MediaCard
              key={video.id}
              portrait
              title={video.title}
              primaryAction={{
                content: "Play Video",
                onAction: () => setPlayingVideo(video),
              }}
              description={`Duration: ${formatDuration(video.duration)} • ${video.aspectRatio}`}
              size="small"
            >
              <VideoThumbnail
                videoLength={Math.round(video.duration)}
                thumbnailUrl={`https://image.mux.com/${video.videoPlaybackId}/thumbnail.jpg?width=640&height=360&time=1`}
                onClick={() => setPlayingVideo(video)}
              />
            </MediaCard>
          ))
        ) : (
          <p>No videos found</p>
        )}
      {/* </div> */}

      {/* Video Player Modal */}
      {playingVideo && (
        <div
          onClick={() => setPlayingVideo(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.9)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "1200px", width: "100%" }}
          >
            {/* Close Button */}
            <button
              onClick={() => setPlayingVideo(null)}
              style={{
                position: "absolute",
                top: "20px",
                right: "20px",
                background: "white",
                border: "none",
                borderRadius: "4px",
                padding: "10px 20px",
                cursor: "pointer",
                fontSize: "16px",
                fontWeight: "bold",
              }}
            >
              ✕ Close
            </button>

            {/* Video Player */}
            <div style={{ position: "relative", paddingBottom: "56.25%", height: 0 }}>
              <iframe
                src={`https://stream.mux.com/${playingVideo.videoPlaybackId}.html?autoplay=true`}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  border: 0,
                }}
                allow="autoplay; fullscreen"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}