import React, { useState, useEffect } from "react";
import './App.css';

const App = () => {
  const api = {
    key: "a04b88987f238dc69b0bd2c902d2998b",
    base: "https://api.openweathermap.org/data/2.5/",
    geo: "https://api.openweathermap.org/geo/1.0/",
  };

  const [query, setQuery] = useState("");
  const [weather, setWeather] = useState({});
  const [forecast, setForecast] = useState([]);
  const [hourlyForecast, setHourlyForecast] = useState([]);
  const [aqiData, setAQIData] = useState({});
  const [weatherAlerts, setWeatherAlerts] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [unit, setUnit] = useState('metric'); // metric or imperial
  const [searchHistory, setSearchHistory] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showMaps, setShowMaps] = useState(false);
  const [selectedCity, setSelectedCity] = useState(null);
  const [weatherTrends, setWeatherTrends] = useState({});
  const [customAlerts, setCustomAlerts] = useState([]);

  // Popular cities for suggestions
  const popularCities = [
    "London", "New York", "Tokyo", "Paris", "Sydney", 
    "Mumbai", "Dubai", "Singapore", "Berlin", "Rome",
    "Barcelona", "Amsterdam", "Vienna", "Prague", "Budapest"
  ];

  // Load search history from localStorage on component mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('weatherSearchHistory');
    if (savedHistory) {
      setSearchHistory(JSON.parse(savedHistory));
    }
    
    const savedAlerts = localStorage.getItem('customWeatherAlerts');
    if (savedAlerts) {
      setCustomAlerts(JSON.parse(savedAlerts));
    }
  }, []);

  // Save search history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('weatherSearchHistory', JSON.stringify(searchHistory));
  }, [searchHistory]);

  // Save custom alerts to localStorage
  useEffect(() => {
    localStorage.setItem('customWeatherAlerts', JSON.stringify(customAlerts));
  }, [customAlerts]);

  const search = async (evt) => {
    if (evt.key === "Enter" && query.trim()) {
      await fetchWeatherData(query);
    }
  };

  const fetchWeatherData = async (cityName) => {
    setLoading(true);
    setError(null);
    setSelectedCity(cityName);
    
    try {
      // Fetch current weather
      const weatherRes = await fetch(
        `${api.base}weather?q=${cityName}&units=${unit}&APPID=${api.key}`
      );
      const weatherData = await weatherRes.json();

      if (weatherData.cod === "404") {
        setError("City not found. Please enter a valid city name.");
        setWeather({});
        setForecast([]);
        setHourlyForecast([]);
        setAQIData({});
        setWeatherAlerts([]);
        return;
      }

      setWeather(weatherData);

      // Fetch 5-day forecast
      const forecastRes = await fetch(
        `${api.base}forecast?q=${cityName}&units=${unit}&APPID=${api.key}`
      );
      const forecastData = await forecastRes.json();
      
      // Group forecast by day and get daily data
      const dailyForecast = forecastData.list.filter((item, index) => index % 8 === 0);
      setForecast(dailyForecast);

      // Get hourly forecast for next 24 hours
      const next24Hours = forecastData.list.slice(0, 8);
      setHourlyForecast(next24Hours);

      // Fetch AQI data
      const { lat, lon } = weatherData.coord;
      const aqiRes = await fetch(
        `${api.base}air_pollution?lat=${lat}&lon=${lon}&appid=${api.key}`
      );
      const aqiData = await aqiRes.json();
      
      setAQIData({
        city: weatherData.name,
        country: weatherData.sys.country,
        ...aqiData.list[0],
      });

      // Fetch weather alerts
      try {
        const alertsRes = await fetch(
          `${api.base}onecall?lat=${lat}&lon=${lon}&exclude=current,minutely,hourly,daily&appid=${api.key}`
        );
        const alertsData = await alertsRes.json();
        setWeatherAlerts(alertsData.alerts || []);
      } catch (err) {
        setWeatherAlerts([]);
      }

      // Add to search history
      if (!searchHistory.includes(cityName)) {
        setSearchHistory(prev => [cityName, ...prev.slice(0, 4)]);
      }

      setQuery("");
    } catch (err) {
      setError("An error occurred. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    setLocationLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // Reverse geocoding to get city name
          const geoRes = await fetch(
            `${api.geo}reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${api.key}`
          );
          const geoData = await geoRes.json();
          
          if (geoData && geoData[0]) {
            const cityName = geoData[0].name;
            const countryCode = geoData[0].country;
            
            setCurrentLocation({
              name: cityName,
              country: countryCode,
              lat: latitude,
              lon: longitude
            });

            setSelectedCity(cityName);

            // Fetch weather data for current location
            await fetchWeatherDataByCoords(latitude, longitude, cityName);
          }
        } catch (err) {
          setError("Could not determine your location. Please try searching manually.");
          console.error(err);
        } finally {
          setLocationLoading(false);
        }
      },
      (error) => {
        setLocationLoading(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setError("Location access denied. Please enable location services.");
            break;
          case error.POSITION_UNAVAILABLE:
            setError("Location information unavailable.");
            break;
          case error.TIMEOUT:
            setError("Location request timed out.");
            break;
          default:
            setError("An unknown error occurred while getting location.");
            break;
        }
      }
    );
  };

  const fetchWeatherDataByCoords = async (lat, lon, cityName) => {
    setLoading(true);
    
    try {
      // Fetch current weather by coordinates
      const weatherRes = await fetch(
        `${api.base}weather?lat=${lat}&lon=${lon}&units=${unit}&APPID=${api.key}`
      );
      const weatherData = await weatherRes.json();

      setWeather(weatherData);

      // Fetch 5-day forecast
      const forecastRes = await fetch(
        `${api.base}forecast?lat=${lat}&lon=${lon}&units=${unit}&APPID=${api.key}`
      );
      const forecastData = await forecastRes.json();
      
      const dailyForecast = forecastData.list.filter((item, index) => index % 8 === 0);
      setForecast(dailyForecast);

      // Get hourly forecast
      const next24Hours = forecastData.list.slice(0, 8);
      setHourlyForecast(next24Hours);

      // Fetch AQI data
      const aqiRes = await fetch(
        `${api.base}air_pollution?lat=${lat}&lon=${lon}&appid=${api.key}`
      );
      const aqiData = await aqiRes.json();
      
      setAQIData({
        city: cityName,
        country: weatherData.sys.country,
        ...aqiData.list[0],
      });

      // Fetch weather alerts
      try {
        const alertsRes = await fetch(
          `${api.base}onecall?lat=${lat}&lon=${lon}&exclude=current,minutely,hourly,daily&appid=${api.key}`
        );
        const alertsData = await alertsRes.json();
        setWeatherAlerts(alertsData.alerts || []);
      } catch (err) {
        setWeatherAlerts([]);
      }

      // Add to search history
      if (!searchHistory.includes(cityName)) {
        setSearchHistory(prev => [cityName, ...prev.slice(0, 4)]);
      }

    } catch (err) {
      setError("An error occurred while fetching weather data for your location.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getWeatherIcon = (weatherCode) => {
    const icons = {
      '01': '☀️', // clear sky
      '02': '⛅', // few clouds
      '03': '☁️', // scattered clouds
      '04': '☁️', // broken clouds
      '09': '🌧️', // shower rain
      '10': '🌦️', // rain
      '11': '⛈️', // thunderstorm
      '13': '❄️', // snow
      '50': '🌫️', // mist
    };
    
    const code = weatherCode.toString().substring(0, 2);
    return icons[code] || '🌤️';
  };

  const getMoonPhase = (timestamp) => {
    // Simple moon phase calculation based on date
    const date = new Date(timestamp * 1000);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    // Basic moon phase calculation (approximate)
    const phase = ((year * 12.368 + month) * 29.5306 + day) % 29.5306;
    
    if (phase < 3.69) return { icon: '🌑', name: 'New Moon' };
    if (phase < 7.38) return { icon: '🌒', name: 'Waxing Crescent' };
    if (phase < 11.07) return { icon: '🌓', name: 'First Quarter' };
    if (phase < 14.76) return { icon: '🌔', name: 'Waxing Gibbous' };
    if (phase < 18.45) return { icon: '🌕', name: 'Full Moon' };
    if (phase < 22.14) return { icon: '🌖', name: 'Waning Gibbous' };
    if (phase < 25.83) return { icon: '🌗', name: 'Last Quarter' };
    if (phase < 29.52) return { icon: '🌘', name: 'Waning Crescent' };
    return { icon: '🌑', name: 'New Moon' };
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatHour = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit',
      hour12: true 
    });
  };

  const getAQIDescription = (aqi) => {
    const descriptions = {
      1: { text: "Good", color: "#00E400", health: "Air quality is considered satisfactory, and air pollution poses little or no risk." },
      2: { text: "Fair", color: "#FFFF00", health: "Air quality is acceptable; however, some pollutants may be a concern for a small number of people." },
      3: { text: "Moderate", color: "#FF7E00", health: "Members of sensitive groups may experience health effects. The general public is not likely to be affected." },
      4: { text: "Poor", color: "#FF0000", health: "Everyone may begin to experience health effects; members of sensitive groups may experience more serious effects." },
      5: { text: "Very Poor", color: "#8F3F97", health: "Health warnings of emergency conditions. The entire population is more likely to be affected." }
    };
    return descriptions[aqi] || { text: "Unknown", color: "#999", health: "No health information available." };
  };

  const getWindDirection = (degrees) => {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  };

  const getWeatherMapsUrl = () => {
    if (!weather.coord) return null;
    const { lat, lon } = weather.coord;
    return `https://openweathermap.org/weathermap?basemap=map&cities=true&layer=temperature&lat=${lat}&lon=${lon}&zoom=10`;
  };

  const addCustomAlert = () => {
    const temp = prompt("Enter temperature threshold (°C):");
    const condition = prompt("Enter weather condition (rain, snow, clear, etc.):");
    
    if (temp && condition) {
      const newAlert = {
        id: Date.now(),
        temperature: parseFloat(temp),
        condition: condition.toLowerCase(),
        active: true
      };
      setCustomAlerts(prev => [...prev, newAlert]);
    }
  };

  const removeCustomAlert = (id) => {
    setCustomAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  const toggleUnit = () => {
    setUnit(prev => prev === 'metric' ? 'imperial' : 'metric');
    // Re-fetch data with new units if weather data exists
    if (weather.name) {
      if (currentLocation) {
        fetchWeatherDataByCoords(currentLocation.lat, currentLocation.lon, currentLocation.name);
      } else {
        search({ key: 'Enter' });
      }
    }
  };

  const getUnitSymbol = () => unit === 'metric' ? '°C' : '°F';
  const getSpeedUnit = () => unit === 'metric' ? 'm/s' : 'mph';

  const handleHistoryClick = (city) => {
    setQuery(city);
    fetchWeatherData(city);
  };

  const handlePopularCityClick = (city) => {
    fetchWeatherData(city);
  };

  const createWeatherWidget = () => {
    if (!weather.main) return;
    
    const widgetData = {
      city: weather.name,
      country: weather.sys.country,
      temperature: Math.round(weather.main.temp),
      unit: getUnitSymbol(),
      condition: weather.weather[0].description,
      icon: getWeatherIcon(weather.weather[0].id),
      timestamp: new Date().toISOString()
    };
    
    const widgetCode = `<div style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 20px; border-radius: 15px; text-align: center; font-family: Arial, sans-serif;">
      <h3>${widgetData.city}, ${widgetData.country}</h3>
      <div style="font-size: 3rem;">${widgetData.icon}</div>
      <div style="font-size: 2rem; font-weight: bold;">${widgetData.temperature}${widgetData.unit}</div>
      <div style="text-transform: capitalize;">${widgetData.condition}</div>
      <div style="font-size: 0.8rem; opacity: 0.8;">Updated: ${new Date(widgetData.timestamp).toLocaleString()}</div>
    </div>`;
    
    navigator.clipboard.writeText(widgetCode);
    alert("Weather widget code copied to clipboard! You can paste it on any website.");
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <h1 className="app-title">Weather App</h1>
          <div className="header-controls">
            <div className="unit-toggle">
              <button 
                className={`unit-btn ${unit === 'metric' ? 'active' : ''}`}
                onClick={() => setUnit('metric')}
              >
                °C
              </button>
              <button 
                className={`unit-btn ${unit === 'imperial' ? 'active' : ''}`}
                onClick={() => setUnit('imperial')}
              >
                °F
              </button>
            </div>
            {weather.main && (
              <button className="widget-btn" onClick={createWeatherWidget}>
                📋 Widget
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Search Section */}
      <div className="search-section">
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Search for a city..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={search}
          />
          <button 
            className="search-btn"
            onClick={() => search({ key: 'Enter' })}
            disabled={!query.trim() || loading}
          >
            {loading ? '⏳' : '🔍'}
          </button>
        </div>

        {/* Current Location Button */}
        <div className="location-section">
          <button 
            className="location-btn"
            onClick={getCurrentLocation}
            disabled={locationLoading}
          >
            {locationLoading ? '⏳' : '📍'} 
            {locationLoading ? 'Detecting...' : 'Use Current Location'}
          </button>
        </div>

        {/* Search History */}
        {searchHistory.length > 0 && (
          <div className="search-history">
            <span className="history-label">Recent:</span>
            {searchHistory.map((city, index) => (
              <button
                key={index}
                className="history-item"
                onClick={() => handleHistoryClick(city)}
              >
                {city}
              </button>
            ))}
          </div>
        )}

        {/* Popular Cities */}
        <div className="popular-cities">
          <span className="popular-label">Popular Cities:</span>
          <div className="city-buttons">
            {popularCities.map((city, index) => (
              <button
                key={index}
                className="city-btn"
                onClick={() => handlePopularCityClick(city)}
              >
                {city}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-message">
          <span>⚠️ {error}</span>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Loading weather data...</p>
        </div>
      )}

      {/* Weather Alerts */}
      {weatherAlerts.length > 0 && (
        <div className="alerts-section">
          <h3>⚠️ Weather Alerts</h3>
          <div className="alerts-container">
            {weatherAlerts.map((alert, index) => (
              <div key={index} className="alert-item">
                <div className="alert-header">
                  <span className="alert-icon">⚠️</span>
                  <span className="alert-title">{alert.event}</span>
                </div>
                <p className="alert-description">{alert.description}</p>
                <div className="alert-time">
                  {new Date(alert.start * 1000).toLocaleString()} - {new Date(alert.end * 1000).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Weather Display */}
      {weather.main && (
        <div className="weather-container">
          {/* Current Weather Card */}
          <div className="current-weather">
            <div className="weather-main">
              <div className="weather-icon">
                {getWeatherIcon(weather.weather[0].id)}
              </div>
              <div className="weather-info">
                <h2 className="city-name">
                  {weather.name}, {weather.sys.country}
                  {currentLocation && (
                    <span className="current-location-badge">📍 Current Location</span>
                  )}
                </h2>
                <p className="weather-description">
                  {weather.weather[0].description.charAt(0).toUpperCase() + 
                   weather.weather[0].description.slice(1)}
                </p>
                <div className="temperature">
                  {Math.round(weather.main.temp)}{getUnitSymbol()}
                </div>
                <p className="feels-like">
                  Feels like {Math.round(weather.main.feels_like)}{getUnitSymbol()}
                </p>
              </div>
            </div>
            
            <div className="weather-details">
              <div className="detail-item">
                <span className="detail-label">Humidity</span>
                <span className="detail-value">{weather.main.humidity}%</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Wind</span>
                <span className="detail-value">
                  {weather.wind.speed} {getSpeedUnit()} {getWindDirection(weather.wind.deg)}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Pressure</span>
                <span className="detail-value">{weather.main.pressure} hPa</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Visibility</span>
                <span className="detail-value">{(weather.visibility / 1000).toFixed(1)} km</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Dew Point</span>
                <span className="detail-value">{Math.round(weather.main.temp - ((100 - weather.main.humidity) / 5))}{getUnitSymbol()}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Cloud Cover</span>
                <span className="detail-value">{weather.clouds?.all || 0}%</span>
              </div>
            </div>
          </div>

          {/* Hourly Forecast */}
          {hourlyForecast.length > 0 && (
            <div className="hourly-forecast">
              <h3>24-Hour Forecast</h3>
              <div className="hourly-grid">
                {hourlyForecast.map((hour, index) => (
                  <div key={index} className="hourly-item">
                    <div className="hourly-time">{formatHour(hour.dt)}</div>
                    <div className="hourly-icon">{getWeatherIcon(hour.weather[0].id)}</div>
                    <div className="hourly-temp">{Math.round(hour.main.temp)}{getUnitSymbol()}</div>
                    <div className="hourly-desc">{hour.weather[0].description}</div>
                    <div className="hourly-precip">
                      {hour.pop > 0 ? `${Math.round(hour.pop * 100)}%` : '0%'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sunrise/Sunset & Moon Phase */}
          <div className="sun-moon-card">
            <div className="sun-times">
              <h3>Sun Times</h3>
              <div className="sun-grid">
                <div className="sun-item">
                  <span className="sun-icon">🌅</span>
                  <span className="sun-time">{formatTime(weather.sys.sunrise)}</span>
                  <span className="sun-label">Sunrise</span>
                </div>
                <div className="sun-item">
                  <span className="sun-icon">🌇</span>
                  <span className="sun-time">{formatTime(weather.sys.sunset)}</span>
                  <span className="sun-label">Sunset</span>
                </div>
              </div>
            </div>
            
            <div className="moon-phase">
              <h3>Moon Phase</h3>
              <div className="moon-info">
                <span className="moon-icon">{getMoonPhase(Date.now() / 1000).icon}</span>
                <span className="moon-name">{getMoonPhase(Date.now() / 1000).name}</span>
              </div>
            </div>
          </div>

          {/* 5-Day Forecast */}
          {forecast.length > 0 && (
            <div className="forecast-section">
              <h3>5-Day Forecast</h3>
              <div className="forecast-grid">
                {forecast.map((day, index) => (
                  <div key={index} className="forecast-day">
                    <div className="forecast-date">{formatDate(day.dt)}</div>
                    <div className="forecast-icon">
                      {getWeatherIcon(day.weather[0].id)}
                    </div>
                    <div className="forecast-temp">
                      {Math.round(day.main.temp)}{getUnitSymbol()}
                    </div>
                    <div className="forecast-desc">
                      {day.weather[0].description}
                    </div>
                    <div className="forecast-precip">
                      {day.pop > 0 ? `${Math.round(day.pop * 100)}%` : '0%'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Weather Maps */}
          <div className="maps-section">
            <h3>Weather Maps</h3>
            <div className="maps-controls">
              <button 
                className="map-btn"
                onClick={() => setShowMaps(!showMaps)}
              >
                {showMaps ? 'Hide Maps' : 'Show Weather Maps'}
              </button>
            </div>
            {showMaps && (
              <div className="maps-container">
                <iframe
                  src={getWeatherMapsUrl()}
                  title="Weather Maps"
                  className="weather-map"
                  frameBorder="0"
                />
              </div>
            )}
          </div>

          {/* Air Quality */}
          {aqiData.main && (
            <div className="aqi-card">
              <h3>Air Quality</h3>
              <div className="aqi-main">
                <div className="aqi-index">
                  <span className="aqi-number">{aqiData.main.aqi}</span>
                  <span className="aqi-label">AQI</span>
                </div>
                <div className="aqi-details">
                  <div className="aqi-description">
                    {getAQIDescription(aqiData.main.aqi).text}
                  </div>
                  <div className="aqi-health">
                    {getAQIDescription(aqiData.main.aqi).health}
                  </div>
                  <div className="pollutants">
                    <div className="pollutant">
                      <span>PM2.5: {aqiData.components.pm2_5} µg/m³</span>
                    </div>
                    <div className="pollutant">
                      <span>PM10: {aqiData.components.pm10} µg/m³</span>
                    </div>
                    <div className="pollutant">
                      <span>CO: {aqiData.components.co} µg/m³</span>
                    </div>
                    <div className="pollutant">
                      <span>NO₂: {aqiData.components.no2} µg/m³</span>
                    </div>
                    <div className="pollutant">
                      <span>O₃: {aqiData.components.o3} µg/m³</span>
                    </div>
                    <div className="pollutant">
                      <span>SO₂: {aqiData.components.so2} µg/m³</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Custom Alerts */}
          <div className="custom-alerts">
            <div className="alerts-header">
              <h3>Custom Weather Alerts</h3>
              <button className="add-alert-btn" onClick={addCustomAlert}>
                + Add Alert
              </button>
            </div>
            {customAlerts.length > 0 ? (
              <div className="alerts-list">
                {customAlerts.map(alert => (
                  <div key={alert.id} className="custom-alert-item">
                    <span>Alert when: {alert.temperature}°C and {alert.condition}</span>
                    <button 
                      className="remove-alert-btn"
                      onClick={() => removeCustomAlert(alert.id)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-alerts">No custom alerts set. Click "Add Alert" to create one.</p>
            )}
          </div>
        </div>
      )}

      {/* Welcome Message */}
      {!weather.main && !loading && !error && (
        <div className="welcome-message">
          <div className="welcome-content">
            <h2>Welcome to Weather App</h2>
            <p>Search for a city, use your current location, or try one of the popular cities below to get comprehensive weather information including current conditions, hourly forecasts, 5-day predictions, air quality, weather maps, and custom alerts.</p>
            <div className="welcome-features">
              <div className="feature">
                <span>🌤️</span>
                <span>Current Weather</span>
              </div>
              <div className="feature">
                <span>⏰</span>
                <span>Hourly Forecast</span>
              </div>
              <div className="feature">
                <span>📅</span>
                <span>5-Day Forecast</span>
              </div>
              <div className="feature">
                <span>🌬️</span>
                <span>Air Quality</span>
              </div>
              <div className="feature">
                <span>🌅</span>
                <span>Sun & Moon</span>
              </div>
              <div className="feature">
                <span>🗺️</span>
                <span>Weather Maps</span>
              </div>
              <div className="feature">
                <span>📍</span>
                <span>Current Location</span>
              </div>
              <div className="feature">
                <span>⚠️</span>
                <span>Weather Alerts</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
