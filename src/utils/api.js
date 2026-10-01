const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api";


/* =========================================
   AUTH REFRESH STATE
========================================= */

let refreshPromise = null;


/* =========================================
   TOKEN HELPERS
========================================= */

export function setAccessToken(token) {
  if (!token) return;

  localStorage.setItem(
    "accessToken",
    token
  );
}


export function getAccessToken() {
  return localStorage.getItem(
    "accessToken"
  );
}


export function clearAccessToken() {
  localStorage.removeItem(
    "accessToken"
  );
}


export function setRefreshToken(token) {
  if (!token) return;

  localStorage.setItem(
    "refreshToken",
    token
  );
}


export function getRefreshToken() {
  return localStorage.getItem(
    "refreshToken"
  );
}


export function clearRefreshToken() {
  localStorage.removeItem(
    "refreshToken"
  );
}


export function clearAuthTokens() {
  clearAccessToken();
  clearRefreshToken();
}


/* =========================================
   CREATE API ERROR
========================================= */

async function readResponseData(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}


function createApiError(
  response,
  data
) {
  const error = new Error(
    data?.message ||
      "Something went wrong."
  );

  error.status =
    response.status;

  error.data = data;

  return error;
}


/* =========================================
   RAW REQUEST
========================================= */

async function rawApiRequest(
  endpoint,
  options = {},
  accessToken = null
) {
  const headers = {
    ...(options.headers || {}),
  };


  /*
    Refresh request must NOT receive
    the old access token.
  */

  const isRefreshRequest =
    endpoint === "/auth/refresh";


  if (
    accessToken &&
    !isRefreshRequest
  ) {
    headers.Authorization =
      `Bearer ${accessToken}`;
  }


  const response =
    await fetch(
      `${API_BASE_URL}${endpoint}`,
      {
        ...options,

        headers,

        /*
          Keep credentials enabled.
          This is useful for future
          HttpOnly-cookie authentication
          and already matches backend CORS.
        */

        credentials: "include",
      }
    );


  const data =
    await readResponseData(
      response
    );


  if (!response.ok) {
    throw createApiError(
      response,
      data
    );
  }


  return data;
}


/* =========================================
   REFRESH ACCESS TOKEN
========================================= */

async function refreshAccessTokenInternal() {
  const refreshToken =
    getRefreshToken();


  if (!refreshToken) {
    const error =
      new Error(
        "No refresh token available."
      );

    error.status = 401;

    throw error;
  }


  const data =
    await rawApiRequest(
      "/auth/refresh",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          refreshToken,
        }),
      },

      null
    );


  /*
    Save newly issued access token.
  */

  if (data?.accessToken) {
    setAccessToken(
      data.accessToken
    );
  }


  /*
    Backend currently rotates
    the refresh token.

    Therefore always replace
    the old token when a new one
    is returned.
  */

  if (data?.refreshToken) {
    setRefreshToken(
      data.refreshToken
    );
  }


  return data;
}


/* =========================================
   SINGLE REFRESH LOCK
========================================= */

async function refreshAccessTokenOnce() {

  /*
    If another request is already
    refreshing the token, wait for it.

    This prevents:

      Request A -> 401
      Request B -> 401
      Request C -> 401

    from creating three simultaneous
    refresh-token rotations.
  */

  if (!refreshPromise) {

    refreshPromise =
      refreshAccessTokenInternal()
        .finally(() => {
          refreshPromise = null;
        });
  }


  return refreshPromise;
}


/* =========================================
   API REQUEST
========================================= */

export async function apiRequest(
  endpoint,
  options = {}
) {
  const accessToken =
    getAccessToken();


  /*
    Refresh endpoint itself must never
    recursively trigger another refresh.
  */

  const isRefreshRequest =
    endpoint === "/auth/refresh";


  try {

    /*
      First attempt.
    */

    return await rawApiRequest(
      endpoint,
      options,
      accessToken
    );

  } catch (error) {

    /*
      Only access-token expiration
      should trigger automatic refresh.

      Never refresh the refresh endpoint
      itself.
    */

    if (
      error?.status !== 401 ||
      isRefreshRequest
    ) {
      throw error;
    }


    /*
      If there is no refresh token,
      this is a genuine logged-out state.
    */

    if (!getRefreshToken()) {
      clearAuthTokens();

      throw error;
    }


    try {

      /*
        Wait for the single shared
        refresh operation.
      */

      await refreshAccessTokenOnce();

    } catch (refreshError) {

      /*
        Backend rejected the refresh
        token. The session is no longer
        recoverable.
      */

      if (
        refreshError?.status === 401 ||
        refreshError?.status === 403
      ) {
        clearAuthTokens();
      }

      throw refreshError;
    }


    /*
      Get the NEW access token.
    */

    const newAccessToken =
      getAccessToken();


    if (!newAccessToken) {
      clearAuthTokens();

      const refreshError =
        new Error(
          "Unable to obtain a new access token."
        );

      refreshError.status = 401;

      throw refreshError;
    }


    /*
      Retry the original request
      exactly once.
    */

    return rawApiRequest(
      endpoint,
      options,
      newAccessToken
    );
  }
}