import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.static("public"));

const API_KEY = process.env.API_KEY; // use env var online

app.get("/api/weather", async (req, res) => {
    const city = req.query.city;
    if (!city) return res.json({ error: "City is required" });

    try {
        const geoURL = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${API_KEY}`;
        const geoRes = await fetch(geoURL);
        const geo = await geoRes.json();

        if (!geo.length) return res.json({ error: "City not found" });

        const { lat, lon, name } = geo[0];

        const weatherURL = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
        const wRes = await fetch(weatherURL);
        const weather = await wRes.json();

        const fcURL = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
        const fRes = await fetch(fcURL);
        const forecast = await fRes.json();

        res.json({
            city: name,
            lat,
            lon,
            current: weather,
            forecast: forecast.list ? forecast.list.slice(0, 8) : []
        });
    } catch (err) {
        res.json({ error: err.message });
    }
});

app.listen(3000, () => console.log("WeatherWise running"));