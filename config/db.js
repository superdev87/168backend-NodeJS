const mongoose = require('mongoose');
const lotteries = require('../service/lotteries.json').map(lottery => { return {lottype: lottery.lottype, countTime: 1} });
const { get_cur_data } = require('../service/api_helpher');

// Load Schema
const PlanHistory = require('../model/planHistory');

let intervalID;
let connection;

const save_to_database = () => {
  lotteries.map((lottery) => {
    const lottype = lottery.lottype;

    lottery.countTime = lottery.countTime - 1;

    if (lottery.countTime == 0) {
      get_cur_data(lottype).then(response => {
        const { countTime, ...curData} = response;

        lottery.countTime = countTime;
        if (countTime <= 0) {
          lottery.countTime = 1;
          if(lottype === 'jianada28' || lottype === 'taiwan28') lottery.countTime = 2;
          return;
        }
        if (lottype.includes('28')) {
          curData['cfBigSmall'] = Math.floor(Math.random() * 2);
          curData['cfSingleDouble'] = Math.floor(Math.random() * 2);
          curData['cfresult'] = Math.floor(Math.random() * 4);
          
          curData['kpFBigSmall'] = Math.floor(Math.random() * 2);
          curData['kpSBigSmall'] = Math.floor(Math.random() * 2);
          curData['kpSSingleDouble'] = Math.floor(Math.random() * 2);
          curData['kpresult'] = Math.floor(Math.random() * 2);

          curData['dfFBigSmall'] = Math.floor(Math.random() * 2);
          curData['dfFSingleDouble'] = Math.floor(Math.random() * 2);
          curData['dfSBigSmall'] = Math.floor(Math.random() * 2);
          curData['dfSSingleDouble'] = Math.floor(Math.random() * 2);
          curData['dfresult'] = Math.floor(Math.random() * 2);
        }
        curData['lottype'] = lottype;

        new PlanHistory(curData).save().catch(err => {
          console.log(`Error occured saving record. ${err}`);
        });
      });
    }
  });
}

const connectDB = () => {
  const url = process.env.MONGODB_URI;
  try {
    mongoose.connect(url);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  connection = mongoose.connection;
  connection.on("connected", () => {
    console.log(`Database connected: ${url}`);
    intervalID = setInterval(save_to_database, 1000);
  });
  
  connection.on("disconnected", () => {
    console.log(`Database disconnected: ${url}`);
    clearInterval(intervalID);
  });
 
  connection.on("error", (err) => {
    console.error(`connection error: ${err}`);
  });
  return;
}

module.exports = {
  connectDB
}