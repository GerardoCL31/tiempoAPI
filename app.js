const CACHE_TTL_MS = 30 * 60 * 1000;
const CACHE_PREFIX = "climaatlas:v2:";

const form = document.getElementById("search-form");
const cityInput = document.getElementById("city-input");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const forecastEl = document.getElementById("forecast");

const el = {
  placeLine: document.getElementById("place-line"),
  cityName: document.getElementById("city-name"),
  coords: document.getElementById("coords"),
  sourceBadge: document.getElementById("source-badge"),
  weatherText: document.getElementById("weather-text"),
  temperature: document.getElementById("temperature"),
  feelsLike: document.getElementById("feels-like"),
  humidity: document.getElementById("humidity"),
  wind: document.getElementById("wind"),
  aiAdvice: document.getElementById("ai-advice"),
  flag: document.getElementById("flag"),
  countryName: document.getElementById("country-name"),
  countryRegion: document.getElementById("country-region"),
  countryCapital: document.getElementById("country-capital"),
  countryPopulation: document.getElementById("country-population"),
  countryLanguages: document.getElementById("country-languages"),
  countryCurrency: document.getElementById("country-currency"),
  articleImage: document.getElementById("article-image"),
  articleExtract: document.getElementById("article-extract"),
  articleLink: document.getElementById("article-link"),
};

const weatherLabels = {
  0: "Clear sky",
  1: "Mostly clear",
  2: "Partly cloudy",
  3: "Cloudy",
  45: "Fog",
  48: "Fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  80: "Showers",
  81: "Showers",
  82: "Strong showers",
  95: "Thunderstorm",
  96: "Thunderstorm",
  99: "Thunderstorm",
};

function setStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.classList.toggle("error", isError);
}

function norm(text) {
  return text.trim().toLowerCase();
}

function readCache(key) {
  const raw = localStorage.getItem(CACHE_PREFIX + key);
  if (!raw) {
    return null;
  }

  try {
    const saved = JSON.parse(raw);
    if (Date.now() - saved.savedAt > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return saved.payload;
  } catch {
    localStorage.removeItem(CACHE_PREFIX + key);
    return null;
  }
}

function writeCache(key, payload) {
  localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ savedAt: Date.now(), payload }));
}

async function cachedFetchJson(key, url) {
  const cached = readCache(key);
  if (cached) {
    return { data: cached, source: "cache" };
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Request failed (${response.status})`);
    }

    const data = await response.json();
    writeCache(key, data);
    return { data, source: "api" };
  } finally {
    window.clearTimeout(timeout);
  }
}

async function getCity(query) {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", query);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const { data, source } = await cachedFetchJson(`geo:${norm(query)}`, url.toString());
  if (!data.results?.length) {
    throw new Error("City not found.");
  }

  return { city: data.results[0], source };
}

function getWeather(lat, lon) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", lat);
  url.searchParams.set("longitude", lon);
  url.searchParams.set("current", "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code");
  url.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "3");
  return cachedFetchJson(`weather:${lat},${lon}`, url.toString());
}

async function getCountry(code) {
  const { data, source } = await cachedFetchJson(
    `country:${code}`,
    `https://restcountries.com/v3.1/alpha/${encodeURIComponent(code)}`
  );
  return { country: Array.isArray(data) ? data[0] : data, source };
}

function getArticle(name) {
  return cachedFetchJson(
    `wiki:${norm(name)}`,
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`
  );
}

function fallbackCountry(city) {
  return {
    name: { common: city.country || "No data" },
    region: "No data",
    subregion: "",
    capital: [],
    population: 0,
    languages: null,
    currencies: null,
    flags: null,
  };
}

function fallbackArticle(city) {
  return {
    title: city.name,
    extract: "City article information is not available right now, but the live weather forecast is ready.",
    thumbnail: null,
    content_urls: {
      desktop: {
        page: `https://en.wikipedia.org/wiki/${encodeURIComponent(city.name)}`,
      },
    },
  };
}

function temp(value) {
  return `${Math.round(value)} deg C`;
}

function number(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

function getAdvice(current, daily) {
  const tempNow = current.temperature_2m;
  const wind = current.wind_speed_10m;
  const rainChance = Math.max(...daily.precipitation_probability_max.map((item) => item ?? 0));
  const weatherCode = current.weather_code;

  if (weatherCode >= 95) {
    return "Storm risk detected. Stay indoors if possible and avoid open areas.";
  }

  if (tempNow >= 32) {
    return "Heat warning. Drink water, avoid direct sun and plan outdoor activities for later.";
  }

  if (tempNow <= 3) {
    return "Cold warning. Wear warm clothes and check transport conditions before leaving.";
  }

  if (wind >= 35) {
    return "Strong wind detected. Be careful with bikes, scooters and outdoor objects.";
  }

  if (rainChance >= 60) {
    return "Rain is likely soon. Take an umbrella and protect electronic devices.";
  }

  return "Conditions look safe. The app recommends normal activity and checking the forecast again later.";
}

function renderForecast(daily) {
  forecastEl.innerHTML = "";

  daily.time.forEach((date, index) => {
    const item = document.createElement("div");
    item.className = "forecast-item";

    const label = new Date(date).toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });

    item.innerHTML = `
      <strong>${label}</strong>
      <p>${weatherLabels[daily.weather_code[index]] || "No data"}</p>
      <p>${temp(daily.temperature_2m_min[index])} / ${temp(daily.temperature_2m_max[index])}</p>
      <p>Rain: ${daily.precipitation_probability_max[index] ?? 0}%</p>
    `;

    forecastEl.appendChild(item);
  });
}

function render(city, weather, country, article, sourceLabel) {
  const countryName = country.name?.common || city.country;
  const languages = country.languages ? Object.values(country.languages).join(", ") : "No data";
  const currencies = country.currencies
    ? Object.values(country.currencies).map((item) => item.name).join(", ")
    : "No data";

  el.placeLine.textContent = `${city.country}${city.admin1 ? ` - ${city.admin1}` : ""}`;
  el.cityName.textContent = city.name;
  el.coords.textContent = `Lat ${city.latitude.toFixed(2)} - Lon ${city.longitude.toFixed(2)} - ${weather.timezone}`;
  el.sourceBadge.textContent = sourceLabel;

  el.weatherText.textContent = weatherLabels[weather.current.weather_code] || "No data";
  el.temperature.textContent = temp(weather.current.temperature_2m);
  el.feelsLike.textContent = temp(weather.current.apparent_temperature);
  el.humidity.textContent = `${weather.current.relative_humidity_2m}%`;
  el.wind.textContent = `${Math.round(weather.current.wind_speed_10m)} km/h`;
  el.aiAdvice.textContent = getAdvice(weather.current, weather.daily);

  el.flag.src = country.flags?.png || "";
  el.flag.alt = `Flag of ${countryName}`;
  el.countryName.textContent = countryName;
  el.countryRegion.textContent = `${country.region || "No data"}${country.subregion ? ` - ${country.subregion}` : ""}`;
  el.countryCapital.textContent = country.capital?.join(", ") || "No data";
  el.countryPopulation.textContent = number(country.population || 0);
  el.countryLanguages.textContent = languages;
  el.countryCurrency.textContent = currencies;

  el.articleImage.src = article.thumbnail?.source || country.flags?.png || "";
  el.articleImage.alt = article.title || city.name;
  el.articleExtract.textContent = article.extract || "Wikipedia did not return a summary for this city.";
  el.articleLink.href = article.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(city.name)}`;

  renderForecast(weather.daily);
  resultsEl.classList.remove("hidden");
}

async function loadCity(query) {
  setStatus("Consulting live APIs...");

  try {
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set("city", query);
    window.history.replaceState({}, "", currentUrl);

    const { city, source: citySource } = await getCity(query);
    const { data: weather, source: weatherSource } = await getWeather(city.latitude, city.longitude);
    const [countryResult, articleResult] = await Promise.allSettled([
      getCountry(city.country_code),
      getArticle(city.name),
    ]);

    const countryData =
      countryResult.status === "fulfilled"
        ? countryResult.value
        : { country: fallbackCountry(city), source: "offline" };
    const articleData =
      articleResult.status === "fulfilled"
        ? articleResult.value
        : { data: fallbackArticle(city), source: "offline" };

    const allCached = [citySource, weatherSource, countryData.source, articleData.source].every((item) => item === "cache");
    render(city, weather, countryData.country, articleData.data, allCached ? "Cache" : "API");
    setStatus(`Future forecast loaded for ${city.name}.`);
  } catch (error) {
    setStatus(error.message || "Something went wrong.", true);
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const query = cityInput.value.trim();
  if (query) {
    loadCity(query);
  }
});

document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    cityInput.value = chip.dataset.city;
    loadCity(chip.dataset.city);
  });
});

const initialCity = new URLSearchParams(window.location.search).get("city") || "Madrid";
cityInput.value = initialCity;
loadCity(initialCity);
