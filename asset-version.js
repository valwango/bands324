window.ASSET_VERSION = "20260405d";
window.assetUrl = function assetUrl(path) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}v=${window.ASSET_VERSION}`;
};
