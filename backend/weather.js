const OPENWEATHER_KEY = process.env.OPENWEATHER_API_KEY;
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

let cache = { data: null, timestamp: 0, key: '' };
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

async function getCurrent(lat, lon) {
  const cacheKey = `${lat},${lon}`;
  if (cache.key === cacheKey && Date.now() - cache.timestamp < CACHE_TTL) {
    return cache.data;
  }

  if (!OPENWEATHER_KEY) {
    return { error: 'OPENWEATHER_API_KEY not configured' };
  }

  const [current, forecast] = await Promise.all([
    fetch(`${BASE_URL}/weather?lat=${lat}&lon=${lon}&units=imperial&appid=${OPENWEATHER_KEY}`).then(r => r.json()),
    fetch(`${BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=imperial&cnt=8&appid=${OPENWEATHER_KEY}`).then(r => r.json()),
  ]);

  const result = {
    temp: Math.round(current.main?.temp),
    feels_like: Math.round(current.main?.feels_like),
    description: current.weather?.[0]?.description,
    icon: current.weather?.[0]?.icon,
    humidity: current.main?.humidity,
    wind_mph: Math.round(current.wind?.speed),
    city: current.name,
    forecast: forecast.list?.map(f => ({
      time: f.dt_txt,
      temp: Math.round(f.main.temp),
      description: f.weather[0].description,
    })),
  };

  cache = { data: result, timestamp: Date.now(), key: cacheKey };
  return result;
}

module.exports = { getCurrent };
