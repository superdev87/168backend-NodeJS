const lodash = require('lodash');
const mongoose = require('mongoose');
const { get_cur_data } = require('../service/api_helpher');

const lotteries = require('../service/lotteries.json').map(lottery => { return {lottype: lottery.lottype, countTime: 1} });
const statistics = require('../service/statistics.json').map(lottery => {return lottery});

// Load Schema
const PlanHistory = require('../model/PlanHistory');
const Statistics = require('../model/Statistics');

let intervalID;
let connection;

const save_to_database = () => {
  lotteries.map((lottery) => {
    const lottype = lottery.lottype;

    lottery.countTime = lottery.countTime - 1;

    if (lottery.countTime == 0) {
      get_cur_data(lottype).then(async (response) => {
        const { countTime, ...curData} = response;

        let curStat = {};
        let stindex = 0; // statistics index

        lottery.countTime = countTime;
        if (countTime <= 0) {
          lottery.countTime = 2;
          return;
        }
        if (lottype.includes('28')) {
          if (Math.floor(Math.random() * 5)) {
            curData['cfBigSmall'] = curData['sumBigSmall'];
            curData['cfSingleDouble'] = curData['sumSingleDouble'];
            curData['cfresult'] = Math.floor(Math.random() * 3) + 1;
          } else {
            curData['cfresult'] = 0;
            while (true) {
              curData['cfBigSmall'] = Math.floor(Math.random() * 2);
              curData['cfSingleDouble'] = Math.floor(Math.random() * 2);

              if(!(curData['cfBigSmall'] === curData['sumBigSmall'] && curData['cfSingleDouble'] === curData['sumSingleDouble']))
                break;
            }
          }
          
          curData['kpFBigSmall'] = Math.floor(Math.random() * 2);
          curData['kpSBigSmall'] = 1 - curData['kpFBigSmall'];
          curData['kpSSingleDouble'] = Math.floor(Math.random() * 2);
          curData['kpresult'] = Math.floor(Math.random() * 2);

          while (true) {
            curData['dfFBigSmall'] = Math.floor(Math.random() * 2);
            curData['dfFSingleDouble'] = Math.floor(Math.random() * 2);
            curData['dfSBigSmall'] = Math.floor(Math.random() * 2);
            curData['dfSSingleDouble'] = Math.floor(Math.random() * 2);

            if(!(curData['dfFBigSmall'] === curData['dfSBigSmall'] && curData['dfFSingleDouble'] === curData['dfSSingleDouble']))
              break;
          }

          if((curData['sumBigSmall'] == curData['dfFBigSmall'] && curData['sumSingleDouble'] == curData['dfFSingleDouble']) || 
            (curData['sumBigSmall'] == curData['dfSBigSmall'] && curData['sumSingleDouble'] == curData['dfSSingleDouble']))
            curData['dfresult'] = 1;
          else
            curData['dfresult'] = 0;

          statistics.map((item, index) => {
            if (item.lottype === lottype) {
              curStat = item.stat;
              stindex = index;
            }
          });

          Object.keys(curStat).map(key => {
            if (typeof curStat[key] === 'number')
              ++ curStat[key];
          });

          curStat['num' + curData['sumNum']] = 0;

          if (curData['sumBigSmall']) curStat['small'] = 0;
          else curStat['big'] = 0;
          if (curData['sumSingleDouble']) curStat['even'] = 0;
          else curStat['odd'] = 0;
  
          if (curData['sumBigSmall'] && curData['sumSingleDouble']) curStat['smallEven'] = 0;
          else if (curData['sumBigSmall'] && !curData['sumSingleDouble']) curStat['smallOdd'] = 0;
          else if (!curData['sumBigSmall'] && curData['sumSingleDouble']) curStat['bigEven'] = 0;
          else if (!curData['sumBigSmall'] && !curData['sumSingleDouble']) curStat['bigOdd'] = 0;

          if (curData['sumNum'] <= 6) curStat['verySmall'] = 0;
          else if(curData['sumNum'] >= 22) curStat['veryBig'] = 0;
        }
        curData['lottype'] = lottype;
        curData['preDrawIssue'] = String(curData['preDrawIssue']);

        const record = await PlanHistory.findOne({lottype: lottype, preDrawIssue: curData['preDrawIssue']});
        if(record !== null) return;

        // Add new plan history
        new PlanHistory(curData).save().catch(err => {
          console.log(`Error occured while saving record. ${err}`);
        });

        // Update statistics
        if(lottype.includes('28')) {
          Statistics.findOneAndUpdate(
            { lottype: lottype },
            curStat
          ).then(() => {
            statistics[stindex].stat = curStat;
            console.log(`Successfully update statistics. ${lottype}`);
          }).catch(err => {
            console.log(`Error occured while updating statistics. ${err}`);
          });
        }
      });
    }
  });
}

const initializeStatistics = () => {
  try {
    statistics.map(async (item, index) => {
      Statistics.findOne({lottype: item.lottype}).select({_id: 0, __v: 0}).then(stat => {
        if (stat) {
          statistics[index].stat = stat.toObject();
        } else {
          stat = {
            lottype: item.lottype,
            big: 0,
            small: 0,
            odd: 0,
            even: 0,
            bigOdd: 0,
            bigEven: 0,
            smallOdd: 0,
            smallEven: 0,
            veryBig: 0,
            verySmall: 0,
          }
          for (k = 0; k <= 27; ++ k)
            stat['num' + k] = 0;
        
          new Statistics(stat).save().then(() => {
            statistics[index].stat = stat;
          }).catch(err => {
            console.log(`Error occured while saving statistics data. ${err}`);
          })
        }
      });
    });
  } catch (err) {
    console.log(`Error occured while initializing statistics. ${err}`);
  }
}

const correctDatabase = async () => {
  const records = await PlanHistory
    .find({lottype: { $in: ['jianada28', 'taiwan28', 'speed28', 'tencent28', 'bitcoin28'] }});

  const totalCount = records.length;
  let updatedCount = 0;

  console.log("TotalCount:", totalCount);

  records.map(record => {
    const newRecord = record.toObject();
    if (Math.floor(Math.random() * 5)) {
      newRecord['cfBigSmall'] = newRecord['sumBigSmall'];
      newRecord['cfSingleDouble'] = newRecord['sumSingleDouble'];
      newRecord['cfresult'] = Math.floor(Math.random() * 3) + 1;
    } else {
      newRecord['cfresult'] = 0;
      while (true) {
        newRecord['cfBigSmall'] = Math.floor(Math.random() * 2);
        newRecord['cfSingleDouble'] = Math.floor(Math.random() * 2);

        if(!(newRecord['cfBigSmall'] === newRecord['sumBigSmall'] && newRecord['cfSingleDouble'] === newRecord['sumSingleDouble']))
          break;
      }
    }

    newRecord['preDrawIssue'] = String(newRecord['preDrawIssue']);
    newRecord['kpSBigSmall'] = 1 - newRecord['kpFBigSmall'];

    PlanHistory
      .updateOne({lottype: record['lottype'], preDrawIssue: record['preDrawIssue']}, newRecord)
      .then(() => console.log(`${++ updatedCount}th record updated!`));
  });

  console.log("Updated Count:", updatedCount);
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
    initializeStatistics();
    // correctDatabase();
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