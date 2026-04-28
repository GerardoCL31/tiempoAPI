# DEMO

https://tiempo.gerardocorona.io/

# ClimaAPI

ClimaAtlas is a mashup-style web application that lets users search for a city and view the following information on a single screen:

- its location and coordinates
- the current weather and forecast
- basic information about the country it belongs to
- an encyclopedic summary of the city

The interface is built with HTML, CSS, and JavaScript without dependencies. The project includes `serve.py` to serve the HTML pages locally.

## APIs Used

### 1. Open-Meteo

It is used for two routes:

- City geocoding:
  - `https://geocoding-api.open-meteo.com/v1/search?name={city}&count=1&language=es&format=json`
- Weather and forecast:
  - `https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=3`

### 2. REST Countries

It is used to retrieve information about the detected country from the ISO code returned by Open-Meteo:

- `https://restcountries.com/v3.1/alpha/{countryCode}`

### 3. Wikipedia REST API

It is used to display a readable summary and a representative image of the city:

- `https://en.wikipedia.org/api/rest_v1/page/summary/{cityName}`

## Relationship Between the APIs

The APIs are combined through a single "destination exploration" flow:

1. The user searches for a city.
2. Open-Meteo locates that city and returns its coordinates and country code.
3. With those coordinates, Open-Meteo returns the current weather and forecast.
4. With the country code, REST Countries completes the geographic and demographic context.
5. With the city name, Wikipedia provides a brief explanation and image.

This combination makes sense because all responses describe the same place from different angles: location, weather, country, and cultural context.

## Cache

The application implements client-side caching with `localStorage`.

- Cache prefix: `climaatlas:v1:`
- Time to live: 30 minutes
- The following data is cached separately:
  - geocoding searches
  - weather data
  - country data
  - Wikipedia summary

If a request is repeated within the TTL, the app reuses the stored response instead of querying the API again.

## API Keys

No API key configuration is required to run this version of the project.

## Project Structure

- `index.html`: main interface
- `style.css`: styles
- `app.js`: API integration and cache logic
- `serve.py`: minimal HTTP server for opening the app locally
- `docs/screenshots/`: screenshots for submission

## Running the Project

1. Open a terminal in the project folder.
2. Run:

```bash
python serve.py
```

3. Open the following URL in your browser:

```text
http://127.0.0.1:8000
```

## Screenshots

Real interface screenshots are included in:

- `docs/screenshots/climaatlas-madrid.png`
- `docs/screenshots/climaatlas-tokyo-mobile.png`

These screenshots show:

- a full desktop view with the loaded mashup
- a mobile view showing the responsive layout and the combined API data
