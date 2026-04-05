export function buildPageUrl(page, params = {}) {
  const path = window.location.pathname;

  // Resolve relative to the current directory, including repo-root URLs like /bands324.
  let baseDirPath;
  if (path.endsWith("/")) {
    baseDirPath = path;
  } else {
    const lastSegment = path.split("/").pop() || "";
    baseDirPath = lastSegment.includes(".")
      ? path.slice(0, path.lastIndexOf("/") + 1)
      : `${path}/`;
  }

  const url = new URL(`${baseDirPath}${page}`, window.location.origin);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return `${url.pathname}${url.search}${url.hash}`;
}

export function goToPage(page, params = {}) {
  window.location.href = buildPageUrl(page, params);
}
