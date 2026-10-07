import {
  API_BASE_URL,
  getRefreshToken,
  refreshAccessTokenOnce,
} from "../utils/api";

/* ================================
   SETTINGS
================================ */

// Image conversions are quick; PDF work can take longer.
const IMAGE_TIMEOUT_MS = 90 * 1000;
const PDF_TIMEOUT_MS = 4 * 60 * 1000;

// Wait before the single automatic retry (server waking up).
const RETRY_DELAY_MS = 2500;

/* ================================
   DOWNLOAD URL
================================ */

function resolveDownloadUrl(downloadUrl) {
  if (!downloadUrl) {
    return "";
  }

  /*
   * Backend may return:
   *
   * /api/outputs/file.zip
   * /outputs/file.zip
   * https://everything-backend-.../api/outputs/file.zip
   */

  try {
    return new URL(downloadUrl, API_BASE_URL).toString();
  } catch {
    return downloadUrl;
  }
}

/* ================================
   RESPONSE
================================ */

async function parseResponse(response) {
  const text = await response.text();

  let data;

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    const error = new Error(
      response.status === 413
        ? "File is too large. Please upload a smaller file."
        : response.status >= 500
          ? "The server is busy right now. Please try again in a moment."
          : `Server returned an invalid response (${response.status}).`
    );

    error.status = response.status;

    error.data = {
      success: false,
      message: error.message,
    };

    throw error;
  }

  if (!response.ok || data.success === false) {
    const error = new Error(data.message || "Conversion failed.");

    error.status = response.status;
    error.data = data;

    throw error;
  }

  return data;
}

/* ================================
   LOW-LEVEL REQUEST
================================ */

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function authHeaders() {
  const token = localStorage.getItem("accessToken");

  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function requestOnce(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        ...authHeaders(),
      },
      credentials: "include",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

function friendlyNetworkError(error) {
  const friendly =
    error?.name === "AbortError"
      ? new Error(
          "The server took too long to answer. Please try again."
        )
      : new Error(
          "Cannot reach the server. Check your internet connection and try again."
        );

  friendly.cause = error;
  friendly.status = 0;

  return friendly;
}

/*
 * Sends the request with:
 *  - a timeout (no endless spinner),
 *  - ONE shared token-refresh (same one the rest of the app uses,
 *    so two refreshes can never race and log the user out),
 *  - ONE automatic retry when the free server is still waking up.
 */
async function authenticatedFetch(url, options = {}, timeoutMs) {
  let response;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      response = await requestOnce(url, options, timeoutMs);
    } catch (error) {
      // Network failure / cold start: retry once, then give up politely.
      if (attempt === 0 && error?.name !== "AbortError") {
        await sleep(RETRY_DELAY_MS);
        continue;
      }

      throw friendlyNetworkError(error);
    }

    // 502 / 503 = proxy up, app still booting. Safe to retry once.
    if (attempt === 0 && (response.status === 502 || response.status === 503)) {
      await sleep(RETRY_DELAY_MS);
      continue;
    }

    break;
  }

  /* ACCESS TOKEN EXPIRED -> refresh once, then repeat the request. */
  if (response.status === 401 && getRefreshToken()) {
    const newToken = await refreshAccessTokenOnce();

    if (newToken) {
      try {
        response = await requestOnce(url, options, timeoutMs);
      } catch (error) {
        throw friendlyNetworkError(error);
      }
    }
  }

  return response;
}

async function postFile(endpoint, file, outputFormat, timeoutMs) {
  const formData = new FormData();

  formData.append("file", file);

  if (outputFormat) {
    formData.append("outputFormat", outputFormat);
  }

  const response = await authenticatedFetch(
    `${API_BASE_URL}${endpoint}`,
    {
      method: "POST",
      body: formData,
    },
    timeoutMs
  );

  const data = await parseResponse(response);

  return {
    ...data,
    downloadUrl: resolveDownloadUrl(data.downloadUrl),
  };
}

/* ================================
   IMAGE → IMAGE
================================ */

export function convertImage(file, outputFormat) {
  return postFile(
    "/converter/image",
    file,
    outputFormat,
    IMAGE_TIMEOUT_MS
  );
}

/* ================================
   IMAGE → PDF
================================ */

export function convertImageToPdf(file) {
  return postFile("/pdf/image-to-pdf", file, null, PDF_TIMEOUT_MS);
}

/* ================================
   PDF → IMAGE
================================ */

export function convertPdfToImage(file, outputFormat) {
  return postFile(
    "/pdf/pdf-to-image",
    file,
    outputFormat,
    PDF_TIMEOUT_MS
  );
}
