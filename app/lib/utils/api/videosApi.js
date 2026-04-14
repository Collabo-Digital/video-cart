import { postJson } from "./clientApi";
import { API_BASE_ENDPOINT } from "../../constants/common";

export async function fetchVideos(filtersPayload = {}) {
    return postJson(API_BASE_ENDPOINT + "/videos/filter", { filters: filtersPayload });
}