import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.static("public"));

const API_KEY = process.env.API_KEY;

app.get("/api/weather", async (req,res)=>{
  const city = req.query.city;
  if(!city) return res.json({error:"City is required"});
  try{
    const geoURL = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${API_KEY}`;
    const g = await fetch(geoURL);
    const geo = await g.json();
    if(!geo.length) return res.json({error:"City not found"});
    const {lat,lon,name} = geo[0];

    const wURL = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
    const w = await fetch(wURL);
    const weather = await w.json();

    const fURL = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
    const f = await fetch(fURL);
    const forecast = await f.json();

    res.json({
      city:name,
      lat,
      lon,
      current:weather,
      forecast:forecast.list ? forecast.list.slice(0,8): []
    });

  }catch(err){ res.json({error:err.message}); }
});

app.listen(3000,()=>console.log("WeatherWise online server running"));
