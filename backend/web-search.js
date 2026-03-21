const BRAVE_KEY = process.env.BRAVE_SEARCH_API_KEY;

async function search(query, count = 5) {
  if (!BRAVE_KEY) {
    return { error: 'BRAVE_SEARCH_API_KEY not configured' };
  }

  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}`;
  const resp = await fetch(url, {
    headers: { 'X-Subscription-Token': BRAVE_KEY, 'Accept': 'application/json' },
  });
  const data = await resp.json();

  return (data.web?.results || []).map(r => ({
    title: r.title,
    url: r.url,
    snippet: r.description,
  }));
}

module.exports = { search };
