const express = require("express");
const axios = require("axios");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const API_KEY = process.env.OPENWEATHER_API_KEY;

if (!API_KEY) {
  console.error("Missing OPENWEATHER_API_KEY in .env");
}

if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
  console.error("Missing Spotify client credentials in .env");
}

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, "../frontend")));

// 🔁 If someone goes to /index.html, redirect to /
app.get("/index.html", (req, res) => {
  res.redirect(301, "/");
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

app.get("/find-playlist", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/main.html"));
});


async function getSpotifyAccessToken() {
  const token = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString("base64");

  const response = await axios.post(
    "https://accounts.spotify.com/api/token",
    "grant_type=client_credentials",
    {
      headers: {
        Authorization: `Basic ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  return response.data.access_token;
}

app.get("/api/playlist", async (req, res) => {
  try {
    const { mood } = req.query; // warm / rainy / cold

    const token = await getSpotifyAccessToken();

    const searchTerms = {
      warm: "happy upbeat summer vibes",
      rainy: "lofi chill rain",
      cold: "cozy winter acoustic",
    };

    const q = searchTerms[mood] || "chill";

    const searchRes = await axios.get("https://api.spotify.com/v1/search", {
      params: {
        q,
        type: "playlist",
        limit: 1,
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const playlists = searchRes.data.playlists.items;
    if (!playlists.length) {
      return res.status(404).json({ error: "No playlist found for this mood" });
    }

    const playlistId = playlists[0].id;

    const tracksRes = await axios.get(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=10`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const tracks = tracksRes.data.items
      .filter((item) => item.track) // ignore null tracks
      .slice(0, 4)
      .map((item) => {
        const track = item.track;
        return {
          name: track.name,
          artist: track.artists?.[0]?.name || "Unknown Artist",
          img:
            track.album?.images?.[1]?.url ||
            track.album?.images?.[0]?.url ||
            "",
          url: track.external_urls?.spotify || "",
        };
      });

    if (!tracks.length) {
      return res.status(404).json({ error: "No tracks found in playlist" });
    }

    res.json(tracks);
  } catch (error) {
    console.error(error.response?.data || error.message);

    if (error.response?.status === 401) {
      return res
        .status(500)
        .json({ error: "Spotify auth failed. Check credentials." });
    }

    res.status(500).json({ error: "Failed fetching playlist" });
  }
});

app.get("/api/weather", async (req, res) => {
  const city = req.query.city;

  if (!city) {
    return res.status(400).json({ error: "City is required in query ?city=" });
  }

  try {
    const response = await axios.get(
      "https://api.openweathermap.org/data/2.5/weather",
      {
        params: {
          q: city,
          appid: API_KEY,
          units: "metric",
        },
      }
    );
    return res.json(response.data);
  } catch (error) {
    console.error(
      "Error from OpenWeather:",
      error.response?.data || error.message
    );

    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }

    return res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
