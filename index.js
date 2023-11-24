const express = require('express');
const cors = require('cors');
const app = express();
const port = 5000;

const {connectDB} = require('./config/db');

require('dotenv').config();

// Import api_helper
const {
  get_cur_data,
  get_past_data,
  get_plan_data
} = require('./service/api_helpher');

// Connect to mongoDB
connectDB();

// CORS middleware
app.use(cors());

// ----------------------------- API ------------------------------
/**
 * @query {string} lottype - The current lottery type. Ex: sgAirship
 * @returns {object} - Returns an object of current lottery data.
 */
app.get('/api/getCurData', async (req, res) => {
  const lottype = req.query['lottype'] ?? '';
  const resData = await get_cur_data(lottype);
  
  return res.send(resData);
});

/**
 * @query {string} lottype - The current lottery type. Ex: sgAirship
 * @query {string} date - The date you want to get data. Ex: 2023-01-01
 * @query {number} rows - The number of records. Ex: 10
 * @returns {object[]} - Returns an array of records.
 */
app.get('/api/getPastData', async (req, res) => {
  const lottype = req.query['lottype'] ?? '';
  const date = req.query['date'] ?? '';
  const rows = req.query['rows'] ?? '';

  const resData = await get_past_data(lottype, date, rows);
  return res.send(resData);
});

/**
 * @query {string} lottype - The current lottery type. Ex: sgAirship
 * @query {string} date - The date you want to get data. Ex: 2023-01-01
 * @query {number} rows - The number of records. Ex: 10
 * @returns {object[]} - Returns an array of records.
 */
app.get('/api/getPlanData', async (req, res) => {
  const gameType = req.query['gameType'] ?? '';
  const lottype = req.query['lottype'] ?? '';
  const date = req.query['date'] ?? '';
  const rows = req.query['rows'] ?? '';

  const resData = await get_plan_data(gameType, lottype, date, rows);
  return res.send(resData);
});

app.get('/', (req, res) => {
  // res.send('Hello World!');
  fetch("https://act.fsaad334546gfa.com/game/results?gameType=05").then(async (response) => {
    console.log("Fetched data");
    data = await response.json();
    res.send(data);
  });
});

//Run app, then load http://localhost:port in a browser to see the output.
app.listen(port, () => {
  console.log(`168 backend server is starting and listening on port ${port}!`);
});