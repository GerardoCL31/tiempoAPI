# ClimaAPI

ClimaAtlas es una aplicacion web tipo mashup que permite buscar una ciudad y ver en una sola pantalla:

- su ubicacion y coordenadas
- el tiempo actual y el pronostico
- informacion basica del pais al que pertenece
- un resumen enciclopedico de la ciudad

La interfaz esta construida con HTML, CSS y JavaScript sin dependencias. Para servir las paginas HTML en local se incluye `serve.py`.

## APIs usadas

### 1. Open-Meteo

Se usa para dos rutas:

- Geocodificacion de ciudades:
  - `https://geocoding-api.open-meteo.com/v1/search?name={ciudad}&count=1&language=es&format=json`
- Tiempo y pronostico:
  - `https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=3`

### 2. REST Countries

Se usa para obtener informacion del pais detectado a partir del codigo ISO devuelto por Open-Meteo:

- `https://restcountries.com/v3.1/alpha/{countryCode}`

### 3. Wikipedia REST API

Se usa para mostrar un resumen legible y una imagen representativa de la ciudad:

- `https://en.wikipedia.org/api/rest_v1/page/summary/{cityName}`

## Relacion entre las APIs

Las APIs se combinan con una logica unica de "explorar destinos":

1. El usuario busca una ciudad.
2. Open-Meteo localiza esa ciudad y devuelve sus coordenadas y el codigo del pais.
3. Con esas coordenadas, Open-Meteo devuelve el tiempo actual y el pronostico.
4. Con el codigo del pais, REST Countries completa el contexto geografico y demografico.
5. Con el nombre de la ciudad, Wikipedia aporta una explicacion breve e imagen.

La combinacion tiene sentido porque todas las respuestas describen el mismo lugar desde angulos distintos: localizacion, clima, pais y contexto cultural.

## Cache

La aplicacion implementa cache cliente mediante `localStorage`.

- Prefijo de cache: `climaatlas:v1:`
- Tiempo de vida: 30 minutos
- Se cachean por separado:
  - busquedas de geocodificacion
  - datos meteorologicos
  - datos del pais
  - resumen de Wikipedia

Si una peticion se repite dentro del TTL, la app reutiliza la respuesta almacenada en lugar de volver a consultar la API.

## API keys

No hace falta configurar ninguna API key para ejecutar esta version del proyecto.

## Estructura del proyecto

- `index.html`: interfaz principal
- `style.css`: estilos
- `app.js`: logica de integracion con APIs y cache
- `serve.py`: servidor HTTP minimo para abrir la app en local
- `docs/screenshots/`: capturas de pantalla para la entrega

## Ejecucion

1. Abre una terminal en la carpeta del proyecto.
2. Ejecuta:

```bash
python serve.py
```

3. Abre en el navegador:

```text
http://127.0.0.1:8000
```

## Capturas

Se incluyen capturas reales de la interfaz en:

- `docs/screenshots/climaatlas-madrid.png`
- `docs/screenshots/climaatlas-tokyo-mobile.png`

Estas capturas muestran:

- una vista completa de escritorio con el mashup cargado
- una vista movil donde se aprecia la adaptacion responsive y los datos combinados de las APIs
