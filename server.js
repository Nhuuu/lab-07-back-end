'use strict';

// Load Environment Variables from the .env file
require('dotenv').config();

// Application Dependencies
const express = require('express');
const cors = require('cors');
const superagent = require('superagent');
const pg = require('pg');

//Global variable
const PORT = process.env.PORT || 3000;
const client = new pg.Client(process.env.DATABASE_URL);
client.connect();
client.on('error', err => console.error(err));

// Application Setup
const app = express();
app.use(cors());
app.use(express.static('public'));

// Routes
app.get('/location', searchToLatLong);

app.get('/weather', searchForWeather);

app.get('/events', searchForEvents);

app.use('*', (request, response) => {
  response.status(404).send('you got to the wrong place');
})

const SQL_INSERTS = {
  locations: `INSERT INTO locations (
    search_query,
    formatted_query,
    latitude,
    longitude
  ) VALUES ($1, $2, $3, $4) RETURNING *`,
  weathers: `INSERT INTO weathers (
    forecast,
    time,
    location_id,
  ) VALUES ($1, $2, $3) RETURNING *`,
  events: `INSERT INTO events (
    link,
    name,
    event_date,
    summary,
    location_id,
  ) VALUES ($1, $2, $3, $4, $5) RETURNING *`
}


function cacheHit(sqlResult){
  console.log('sending from db');
  return sqlResult.rows[0];
}

function cacheMiss(url, locationName, tableName){
  console.log('getting new data from google');
  return superagent.get(url)
    .then(result => {
      let location = new Location(locationName, result);
      return client.query(
        SQL_INSERTS[tableName],
        // [Object.values()]
        [location.search_query, location.formatted_query, location.latitude, location.longitude]
        )
      .then(sqlResult => {
        return sqlResult.rows[0];
      })
    })
}

function checkDB(searchName, search, tableName, url){
  return client.query(`SELECT * FROM ${tableName} WHERE ${searchName}=$1`, [search])
    .then(sqlResult => {
      if (sqlResult.rowCount === 0) {
        return cacheMiss(url, search, tableName)
      } else {
        return cacheHit(sqlResult)
      }
  })
}

// Search for location
function searchToLatLong(request, response) {
  const locationName = request.query.data;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${request.query.data}&key=${process.env.GEOCODE_API_KEY}`;

  checkDB('search_query', locationName, 'locations', url)
    .then(locationData => {
      response.send(locationData)
    })
    .catch(err => {
      console.error('searchtolatlong', err);
      response.status(500).send('Status 500: So sorry i broke');
    })
}

// Location constructor
function Location(query, result) {
  this.search_query = query;
  this.formatted_query = result.body.results[0].formatted_address;
  this.latitude = result.body.results[0].geometry.location.lat;
  this.longitude = result.body.results[0].geometry.location.lng;
}

//The searchForWeather function returns an array with the day and the forecast for the day
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