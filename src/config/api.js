import { Image } from "react-native";

const RAW_API_BASE_URL = "https://hostel-backend-major.onrender.com";
const DEFAULT_PROFILE_IMAGE = Image.resolveAssetSource(
  require("../assets/images/profile.png")
).uri;

export const API_BASE_URL = RAW_API_BASE_URL.replace(/\/+$/, "");
export const API_URL = `${API_BASE_URL}/api`;
export const AUTH_API_URL = `${API_URL}/auth`;
export const SOCKET_URL = API_BASE_URL;

const isLocalhostUrl = (value) =>
  typeof value === "string" &&
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(value);

const replaceLocalhostWithApiBase = (value) => {
  if (!isLocalhostUrl(value)) return value;

  return value.replace(
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i,
    API_BASE_URL
  );
};

export const buildApiUrl = (path = "") => {
  if (!path) return API_URL;
  return `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
};

export const resolveImageUrl = (rawUrl, fallbackName = "User", cacheBust) => {
  if (!rawUrl) {
    if (!cacheBust) return DEFAULT_PROFILE_IMAGE;
    const separator = DEFAULT_PROFILE_IMAGE.includes("?") ? "&" : "?";
    return `${DEFAULT_PROFILE_IMAGE}${separator}t=${cacheBust}`;
  }

  const normalizedPath = String(rawUrl).trim();
  const absoluteUrl = normalizedPath.startsWith("http")
    ? replaceLocalhostWithApiBase(normalizedPath)
    : `${API_BASE_URL}${normalizedPath.startsWith("/") ? "" : "/"}${normalizedPath}`;

  if (!cacheBust) return absoluteUrl;

  const separator = absoluteUrl.includes("?") ? "&" : "?";
  return `${absoluteUrl}${separator}t=${cacheBust}`;
};
