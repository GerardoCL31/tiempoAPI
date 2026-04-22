const CACHE_TTL_MS = 30 * 60 * 1000;
const CACHE_PREFIX = "climaatlas:v1:";

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
  0: "Despejado",
  1: "Mayormente despejado",
  2: "Parcialmente nuboso",
  3: "Cubierto",
  45: "Niebla",
  48: "Niebla",
  51: "Llovizna ligera",
  53: "Llovizna",
  55: "Llovizna intensa",
  61: "Lluvia ligera",
  63: "Lluvia",
  65: "Lluvia intensa",
  71: "Nieve ligera",
  73: "Nieve",
  75: "Nieve intensa",
  80: "Chubascos",
  81: "Chubascos",
  82: "Chubascos fuertes",
  95: "Tormenta",
  96: "Tormenta",
  99: "Tormenta",
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

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`La petición falló (${response.status})`);
  }

  const data = await response.json();
  writeCache(key, data);
  return { data, source: "api" };
}

async function getCity(query) {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", query);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "es");
  url.searchParams.set("format", "json");

  const { data, source } = await cachedFetchJson(`geo:${norm(query)}`, url.toString());
  if (!data.results?.length) {
    throw new Error("No se encontró esa ciudad.");
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

function temp(value) {
  return `${Math.round(value)} °C`;
}

function number(value) {
  return new Intl.NumberFormat("es-ES").format(value);
}

function renderForecast(daily) {
  forecastEl.innerHTML = "";

  daily.time.forEach((date, index) => {
    const item = document.createElement("div");
    item.className = "forecast-item";

    const label = new Date(date).toLocaleDateString("es-ES", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });

    item.innerHTML = `
      <strong>${label}</strong>
      <p>${weatherLabels[daily.weather_code[index]] || "Sin dato"}</p>
      <p>${temp(daily.temperature_2m_min[index])} / ${temp(daily.temperature_2m_max[index])}</p>
      <p>Lluvia: ${daily.precipitation_probability_max[index] ?? 0}%</p>
    `;

    forecastEl.appendChild(item);
  });
}

function render(city, weather, country, article, sourceLabel) {
  const countryName = country.translations?.spa?.common || country.name?.common || city.country;
  const languages = country.languages ? Object.values(country.languages).join(", ") : "Sin dato";
  const currencies = country.currencies
    ? Object.values(country.currencies).map((item) => item.name).join(", ")
    : "Sin dato";

  el.placeLine.textContent = `${city.country}${city.admin1 ? ` · ${city.admin1}` : ""}`;
  el.cityName.textContent = city.name;
  el.coords.textContent = `Lat ${city.latitude.toFixed(2)} · Lon ${city.longitude.toFixed(2)} · ${weather.timezone}`;
  el.sourceBadge.textContent = sourceLabel;

  el.weatherText.textContent = weatherLabels[weather.current.weather_code] || "Sin dato";
  el.temperature.textContent = temp(weather.current.temperature_2m);
  el.feelsLike.textContent = temp(weather.current.apparent_temperature);
  el.humidity.textContent = `${weather.current.relative_humidity_2m}%`;
  el.wind.textContent = `${Math.round(weather.current.wind_speed_10m)} km/h`;

  el.flag.src = country.flags?.png || "";
  el.flag.alt = `Bandera de ${countryName}`;
  el.countryName.textContent = countryName;
  el.countryRegion.textContent = `${country.region || "Sin dato"}${country.subregion ? ` · ${country.subregion}` : ""}`;
  el.countryCapital.textContent = country.capital?.join(", ") || "Sin dato";
  el.countryPopulation.textContent = number(country.population || 0);
  el.countryLanguages.textContent = languages;
  el.countryCurrency.textContent = currencies;

  el.articleImage.src = article.thumbnail?.source || country.flags?.png || "";
  el.articleImage.alt = article.title || city.name;
  el.articleExtract.textContent = article.extract || "Wikipedia no devolvió resumen para esta ciudad.";
  el.articleLink.href = article.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(city.name)}`;

  renderForecast(weather.daily);
  resultsEl.classList.remove("hidden");
}

async function loadCity(query) {
  setStatus("Consultando APIs...");

  try {
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set("city", query);
    window.history.replaceState({}, "", currentUrl);

    const { city, source: citySource } = await getCity(query);
    const [{ data: weather, source: weatherSource }, { country, source: countrySource }, { data: article, source: articleSource }] =
      await Promise.all([
        getWeather(city.latitude, city.longitude),
        getCountry(city.country_code),
        getArticle(city.name),
      ]);

    const allCached = [citySource, weatherSource, countrySource, articleSource].every((item) => item === "cache");
    render(city, weather, country, article, allCached ? "Cache" : "API");
    setStatus(`Datos cargados para ${city.name}.`);
  } catch (error) {
    setStatus(error.message || "Ha ocurrido un error.", true);
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
