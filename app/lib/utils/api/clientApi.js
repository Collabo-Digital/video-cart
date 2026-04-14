
/**
 * GETs a JSON response from the given path and returns the response data.
 * @param {string} path - The path to GET from.
 * @returns {Promise<object>} The response data.
 */
export async function getJson(path) {

    const response = await fetch(path, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });
    return response.json();
}

/**
 * POSTs a JSON body to the given path and returns the response data.
 * @param {string} path - The path to POST to.
 * @param {object} body - The body to POST.
 * @returns {Promise<object>} The response data.
 */
export async function postJson(path, body) {
    const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
    });

    let data;
    try {
        data = await response.json();
    } catch {
        throw new Error("Invalid JSON response");
    }

    if (!response.ok || !data?.success) {
        const message = data?.error || `Request failed with status ${response.status}`;
        throw new Error(message);
    }

    return data?.data;
}
