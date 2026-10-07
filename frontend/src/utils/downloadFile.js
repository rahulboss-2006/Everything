/*
  Fast download for converted files.

  - Uses the browser's native download handling.
  - Does NOT fetch the entire file into a Blob first.
  - Does NOT create an object URL.
  - Large PDF/ZIP/Image downloads can start immediately.
  - The backend Content-Disposition header controls the filename.
*/

function nameFromUrl(url) {
  try {
    return decodeURIComponent(
      new URL(url).pathname.split("/").pop() || "download"
    );
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

  // Let the browser download the file directly.
  // No fetch(), no Blob(), no object URL.
  clickLink(url, name);
}