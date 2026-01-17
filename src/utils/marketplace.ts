const buildMarketplaceCandidates = () => {
  const candidates = new Set<string>();
  const baseUrl = import.meta.env.BASE_URL || '/';
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

  candidates.add(`${normalizedBase}data/marketplace.json`);
  candidates.add('/data/marketplace.json');

  try {
    candidates.add(new URL('data/marketplace.json', document.baseURI).toString());
  } catch {
    // Ignore invalid base URI in non-browser contexts.
  }

  if (typeof window !== 'undefined' && window.location?.origin && window.location.origin !== 'null') {
    try {
      candidates.add(new URL(`${normalizedBase}data/marketplace.json`, window.location.origin).toString());
    } catch {
      // Ignore invalid origin.
    }
  }

  return Array.from(candidates);
};

export async function fetchMarketplaceData() {
  const candidates = buildMarketplaceCandidates();
  let lastError: unknown = null;

  for (const url of candidates) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        lastError = new Error(`Failed to load marketplace data (${response.status})`);
        continue;
      }
      return await response.json();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error('Failed to load marketplace data');
}
