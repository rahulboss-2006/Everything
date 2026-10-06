import { get, set, del } from "idb-keyval";

const CACHE_PREFIX = "everything-bg-remove-v2";

function makeKey(file) {
  if (!file) return null;

  return [
    file.name || "",
    file.size || 0,
    file.lastModified || 0,
    file.type || "",
  ].join("|");
}

function cacheKey(file) {
  const key = makeKey(file);

  if (!key) return null;

  return `${CACHE_PREFIX}:${key}`;
}

export async function savePreparedBackground(
  sourceFile,
  resultBlob
) {
  const key = cacheKey(sourceFile);

  if (!key || !resultBlob) {
    return false;
  }

  try {
    await set(key, {
      blob: resultBlob,
      createdAt: Date.now(),
    });

    return true;
  } catch (error) {
    console.warn(
      "Background result cache write failed:",
      error
    );

    return false;
  }
}

export async function getPreparedBackground(
  sourceFile
) {
  const key = cacheKey(sourceFile);

  if (!key) {
    return null;
  }

  try {
    const entry = await get(key);

    if (!entry?.blob) {
      return null;
    }

    const maxAge =
      7 * 24 * 60 * 60 * 1000;

    if (
      entry.createdAt &&
      Date.now() - entry.createdAt > maxAge
    ) {
      await del(key);
      return null;
    }

    return entry.blob;
  } catch (error) {
    console.warn(
      "Background result cache read failed:",
      error
    );

    return null;
  }
}

export async function clearPreparedBackground(
  sourceFile
) {
  const key = cacheKey(sourceFile);

  if (!key) {
    return;
  }

  try {
    await del(key);
  } catch (error) {
    console.warn(
      "Background result cache delete failed:",
      error
    );
  }
}

export function getBackgroundCacheKey(file) {
  return makeKey(file);
}
