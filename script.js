const apiKey = 'ddd30ac51fe463b7ad75f09f6c014dd9';
const weatherBlocksContainer = document.getElementById('weather-blocks-container');
const addWeatherBlockButton = document.getElementById('add-weather-block');
const confirmationModal = document.getElementById('confirmation-modal');
const confirmDeleteButton = document.getElementById('confirm-delete');
const cancelDeleteButton = document.getElementById('cancel-delete');
const favoritesContainer = document.getElementById('favorites-container');
const languageSelector = document.getElementById('language-selector');
const preloader = document.getElementById('preloader');
let blocks = [];
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
let language = localStorage.getItem('language') || 'uk'; // Default language

document.addEventListener('DOMContentLoaded', () => {
    if (favorites.length) {
        updateFavorites();
    }
    setLanguage(language);
    addWeatherBlock(); // Add initial weather block
});

document.getElementById('en').addEventListener('click', () => setLanguage('en'));
document.getElementById('uk').addEventListener('click', () => setLanguage('uk'));

function setLanguage(lang) {
    language = lang;
    localStorage.setItem('language', lang);
    updateWeatherBlocks();
    updateFavorites();
}

function createWeatherBlock() {
    if (blocks.length >= 5) {
        alert(getTranslation('max_blocks_reached'));
        return;
    }

    const weatherBlock = document.createElement('div');
    weatherBlock.className = 'weather-block';

    const cityInput = document.createElement('input');
    cityInput.type = 'text';
    cityInput.className = 'city-input';
    cityInput.placeholder = getTranslation('enter_city');
    
    const removeButton = document.createElement('button');
    removeButton.className = 'remove-block';
    removeButton.innerText = 'Remove Block';
    removeButton.onclick = () => showConfirmationModal(weatherBlock);

    const weatherCard = document.createElement('div');
    weatherCard.className = 'weather-card';

    const chartCanvas = document.createElement('canvas');
    chartCanvas.className = 'temperature-chart';

    weatherBlock.append(cityInput, removeButton, weatherCard, chartCanvas);
    weatherBlocksContainer.appendChild(weatherBlock);
    blocks.push(weatherBlock);

    cityInput.addEventListener('change', () => fetchWeatherData(cityInput, weatherCard, chartCanvas));
    fetchWeatherData(cityInput, weatherCard, chartCanvas);
}

function showConfirmationModal(block) {
    confirmationModal.style.display = 'flex';
    confirmDeleteButton.onclick = () => {
        weatherBlocksContainer.removeChild(block);
        blocks = blocks.filter(b => b !== block);
        confirmationModal.style.display = 'none';
    };
    cancelDeleteButton.onclick = () => {
        confirmationModal.style.display = 'none';
    };
}

async function fetchWeatherData(cityInput, weatherCard, chartCanvas) {
    const city = cityInput.value.trim();
    if (city === '') return;

    showPreloader();

    try {
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric&lang=${language}`);
        const data = await response.json();
        if (data.cod === 200) {
            updateWeatherCard(weatherCard, data, cityInput);
            fetchTemperatureChart(city, chartCanvas);
        } else {
            weatherCard.innerHTML = `<p>${getTranslation('city_not_found')}</p>`;
        }
    } catch (error) {
        console.error('Error fetching weather data:', error);
    } finally {
        hidePreloader();
    }
}

async function fetchTemperatureChart(city, chartCanvas) {
    try {
        const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric&lang=${language}`);
        const data = await response.json();
        if (data.cod === '200') {
            const labels = [];
            const temperatures = [];
            data.list.forEach(item => {
                const date = new Date(item.dt * 1000);
                if (date.getHours() === 12) { 
                    labels.push(`${date.getDate()}/${date.getMonth() + 1}`);
                    temperatures.push(item.main.temp);
                }
            });

            new Chart(chartCanvas, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: getTranslation('temperature'),
                        data: temperatures,
                        borderColor: 'rgba(75, 192, 192, 1)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    }],
                },
                options: {
                    responsive: true,
                    scales: {
                        x: {
                            beginAtZero: true,
                        },
                    },
                },
            });
        }
    } catch (error) {
        console.error('Error fetching temperature data:', error);
    }
}

function updateWeatherCard(weatherCard, data, cityInput) {
    weatherCard.innerHTML = `
        <h3>${data.name}</h3>
        <p>${data.weather[0].description}</p>
        <p>${getTranslation('temperature')}: ${data.main.temp} °C</p>
        <p>${getTranslation('humidity')}: ${data.main.humidity}%</p>
        <button class="toggle-day-night" onclick="toggleDayNight('${data.coord.lat}', '${data.coord.lon}')">${getTranslation('day_night')}</button>
        <button class="toggle-favorite" onclick="toggleFavorite('${data.name}')">${isFavorite(data.name) ? '⭐' : '☆'}</button>
    `;
}

let dayNightToggle = true; 

async function toggleDayNight(lat, lon) {
    showPreloader();

    try {
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=${language}`);
        const data = await response.json();

        if (data.cod === 200) {
            const sunrise = new Date(data.sys.sunrise * 1000);
            const sunset = new Date(data.sys.sunset * 1000);
            const now = new Date();

            if (now > sunrise && now < sunset) {
                dayNightToggle = !dayNightToggle; 
            } else {
                dayNightToggle = !dayNightToggle; 
            }

            updateWeatherBlocks();
        }
    } catch (error) {
        console.error('Error toggling day/night:', error);
    } finally {
        hidePreloader();
    }
}

function updateWeatherBlocks() {
    blocks.forEach(block => {
        const cityInput = block.querySelector('.city-input');
        const weatherCard = block.querySelector('.weather-card');
        const chartCanvas = block.querySelector('.temperature-chart');
        if (cityInput) {
            fetchWeatherData(cityInput, weatherCard, chartCanvas);
        }
    });
}

function toggleFavorite(city) {
    if (favorites.length >= 5 && !isFavorite(city)) {
        alert(getTranslation('favorites_limit'));
        return;
    }

    if (isFavorite(city)) {
        favorites = favorites.filter(fav => fav !== city);
    } else {
        favorites.push(city);
    }
    localStorage.setItem('favorites', JSON.stringify(favorites));
    updateFavorites();
    updateWeatherBlocks();
}

function isFavorite(city) {
    return favorites.includes(city);
}

function updateFavorites() {
    favoritesContainer.innerHTML = '';
    favorites.forEach(city => {
        const weatherBlock = document.createElement('div');
        weatherBlock.className = 'weather-block favorite';
        const cityName = document.createElement('h3');
        cityName.innerText = city;
        weatherBlock.appendChild(cityName);
        favoritesContainer.appendChild(weatherBlock);
    });
}

function showPreloader() {
    preloader.style.display = 'flex';
}

function hidePreloader() {
    preloader.style.display = 'none';
}

function getTranslation(key) {
    const translations = {
        'uk': {
            'enter_city': 'Введіть місто...',
            'city_not_found': 'Не вдалося знайти місто.',
            'temperature': 'Температура',
            'humidity': 'Вологість',
            'day_night': 'День/Ніч',
            'max_blocks_reached': 'Максимум 5 блоків досягнуто.',
            'favorites_limit': 'Максимум 5 міст у вибраних. Видаліть місто, щоб додати нове.',
        },
        'en': {
            'enter_city': 'Enter city...',
            'city_not_found': 'City not found.',
            'temperature': 'Temperature',
            'humidity': 'Humidity',
            'day_night': 'Day/Night',
            'max_blocks_reached': 'Maximum 5 blocks reached.',
            'favorites_limit': 'Maximum 5 favorite cities. Remove a city to add a new one.',
        }
    };
    return translations[language][key];
}

addWeatherBlockButton.addEventListener('click', createWeatherBlock);

// Initial city fetch based on user's IP
async function getUserLocation() {
    try {
        const response = await fetch('https://ipinfo.io/json?token=YOUR_IPINFO_TOKEN'); // Replace with your IPinfo token
        const data = await response.json();
        const city = data.city;
        if (city) {
            const cityInput = document.querySelector('.city-input');
            if (cityInput) {
                cityInput.value = city;
                fetchWeatherData(cityInput, cityInput.nextElementSibling, cityInput.nextElementSibling.nextElementSibling);
            }
        }
    } catch (error) {
        console.error('Error fetching user location:', error);
    }
}

async function fetchWeatherData(cityInput, weatherCard, chartCanvas) {
    const city = cityInput.value.trim();
    if (city === '') return;

    showPreloader();

    try {
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric&lang=${language}`);
        const data = await response.json();

        console.log('Weather data:', data); // Додайте цей рядок для відлагодження

        if (data.cod === 200) {
            updateWeatherCard(weatherCard, data, cityInput);
            fetchTemperatureChart(city, chartCanvas);
        } else {
            weatherCard.innerHTML = `<p>${getTranslation('city_not_found')}</p>`;
        }
    } catch (error) {
        console.error('Error fetching weather data:', error);
    } finally {
        hidePreloader();
    }
}

getUserLocation();

