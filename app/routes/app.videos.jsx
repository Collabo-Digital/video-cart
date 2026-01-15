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

export default function VideosPage() {
  const [popoverActive, setPopoverActive] = useState(false);
  const [modalActive, setModalActive] = useState(false);

  // Toggle popover
  const togglePopover = useCallback(
    () => setPopoverActive((active) => !active),
    []
  );

  // Toggle modal
  const toggleModal = useCallback(
    () => setModalActive((active) => !active),
    []
  );

  // Action handlers
  const handleUploadVideo = useCallback(() => {
    setPopoverActive(false); // close popover
    setModalActive(true); // open modal
  }, []);

  const handleExportFile = useCallback(() => {
    setPopoverActive(false);
    console.log("Exported action");
  }, []);

  const activator = (
    <Button onClick={togglePopover} disclosure>
      More actions
    </Button>
  );

  return (
    <Frame>
      <Page title="Videos Library">

        {/* <div style={{ height: "250px" }}> */}
          <Popover
            active={popoverActive}
            activator={activator}
            autofocusTarget="first-node"
            onClose={togglePopover}
          >
            <ActionList
              actionRole="menuitem"
              items={[
                {
                  content: "Upload video",
                  onAction: handleUploadVideo,
                },
                {
                  content: "Export file",
                  onAction: handleExportFile,
                },
              ]}
            />
          </Popover>
        {/* </div> */}

        {/* ✅ Polaris Modal */}
        <Modal
          open={modalActive}
          onClose={toggleModal}
          title="Upload a new video"
          primaryAction={{
            content: "Upload",
            onAction: toggleModal,
          }}
          secondaryActions={[
            {
              content: "Cancel",
              onAction: toggleModal,
            },
          ]}
        >
          <Modal.Section>
            <TextContainer>
              <DropZone type="video">

              </DropZone>
              <p>
                Upload your video to make it shoppable. You can tag products
                after upload.
              </p>
            </TextContainer>
          </Modal.Section>
        </Modal>

        
      <MediaCard
      portrait
      title="Turn your side-project into a business"
      primaryAction={{
        content: 'Learn more',
        onAction: () => {},
      }}
      description="In this course, you’ll learn how the Kular family turned their mom’s recipe book into a global business."
      popoverActions={[{content: 'Dismiss', onAction: () => {}}]}
      size="small"
    >
      <VideoThumbnail
        videoLength={40}
        thumbnailUrl="https://burst.shopifycdn.com/photos/business-woman-smiling-in-office.jpg?width=1850"
        onClick={() => console.log('clicked')}
      />
    </MediaCard>

      </Page>
    </Frame>
  );
}
