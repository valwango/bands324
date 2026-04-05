export function buildPageUrl(page, params = {}) {
  const url = new URL(page, window.location.href);

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
