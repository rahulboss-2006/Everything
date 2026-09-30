const API_BASE_URL = "http://localhost:5000";

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
    const response = await fetch(
      `${API_BASE_URL}/api/auth/refresh`,
      {
        method: "POST",

        credentials: "include",

        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      return false;
    }

    const data = await response.json().catch(() => ({}));

    if (data?.accessToken) {
      localStorage.setItem(
        "accessToken",
        data.accessToken
      );
    }

    return true;
  } catch {
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
   IMAGE → IMAGE
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
      `${API_BASE_URL}/api/converter/image`,
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
      `${API_BASE_URL}${data.downloadUrl}`,
  };
}


/* ================================
   IMAGE → PDF
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
      `${API_BASE_URL}/api/pdf/image-to-pdf`,
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
      `${API_BASE_URL}${data.downloadUrl}`,
  };
}


/* ================================
   PDF → IMAGE
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
      `${API_BASE_URL}/api/pdf/pdf-to-image`,
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
      `${API_BASE_URL}${data.downloadUrl}`,
  };
}