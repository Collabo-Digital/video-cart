// app/lib/utils/feedsApi.js
import { postJson } from "./clientApi";
import { API_BASE_ENDPOINT } from "../../constants/common";

export async function fetchFeeds(filtersPayload = {}) {
    return postJson(API_BASE_ENDPOINT + "/feeds/list", { filters: filtersPayload });
}