/* WeatherWise - polished frontend
   Expects backend at /api/weather?city=... (already present)
*/

const searchBtn = document.getElementById('searchBtn');
const cityInput = document.getElementById('cityInput');
const saveBtn = document.getElementById('saveBtn');
const geoBtn = document.getElementById('geoBtn');
const loader = document.getElementById('loader');
const errorEl = document.getElementById('error');

const currentCard = document.getElementById('currentCard');
const chartCard = document.getElementById('chartCard');
const forecastCard = document.getElementById('forecastCard');

const cityNameEl = document.getElementById('cityName');
const localTimeEl = document.getElementById('localTime');
const conditionEl = document.getElementById('condition');
const tempEl = document.getElementById('temp');
const feelsEl = document.getElementById('feels');
const humidityEl = document.getElementById('humidity');
const windEl = document.getElementById('wind');
const pressureEl = document.getElementById('pressure');

const favoritesList = document.getElementById('favoritesList');
const refreshBtn = document.getElementById('refreshBtn');
const downloadBtn = document.getElementById('downloadBtn');
const themeToggle = document.getElementById('themeToggle');

let tempChart = null;
let lastData = null;

// Utils
function show(el){ el.classList.remove('hidden'); }
function hide(el){ el.classList.add('hidden'); }
function setLoading(on){
  if(on){ show(loader); searchBtn.disabled = true; searchBtn.textContent = 'Searching...'; }
  else { hide(loader); searchBtn.disabled = false; searchBtn.textContent = 'Search'; }
}
function setError(msg){
  if(!msg){ hide(errorEl); errorEl.textContent = ''; return; }
  errorEl.textContent = msg; show(errorEl);
}

// THEME
function applyTheme(theme){
  if(theme === 'dark') document.documentElement.classList.add('dark');
  else document.documentElement.classList.remove('dark');
  localStorage.setItem('weatherwise:theme', theme);
  themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
}
themeToggle.addEventListener('click', ()=>{
  const now = localStorage.getItem('weatherwise:theme') || 'light';
  applyTheme(now === 'light' ? 'dark' : 'light');
});
// init theme
applyTheme(localStorage.getItem('weatherwise:theme') || 'light');

// Favorites
function loadFavorites(){
  return JSON.parse(localStorage.getItem('weatherwise:favs') || '[]');
}
function saveFavorites(list){
  localStorage.setItem('weatherwise:favs', JSON.stringify(list));
  renderFavorites();
}
function renderFavorites(){
  const favs = loadFavorites();
  favoritesList.innerHTML = '';
  if(!favs.length){ favoritesList.innerHTML = '<div class="muted small">No favorites yet</div>'; return; }
  favs.forEach(city => {
    const li = document.createElement('li');
    li.className = 'fav-item';
    li.innerHTML = `<span>${city}</span><div><button class="fav-load">Load</button> <button class="fav-remove">✕</button></div>`;
    favoritesList.appendChild(li);
    li.querySelector('.fav-load').addEventListener('click', ()=> {
      cityInput.value = city;
      doSearch(city);
    });
    li.querySelector('.fav-remove').addEventListener('click', ()=> {
      const newFav = loadFavorites().filter(c => c !== city);
      saveFavorites(newFav);
    });
  });
}

// Download JSON
downloadBtn.addEventListener('click', () => {
  if(!lastData) return alert('No data to download');
  const blob = new Blob([JSON.stringify(lastData, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${(lastData.city || 'weather')}.json`; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
});

// Refresh button reloads last city
refreshBtn.addEventListener('click', ()=>{
  const city = cityInput.value.trim();
  if(city) doSearch(city);
});

// Save button
saveBtn.addEventListener('click', ()=>{
  const city = cityInput.value.trim();
  if(!city){ alert('Type city first'); return; }
  const favs = loadFavorites();
  if(!favs.includes(city)){ favs.unshift(city); saveFavorites(favs.slice(0,10)); }
});

// Geo location
geoBtn.addEventListener('click', ()=>{
  if(!navigator.geolocation){ alert('Geolocation not supported'); return; }
  setLoading(true);
  navigator.geolocation.getCurrentPosition(async pos => {
    const {latitude, longitude} = pos.coords;
    // ask server for reverse using our API by building a city param like "lat,lon"
    // but our server expects city name. We'll call a public reverse geocode via open APIs would need key.
    // Simpler: use a free geocode via open endpoint in node? to keep it reliable, we'll attempt to use server's API first by using lat,lon hack
    // Try call server route with "lat,lon" to see if server handles; else prompt user to type.
    try {
      const res = await fetch(`/api/weather?city=${latitude},${longitude}`);
      const data = await res.json();
      if(data.error) { setError('Reverse geocode failed — type a city (or use hotspot).'); setLoading(false); return; }
      cityInput.value = data.city || `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
      renderWeather(data);
    } catch(e){ setError('Geo lookup failed'); }
    setLoading(false);
  }, err => { setLoading(false); alert('Geolocation denied or failed'); }, {timeout:10000});
});

// Core fetch + render
async function doSearch(city){
  // if city provided, set input too
  if(city) cityInput.value = city;
  const q = cityInput.value && cityInput.value.trim();
  if(!q){ setError('Please enter a city name'); return; }
  setError('');
  setLoading(true);
  try {
    const res = await fetch(`/api/weather?city=${encodeURIComponent(q)}`, {cache:'no-store'});
    if(!res.ok){ const txt = await res.text(); setError(`Server error ${res.status}: ${txt}`); setLoading(false); return; }
    const data = await res.json();
    if(data.error){ setError(data.error); setLoading(false); return; }
    lastData = data;
    renderWeather(data);
  } catch(err){
    console.error(err);
    setError('Network error. Is the server running?');
  } finally { setLoading(false); }
}

// render helper
function renderWeather(data){
  // show current
  cityNameEl.textContent = data.city || `${data.lat},${data.lon}`;
  const now = new Date();
  localTimeEl.textContent = now.toLocaleString();
  conditionEl.textContent = data.current?.weather?.[0]?.description ?? '—';
  tempEl.textContent = Math.round(data.current?.main?.temp ?? '—') + '°C';
  feelsEl.textContent = 'Feels like ' + (Math.round(data.current?.main?.feels_like ?? '—') + '°C');
  humidityEl.textContent = data.current?.main?.humidity ?? '—';
  windEl.textContent = data.current?.wind?.speed ?? '—';
  pressureEl.textContent = data.current?.main?.pressure ?? '—';

  show(currentCard);

  // forecast (we expect forecast array)
  const forecast = data.forecast || [];
  const labels = forecast.map(f => f.dt_txt ? f.dt_txt.slice(11,16) : '');
  const temps = forecast.map(f => f.main?.temp ?? null);

  // chart
  if(tempChart) tempChart.destroy();
  const ctx = document.getElementById('tempChart').getContext('2d');
  tempChart = new Chart(ctx, {
    type:'line',
    data:{
      labels,
      datasets:[{
        label:'Temp (°C)',
        data:temps,
        borderColor:'#0ea5e9',
        backgroundColor:'rgba(14,165,233,0.08)',
        tension:0.3,
        pointRadius:3
      }]
    },
    options:{responsive:true,maintainAspectRatio:false,scales:{y:{beginAtZero:false}}}
  });
  show(chartCard);

  // short forecast (3 items)
  const fcWrap = document.getElementById('forecastList');
  fcWrap.innerHTML = '';
  for(let i=0;i<Math.min(3,forecast.length);i++){
    const f = forecast[i];
    const div = document.createElement('div');
    div.className = 'forecast-item';
    div.innerHTML = `<div class="small muted">${f.dt_txt ? f.dt_txt.slice(0,10)+' '+f.dt_txt.slice(11,16) : ''}</div>
                     <div style="font-weight:600">${Math.round(f.main.temp)}°C</div>
                     <div class="muted small">${f.weather[0].main}</div>`;
    fcWrap.appendChild(div);
  }
  show(forecastCard);
  renderFavorites();
}

// initial wiring
searchBtn.addEventListener('click', ()=>doSearch());
cityInput.addEventListener('keydown', (e)=>{ if(e.key === 'Enter') doSearch(); });

// init favorites render
renderFavorites();

// quick UX: focus input
cityInput.focus();
