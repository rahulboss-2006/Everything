const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

/*
  The free backend can need 30-60 seconds to wake up after being idle.
  A 15 s limit made the very first request fail with "timed out".
*/
const REQUEST_TIMEOUT = 45000;

export const getAccessToken = () =>
  localStorage.getItem(ACCESS_TOKEN_KEY);

export const getRefreshToken = () =>
  localStorage.getItem(REFRESH_TOKEN_KEY);

export const setAccessToken = (accessToken) => {
  if (accessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  } else {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
};

export const setRefreshToken = (refreshToken) => {
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
};

export const setTokens = (accessToken, refreshToken = null) => {
  if (accessToken) {
    setAccessToken(accessToken);
  }

  if (refreshToken) {
    setRefreshToken(refreshToken);
  }
};

export const clearTokens = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

const createTimeoutSignal = (timeout = REQUEST_TIMEOUT) => {
  const controller = new AbortController();

  const timer = setTimeout(() => {
    controller.abort();
  }, timeout);

  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timer),
  };
};

const isAuthEndpoint = (endpoint) => {
  const cleanEndpoint = endpoint.split("?")[0];

  return (
    cleanEndpoint === "/auth/refresh" ||
    cleanEndpoint === "/auth/login" ||
    cleanEndpoint === "/auth/logout"
  );
};

const rawApiRequest = async (
  endpoint,
  options = {},
  { skipAuth = false } = {}
) => {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  const token = getAccessToken();

  if (!skipAuth && token && !isAuthEndpoint(endpoint)) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const timeout = createTimeoutSignal();

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: "include",
      signal: timeout.signal,
    });

    return response;
  } finally {
    timeout.cleanup();
  }
};

let refreshPromise = null;

const refreshAccessTokenInternal = async () => {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    clearTokens();
    return null;
  }

  let response;

  try {
    response = await rawApiRequest(
      "/auth/refresh",
      {
        method: "POST",
        body: JSON.stringify({
          refreshToken,
        }),
      },
      {
        skipAuth: true,
      }
    );
  } catch {
    /*
      Network problem / server still waking up: that is NOT a logout.
      Keep the tokens so the user is still signed in on the next try.
    */
    return null;
  }

  if (!response.ok) {
    /*
      Another browser tab may have just rotated the token (the old one is
      then rejected). If a different token is now stored, use that instead
      of throwing the session away.
    */
    const storedNow = getRefreshToken();

    if (response.status === 401 && storedNow && storedNow !== refreshToken) {
      const latestAccess = getAccessToken();

      if (latestAccess) {
        return latestAccess;
      }
    }

    /* Only a real rejection (401/403) ends the session; 5xx/429 do not. */
    if (response.status === 401 || response.status === 403) {
      clearTokens();
    }

    return null;
  }

  let data;

  try {
    data = await response.json();
  } catch {
    return null;
  }

  const newAccessToken = data?.accessToken;
  const newRefreshToken = data?.refreshToken;

  if (!newAccessToken) {
    return null;
  }

  setTokens(newAccessToken, newRefreshToken);

  return newAccessToken;
};

export const refreshAccessTokenOnce = async () => {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = refreshAccessTokenInternal().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
};

export const apiRequest = async (
  endpoint,
  options = {},
  retry = true
) => {
  let response;

  try {
    response = await rawApiRequest(endpoint, options);
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Request timed out. Please try again.", { cause: error });
    }

    throw error;
  }

  if (response.status !== 401 || !retry || isAuthEndpoint(endpoint)) {
    return response;
  }

  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    clearTokens();
    return response;
  }

  const newAccessToken = await refreshAccessTokenOnce();

  if (!newAccessToken) {
    return response;
  }

  try {
    return await rawApiRequest(endpoint, options);
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Request timed out. Please try again.", { cause: error });
    }

    throw error;
  }
};

export const apiJson = async (
  endpoint,
  options = {},
  retry = true
) => {
  const response = await apiRequest(endpoint, options, retry);

  let data = null;

  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const error = new Error(
      data?.message ||
        data?.error ||
        `Request failed with status ${response.status}`
    );

    error.status = response.status;
    error.data = data;

    throw error;
  }

  return data;
};

export { API_BASE_URL };

/*
  Free hosting (Render) puts the backend to sleep after ~15 minutes.
  The first request then takes 30-60 seconds and looks like a hang.
  Calling this once when the site opens wakes the server while the
  user is still choosing a file, so the real request is fast.
*/
let warmUpStarted = false;

export const warmUpServer = () => {
  if (warmUpStarted) return;

  warmUpStarted = true;

  try {
    fetch(`${API_BASE_URL}/health`, {
      method: "GET",
      cache: "no-store",
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Warm-up is best effort only.
  }
};

export default apiRequest;

