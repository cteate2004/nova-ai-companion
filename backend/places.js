async function searchRestaurants(query, lat, lon, radius = 5000) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return { error: 'Google Places API key not configured' };
  }

  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query + ' restaurant')}&location=${lat},${lon}&radius=${radius}&type=restaurant&key=${apiKey}`;
  const resp = await fetch(url);
  const data = await resp.json();

  return (data.results || []).slice(0, 5).map(r => ({
    name: r.name,
    address: r.formatted_address,
    rating: r.rating,
    price_level: r.price_level,
    open_now: r.opening_hours?.open_now,
    place_id: r.place_id,
  }));
}

module.exports = { searchRestaurants };
