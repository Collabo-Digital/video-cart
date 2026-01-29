
import { Avatar, Button, InlineStack, Text } from "@shopify/polaris";

export default function ResourcePicker() {


    return (
        <>
            <InlineStack align="space-between" blockAlign="center">
                {/* <InlineStack columns={3} gap="200">
                    <Avatar source="https://via.placeholder.com/150" />
                    <Avatar source="https://via.placeholder.com/150" />
                </InlineStack> */}
                <Button >Tag Products</Button>
            </InlineStack>
        </>
    );
}
