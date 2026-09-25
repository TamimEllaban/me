export type CloudinaryMediaKind = "image" | "video";

function cloudinaryResourcePath(url: string, resourceType: CloudinaryMediaKind): string | null {
  if (!/res\.cloudinary\.com/.test(url)) return null;
  const marker = `/${resourceType}/upload/`;
  const markerIndex = url.indexOf(marker);
  if (markerIndex < 0) return null;
  const afterMarker = url.slice(markerIndex + marker.length);
  const versionMatch = afterMarker.match(/v\d+\//);
  return versionMatch?.index === undefined ? afterMarker : afterMarker.slice(versionMatch.index);
}

function transformedCloudinaryUrl(
  url: string,
  resourceType: CloudinaryMediaKind,
  transformation: string,
): string {
  const resourcePath = cloudinaryResourcePath(url, resourceType);
  if (!resourcePath) return url;
  const marker = `/${resourceType}/upload/`;
  const markerIndex = url.indexOf(marker);
  return `${url.slice(0, markerIndex + marker.length)}${transformation}/${resourcePath}`;
}

export function cloudinaryVideoThumbnailUrl(url: string, width = 800, offsetSeconds = 1): string {
  return transformedCloudinaryUrl(url, "video", `so_${offsetSeconds},f_jpg,q_auto,w_${width}`);
}

export function cloudinaryVideoPlaybackUrl(url: string): string {
  return transformedCloudinaryUrl(url, "video", "f_mp4,q_auto");
}

export function cloudinaryImageUrl(url: string, width: number): string {
  return transformedCloudinaryUrl(url, "image", `w_${width},f_auto,q_auto`);
}
