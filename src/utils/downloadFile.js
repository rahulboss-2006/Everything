/*
  Reliable download for converted files.

  - Fetches the file as a Blob and saves it with an <a download>, so the
    page never navigates away (the old window.location.assign replaced the
    whole app with a JSON error if the file was missing).
  - If the browser blocks the fetch (CORS / network), falls back to a plain
    link click, which still downloads thanks to Content-Disposition.
*/
function nameFromUrl(url) {
  try {
    return decodeURIComponent(new URL(url).pathname.split("/").pop() || "download");
  } catch {
    return "download";
  }
}

function clickLink(href, fileName) {
  const a = document.createElement("a");
  a.href = href;
  a.download = fileName || "";
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export async function downloadFile(url, fileName) {
  const name = fileName || nameFromUrl(url);

  let response;
  try {
    response = await fetch(url);
  } catch {
    clickLink(url, name); // network/CORS problem -> let the browser handle it
    return;
  }

  if (!response.ok) {
    throw new Error(
      response.status === 404
        ? "File expired or not found. Please convert again."
        : `Download failed (${response.status}).`
    );
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  clickLink(objectUrl, name);
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
}
