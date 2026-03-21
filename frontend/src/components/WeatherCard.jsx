import React, { useState, useEffect } from 'react';

export default function WeatherCard({ authToken }) {
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(async (pos) => {
      try {
        const { latitude, longitude } = pos.coords;
        const resp = await fetch(`/api/weather?lat=${latitude}&lon=${longitude}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (resp.ok) setWeather(await resp.json());
      } catch {}
    }, () => {}, { timeout: 5000 });
  }, [authToken]);

  if (!weather || weather.error) return null;

  return (
    <div className="home-card">
      <span className="home-card-label">🌤️ Weather · {weather.city}</span>
      <p className="home-card-text">
        {weather.temp}°F — {weather.description}
        {weather.feels_like !== weather.temp && ` (feels like ${weather.feels_like}°)`}
      </p>
    </div>
  );
}
