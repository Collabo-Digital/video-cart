// app/lib/utils/feedsApi.js
import { postJson } from "./clientApi";
import { API_BASE_ENDPOINT } from "../../constants/common";

async function selectSubscription(plan) {
    return postJson(API_BASE_ENDPOINT + "/pricing/selectSubscription", { plan });
}

async function cancelSubscription(plan) {
    return postJson(API_BASE_ENDPOINT + "/pricing/cancelSubscription", { plan });
}

export { selectSubscription, cancelSubscription };
