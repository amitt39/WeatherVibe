const BASE_URL = "https://weathervibes.onrender.com";

const locationInput = document.querySelector(".location-inp");
const findMyPlaylistBtn = document.querySelector("#submit");

// Weather elements
const tempVal = document.querySelector("#tempVal");
const conditionVal = document.querySelector("#conditionVal");
const cityVal = document.querySelector("#cityVal");

function showLoader() {
  document.getElementById("loader-overlay").style.display = "flex";
}

function hideLoader() {
  document.getElementById("loader-overlay").style.display = "none";
}

function showResult() {
  document.querySelector(".displayResult").style.display = "block";
}

function clearPlaylistUI() {
  for (let i = 1; i <= 4; i++) {
    document.querySelector(`#songName${i}`).textContent = "";
    document.querySelector(`#artistName${i}`).textContent = "";
    document.querySelector(`#songImg${i}`).src = "";
    document.querySelector(`#song${i}`).href = "#";
  }
}

async function findPlayList() {
  clearPlaylistUI();
  tempVal.textContent = "";
  conditionVal.textContent = "";
  cityVal.textContent = "";

  const location = locationInput.value.trim();
  if (!location) {
    alert("Please enter a city");
    return null;
  }

  try {
    const response = await axios.get(`${BASE_URL}/api/weather`, {
      params: { city: location },
    });
    return response.data;
  } catch (error) {
    console.error("Weather error:", error.response?.data || error.message);

    if (error.response?.status === 404) {
      alert("City not found. Please check the spelling.");
    } else {
      alert("Couldn't fetch weather right now. Please try again.");
    }

    return null;
  }
}

function updateWeatherUI(weatherData) {
  tempVal.textContent = `${Math.round(weatherData.main.temp)}°C`;
  conditionVal.textContent = weatherData.weather[0].main;
  cityVal.textContent = weatherData.name;
}

function decideCategories(weatherData) {
  const temperature = weatherData.main.temp;
  const weatherCondition = weatherData.weather[0].main;
  const weatherDescription = weatherData.weather[0].description;
  const humidity = weatherData.main.humidity;
  const cloudiness = weatherData.clouds.all;
  const windSpeed = weatherData.wind.speed;

  if (
    temperature >= 22 &&
    ["Clear", "Clouds", "Haze", "Smoke", "Mist"].includes(weatherCondition) &&
    cloudiness < 70
  )
    return "warm";

  if (
    ["Rain", "Drizzle", "Thunderstorm"].includes(weatherCondition) ||
    humidity > 75 ||
    cloudiness > 80 ||
    weatherDescription.toLowerCase().includes("rain")
  )
    return "rainy";

  if (temperature <= 18 || windSpeed > 5 || (windSpeed > 4 && cloudiness > 60))
    return "cold";

  return "warm";
}

function setTrackCard(n, track) {
  document.querySelector(`#songName${n}`).textContent = track.name;
  document.querySelector(`#artistName${n}`).textContent = track.artist;
  document.querySelector(`#songImg${n}`).src = track.img;
  document.querySelector(`#song${n}`).href = track.url;
}

function updatePlaylistUI(tracks) {
  tracks.slice(0, 4).forEach((track, i) => {
    setTrackCard(i + 1, track);
  });
}
findMyPlaylistBtn.addEventListener("click", async (e) => {
  e.preventDefault();
  showLoader();
  findMyPlaylistBtn.disabled = true;

  try {
    const weatherData = await findPlayList();
    if (!weatherData) return; 

    updateWeatherUI(weatherData);

    const category = decideCategories(weatherData);

    const playlistResponse = await axios.get(`${BASE_URL}/api/playlist`, {
      params: { mood: category },
    });

    const tracks = playlistResponse.data;
    if (!tracks || tracks.length === 0) {
      alert("No playlist found for this mood.");
      return;
    }

    updatePlaylistUI(tracks);


    showResult();
  } catch (error) {
    console.error(error);
    alert("Something went wrong. Please try again.");
  } finally {
    hideLoader();
    findMyPlaylistBtn.disabled = false;
  }
});
