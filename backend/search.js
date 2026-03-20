const BRAVE_API_KEY = process.env.BRAVE_SEARCH_API_KEY;

/**
 * Search the web using Brave Search API
 * @param {string} query - Search query
 * @param {number} count - Number of results (max 20)
 * @returns {Array} Simplified search results
 */
async function webSearch(query, count = 5) {
  if (!BRAVE_API_KEY) {
    throw new Error('BRAVE_SEARCH_API_KEY not configured');
  }

  const url = new URL('https://api.search.brave.com/res/v1/web/search');
  url.searchParams.set('q', query);
  url.searchParams.set('count', count);
  url.searchParams.set('text_decorations', 'false');

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': BRAVE_API_KEY,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Brave Search failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  const results = [];

  // Pull web results
  if (data.web && data.web.results) {
    for (const r of data.web.results.slice(0, count)) {
      results.push({
        title: r.title,
        url: r.url,
        description: r.description || '',
        age: r.age || '',
      });
    }
  }

  // Pull news results if available
  if (data.news && data.news.results) {
    for (const r of data.news.results.slice(0, 3)) {
      results.push({
        title: r.title,
        url: r.url,
        description: r.description || '',
        age: r.age || '',
        source: 'news',
      });
    }
  }

  return results;
}

module.exports = { webSearch };
