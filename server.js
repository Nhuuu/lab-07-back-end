'use strict';

// Load Environment Variables from the .env file
require('dotenv').config();

// Application Dependencies
const express = require('express');
const cors = require('cors');
const superagent = require('superagent');

//Global variable
const PORT = process.env.PORT || 3000;

// Application Setup
const app = express();
app.use(cors());

// Listen for /location route. Return a 500 status if there are errors in getting data
// Call searchToLatLong function with location entered
app.get('/location', searchToLatLong);

// Listen for /weather route. Return a 500 status if there are errors in getting data
// Call searchForWeather function to get weather data for the location
app.get('/weather', searchForWeather);


app.get('/events', searchForEvents);

// Catch and respond to routes other than the ones defined
app.use('*', (request, response) => {
  response.send('you got to the wrong place');
})

// Helper Functions
function searchToLatLong(request, response) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${request.query.data}&key=${process.env.GEOCODE_API_KEY}`;
  superagent.get(url)
    .then(result => {
      const location = new Location(request.query.data, result);
      response.send(location);
    })
    .catch(e => {
      console.error(e);
      response.status(500).send('Status 500: So sorry I broke trying to get location.');
    })
}

// Refactor the searchToLatLong function to replace the object literal with a call to this constructor function:
function Location(query, result) {
  this.search_query = query;
  this.formatted_query = result.body.results[0].formatted_address;
  this.latitude = result.body.results[0].geometry.location.lat;
  this.longitude = result.body.results[0].geometry.location.lng;
}

//The searchForWeather function returns an array with the day and the forecast for the day. Refactor to use map method.
function searchForWeather(request, response) {
  const location = request.query.data;
  const url = `https://api.darksky.net/forecast/${process.env.WEATHER_API_KEY}/${location.latitude},${location.longitude}`;
  superagent.get(url)
    .then(result => {
      const weatherArr = result.body.daily.data.map(day => {
        return new Weather(day);
      })
      response.send(weatherArr);
    })
    .catch(e => {
      console.error(e);
      response.status(500).send('Status 500: I broke trying to get weather.')
    })
}

//Constructor function to create weather objects
function Weather(weatherData) {
  let time = new Date(weatherData.time * 1000).toDateString();
  this.forecast = weatherData.summary;
  this.time = time;
}


function searchForEvents(request, response) {
  const location = request.query.data;
  const url = `https://www.eventbriteapi.com/v3/events/search/?location.longitude=${location.longitude}&location.latitude=${location.latitude}&expand=venue&token=${process.env.EVENTBRITE_API_KEY}`;
  superagent.get(url)
    .then(result => {
      const eventArr = result.body.events.map(eventData => {
        return new Event(eventData);
      })
      response.send(eventArr);
    })
    .catch(e => {
      console.error(e);
      response.status(500).send('Status 500: I broke trying to get events.')
    })
}

//Constructor function to create event objects
function Event(eventData) {
  this.link = eventData.url;
  this.name = eventData.name.text;
  this.event_date = new Date(eventData.start.utc).toDateString();
  this.summary = eventData.summary;
}
// Make sure the server is listening for requests
app.listen(PORT, () => console.log(`App is listening on ${PORT}`));