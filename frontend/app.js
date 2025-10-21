const $ = q => document.querySelector(q);
const cityInput = $("#cityInput");
const dateInput = $("#dateInput");
const searchBtn = $("#searchBtn");
const resultSection = $("#resultSection");
const resultTitle = $("#resultTitle");
const currentBox = $("#current");
const forecastBox = $("#forecast");
const loader = $("#loader");
const suggestionsBox = $("#suggestions");

const geoApi = "https://geocoding-api.open-meteo.com/v1/search?count=5&language=es&format=json&name=";
const baseApi =
  "https://api.open-meteo.com/v1/forecast?daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto";

let selectedCity = null;

const weatherIcons = {
  0: "☀️", 1: "🌤️", 2: "⛅", 3: "☁️",
  45: "🌫️", 48: "🌫️",
  51: "🌦️", 53: "🌦️", 55: "🌦️",
  61: "🌧️", 63: "🌧️", 65: "🌧️",
  71: "❄️", 73: "❄️", 75: "❄️",
  80: "🌧️", 81: "🌧️", 82: "🌧️",
  95: "⛈️", 96: "⛈️", 99: "⛈️"
};

function formatDate(isoDate) {
  const [y, m, d] = isoDate.split("-");
  return `${d}-${m}-${y}`;
}

cityInput.addEventListener("input", async () => {
  const query = cityInput.value.trim();
  suggestionsBox.innerHTML = "";
  if (query.length < 3) {
    suggestionsBox.classList.add("d-none");
    return;
  }

  try {
    const resp = await fetch(geoApi + encodeURIComponent(query));
    const data = await resp.json();
    if (!data.results) {
      suggestionsBox.classList.add("d-none");
      return;
    }

    for (const c of data.results) {
      const div = document.createElement("div");
      div.className = "suggestion-item";

      const flag = document.createElement("img");
      flag.className = "flag";
      flag.src = `https://flagcdn.com/24x18/${c.country_code.toLowerCase()}.png`;

      const text = document.createElement("span");
      text.textContent = `${c.name}, ${c.country}`;

      div.appendChild(flag);
      div.appendChild(text);

      div.addEventListener("click", () => {
        cityInput.value = `${c.name}, ${c.country}`;
        selectedCity = c;
        suggestionsBox.classList.add("d-none");
      });

      suggestionsBox.appendChild(div);
    }

    suggestionsBox.classList.remove("d-none");
  } catch (err) {
    console.error("Error obteniendo sugerencias:", err);
  }
});

cityInput.addEventListener("blur", () => {
  setTimeout(() => suggestionsBox.classList.add("d-none"), 200);
});

cityInput.addEventListener("keyup", e => {
  if (e.key === "Enter") searchWeather();
});
searchBtn.addEventListener("click", searchWeather);

async function searchWeather() {
  const city = cityInput.value.trim();
  const date = dateInput.value;
  if (!city) return alert("Ingresá una ciudad.");

  loader.style.display = "block";
  resultSection.classList.add("d-none");

  try {
    let geo = selectedCity;
    if (!geo) {
      const geoResp = await fetch(geoApi + encodeURIComponent(city));
      const geoData = await geoResp.json();
      if (!geoData.results || geoData.results.length === 0) {
        alert("Ciudad no encontrada.");
        loader.style.display = "none";
        return;
      }
      geo = geoData.results[0];
    }

    const startDate = date ? new Date(date) : new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 5);

    const start = startDate.toISOString().split("T")[0];
    const end = endDate.toISOString().split("T")[0];

    resultTitle.textContent = `🌤 Clima desde ${formatDate(start)} hasta ${formatDate(end)}`;

    const url = `${baseApi}&latitude=${geo.latitude}&longitude=${geo.longitude}&start_date=${start}&end_date=${end}`;
    const resp = await fetch(url);
    const data = await resp.json();

    renderRange(data, geo, start, end);
  } catch (err) {
    console.error("Error al obtener clima:", err);
    alert("Error al obtener el clima.");
  } finally {
    loader.style.display = "none";
  }
}

function renderRange(data, geo, start, end) {
  const { name, country } = geo;

  const iconToday = weatherIcons[data.daily.weathercode[0]] || "🌍";
  const tmax = data.daily.temperature_2m_max[0];
  const tmin = data.daily.temperature_2m_min[0];
  const rain = data.daily.precipitation_probability_max[0] ?? 0;

  currentBox.innerHTML = `
    <div class="col-md-3 col-6">
      <div class="stat text-center">
        <div class="value">${iconToday}</div>
        <div class="label">Condición inicial</div>
      </div>
    </div>
    <div class="col-md-3 col-6">
      <div class="stat text-center">
        <div class="label">Máx / Mín</div>
        <div class="value">${tmax}° / ${tmin}°</div>
      </div>
    </div>
    <div class="col-md-3 col-6">
      <div class="stat text-center">
        <div class="label">Prob. Lluvia</div>
        <div class="value">${rain}%</div>
      </div>
    </div>
    <div class="col-md-6">
      <div class="stat text-center">
        <div class="label">Ubicación</div>
        <div class="value">${name}, ${country}</div>
      </div>
    </div>
  `;

  forecastBox.innerHTML = data.daily.time
    .map((d, i) => {
      const icon = weatherIcons[data.daily.weathercode[i]] || "🌍";
      return `
        <div class="col-md-2 col-6">
          <div class="stat text-center">
            <div class="value">${icon}</div>
            <div class="label">${formatDate(d)}</div>
            <div class="value">${data.daily.temperature_2m_max[i]}° / ${data.daily.temperature_2m_min[i]}°</div>
            <div class="label">Lluvia: ${data.daily.precipitation_probability_max[i] ?? 0}%</div>
          </div>
        </div>
      `;
    })
    .join("");

  resultSection.classList.remove("d-none");
}
