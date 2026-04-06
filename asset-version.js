window.ASSET_VERSION = "20260405m";
window.assetUrl = function assetUrl(path) {
  const normalizedPath = /^(\.\/|\.\.\/|\/|https?:)/.test(path) ? path : `./${path}`;
  const separator = normalizedPath.includes("?") ? "&" : "?";
  return `${normalizedPath}${separator}v=${window.ASSET_VERSION}`;
};
