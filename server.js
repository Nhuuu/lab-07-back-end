'use strict';

// Load Environment Variables from the .env file
require('dotenv').config();

// Application Dependencies
const express = require('express');
const cors = require('cors');

// Application Setup
const PORT = process.env.PORT || 3000;
const app = express();
app.use(cors());

// Routes
app.get('/location', (request,response) => {
  try {
    const locationData = searchToLatLong(request.query.data);
    response.send(locationData);
  }
  catch(error) {
    console.error(error);
    response.status(500).send('Status: 500. So sorry, something went wrong getting the location.');
  }
});

app.get('/weather', (request, response) => {
  try {
    const weatherData = searchForWeather();
    response.send(weatherData);
  }
  catch(error) {
    console.error(error);
    response.status(500).send('Status: 500. Something went wrong getting the weather.');
  }
});

app.use('*', (request, response) => {
  response.send('you got to the wrong place');
})

// Helper Functions
function searchToLatLong(query) {
  const geoData = require('./data/geo.json');
  const location = new Location(query, geoData);
  return location;
}
  
// Refactor the searchToLatLong function to replace the object literal with a call to this constructor function:
function Location(query, geoData) {
  this.search_query = query;
  this.formatted_query = geoData.results[0].formatted_address;
  this.latitude = geoData.results[0].geometry.location.lat;
  this.longitude = geoData.results[0].geometry.location.lng;
}
  
function searchForWeather(){
  let weatherArr = [];
  const weatherData = require('./data/darksky.json');
  weatherData.daily.data.forEach(day => {
    const weather = new Weather(day);
    weatherArr.push(weather);
  })
  return weatherArr;
}

function Weather(weatherData){
  let time = new Date(weatherData.time * 1000).toDateString();
  this.forecast = weatherData.summary;
  this.time = time;
}


// Make sure the server is listening for requests
app.listen(PORT, () => console.log(`App is listening on ${PORT}`) );