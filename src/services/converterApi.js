const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const SERVER_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, "");

/* ================================
   RESPONSE
================================ */

async function parseResponse(response) {
  const text = await response.text();

  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    const error = new Error(
      `Server returned invalid response (${response.status}).`
    );

    error.status = response.status;
    error.data = {
      success: false,
      message: `Invalid server response (${response.status}).`,
    };

    throw error;
  }

  if (!response.ok || data.success === false) {
    const error = new Error(
      data.message || "Conversion failed."
    );

    error.status = response.status;
    error.data = data;

    throw error;
  }

  return data;
}


/* ================================
   REFRESH ACCESS TOKEN
================================ */

async function refreshAccessToken() {
  try {
    const refreshToken =
      localStorage.getItem("refreshToken");

    if (!refreshToken) {
      console.warn(
        "REFRESH: No refresh token found."
      );

      return false;
    }

    const response = await fetch(
      `${API_BASE_URL}/auth/refresh`,
      {
        method: "POST",

        credentials: "include",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          refreshToken,
        }),
      }
    );

    const data =
      await response.json().catch(() => ({}));

    if (!response.ok || !data?.accessToken) {
      console.error(
        "REFRESH FAILED:",
        response.status,
        data
      );

      return false;
    }

    /* Save new access token */
    localStorage.setItem(
      "accessToken",
      data.accessToken
    );

    /* Backend rotates refresh token */
    if (data.refreshToken) {
      localStorage.setItem(
        "refreshToken",
        data.refreshToken
      );
    }

    console.log(
      "TOKEN REFRESH SUCCESS"
    );

    return true;

  } catch (error) {
    console.error(
      "TOKEN REFRESH ERROR:",
      error
    );

    return false;
  }
}


/* ================================
   AUTH HEADERS
================================ */

function getAuthHeaders() {
  const token =
    localStorage.getItem("accessToken");

  if (!token) {
    return {};
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}


/* ================================
   AUTHENTICATED REQUEST
================================ */

async function authenticatedFetch(
  url,
  options = {},
  retry = true
) {
  const headers = {
    ...(options.headers || {}),
    ...getAuthHeaders(),
  };

  let response = await fetch(url, {
    ...options,

    headers,

    credentials: "include",
  });


  /* ================================
     ACCESS TOKEN EXPIRED
  ================================ */

  if (response.status === 401 && retry) {
    const refreshed =
      await refreshAccessToken();

    if (refreshed) {
      return authenticatedFetch(
        url,
        options,
        false
      );
    }
  }

  return response;
}


/* ================================
   IMAGE â†’ IMAGE
================================ */

export async function convertImage(
  file,
  outputFormat
) {
  const formData = new FormData();

  formData.append(
    "file",
    file
  );

  formData.append(
    "outputFormat",
    outputFormat
  );


  const response =
    await authenticatedFetch(
      `${API_BASE_URL}/converter/image`,
      {
        method: "POST",

        body: formData,
      }
    );


  const data =
    await parseResponse(response);


  return {
    ...data,

    downloadUrl:
      `${SERVER_BASE_URL}${data.downloadUrl}`,
  };
}


/* ================================
   IMAGE â†’ PDF
================================ */

export async function convertImageToPdf(
  file
) {
  const formData = new FormData();

  formData.append(
    "file",
    file
  );


  const response =
    await authenticatedFetch(
      `${API_BASE_URL}/pdf/image-to-pdf`,
      {
        method: "POST",

        body: formData,
      }
    );


  const data =
    await parseResponse(response);


  return {
    ...data,

    downloadUrl:
      `${SERVER_BASE_URL}${data.downloadUrl}`,
  };
}


/* ================================
   PDF â†’ IMAGE
================================ */

export async function convertPdfToImage(
  file,
  outputFormat
) {
  const formData = new FormData();

  formData.append(
    "file",
    file
  );

  formData.append(
    "outputFormat",
    outputFormat
  );


  const response =
    await authenticatedFetch(
      `${API_BASE_URL}/pdf/pdf-to-image`,
      {
        method: "POST",

        body: formData,
      }
    );


  const data =
    await parseResponse(response);


  return {
    ...data,

    downloadUrl:
      `${SERVER_BASE_URL}${data.downloadUrl}`,
  };
}




