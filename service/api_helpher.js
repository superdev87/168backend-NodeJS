const moment = require('moment');
const lodash = require('lodash');

// Load model
const PlanHistory = require('../model/PlanHistory');
const Statistics = require('../model/Statistics');

const lotteries = require('./lotteries.json');
const {
  objToQuery,
  queryToObj,
  objASC,
  encry_md5
} = require('../utils/cryptoJS');

// Const Global Values --------------------------------
const huLungStr = ["龙", "虎", "和"]
const TIMES_VALUES = [688, 128, 68, 48, 38, 22, 20, 18, 16, 15, 14, 13, 12, 12, 12, 12, 13, 14, 15, 16, 18, 20, 22, 38, 48, 68, 128, 688];
const INITIAL_PRICE = 1500;
const PLAN_PRICES = [5, 4, 3];

const get_current_lottery = (lottype) => {
  for(lottery of lotteries)
    if(lottery['lottype'] === lottype)
      return lottery;
  return null;
}

const get_yucedata = async (url) => {
  const nowTime = Math.floor(Date.now() / 1000).toString();
  const d = 'jLGqFm9NBr2FEFkH' + nowTime;
  const sign = encry_md5(d, false);

  const header = {
    'Host': 'ttapi.pcdd.in',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/118.0',
    'Accept': '*/*',
    'Accept-Language': 'zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2',
    'Origin': 'https://yuce788.com',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'no-cors',
    'Sec-Fetch-Site': 'cross-site',
    'Content-Type': 'application/json; charset=utf-8',
    'sign': sign,
    'nowtime': nowTime,
    'Referer': 'https://yuce788.com/'
  };

  const response = await fetch(url, { headers: header});
  if (response.status === 200) {
    const resData = await response.json();
    return resData;
  }
  return null;
}

const get_cur_data = async (lottype) => {
  const currentLottery = get_current_lottery(lottype);

  try {
    if (currentLottery) {
      if (lottype === 'jianada28' || lottype === 'taiwan28') {
        const [curData, lastData] = await Promise.all([
          get_yucedata(currentLottery['curUrl']),
          get_yucedata(currentLottery['lastUrl'])
        ]);

        if (curData && lastData) {
          const preDrawCode = lastData['openNums'].split(',');
          const values = preDrawCode.map((value) => parseInt(value, 10));
          const sumNum = lodash.sum(values);
          let totalCount, drawCount;

          if(lottype === 'jianada28') {
            totalCount = 394;
            drawCount = (Number(curData['section']) - 64) % 393 + 1;
          } else {
            totalCount = 204;
            drawCount = (Number(curData['section']) - 29) % 203 + 1;
          }
          
          return {
            'preDrawIssue': curData['section'],
            'preDrawCode': lastData['openNums'],
            'countTime': Number((parseInt(curData['openTime']) - parseInt(curData['serverTime'])) / 1000),
            'preDrawTime': moment(lastData['openTime']).utc().add(8, 'hours').format('YYYY-MM-DD HH:mm:ss'),
            'drawTime': moment(curData['openTime']).utc().add(8, 'hours').format('YYYY-MM-DD HH:mm:ss'),
            'sumNum': sumNum,
            'sumBigSmall': Number(sumNum > 13),
            'sumSingleDouble': Number(sumNum % 2),
            'totalCount': totalCount,
            'drawCount': drawCount
          }
        }
      } else {
        const response = await fetch(currentLottery['curUrl']);
  
        if (response.status === 200) {
          const data = await response.json();
  
          if ('result' in data) {
            const resData = data['result']['data'];
            if ('serverTime' in resData)
              resData['countTime'] = moment(resData['drawTime']).diff(moment(resData['serverTime']), 'seconds');
            return resData;
          } else if('body' in data) {
            let preDrawCode, sumSingleDouble, sumBigSmall, sumNum, values;
  
            const curData = data['body'][0];
            if('result' in curData)
              result = curData['result'].split(',');
            else
              result = data['body'][1]['result'].split(',');
  
            if (lottype.includes('28')) {
              preDrawCode = result.slice(0, 3);
              sumNum = Number(result[3]);
              sumBigSmall = result[4] == "大" ? 0 : 1;
              sumSingleDouble = result[5] == "单" ? 0 : 1;
            } else {
              preDrawCode = result.slice(0, 10);
              sumNum = Number(result[10]);
              sumBigSmall = Number(result[11] == "大");
              sumSingleDouble = Number(result[12] == "单");
            }
            values = preDrawCode.map(value => parseInt(value, 10));
  
            const resData = {
              'preDrawIssue': curData['termId'],
              'preDrawCode': preDrawCode.join(','),
              'countTime': 60 - Math.floor(Number(parseInt(data['timestamp']) / 1000)) % 60,
              'preDrawTime': moment(curData['timestamp']).format('YYYY-MM-DD HH:mm:ss'),
              'drawTime': moment(curData['timestamp']).add(1, 'minute').format('YYYY-MM-DD HH:mm:ss'),
              'sumNum': sumNum,
              'sumBigSmall': sumBigSmall,
              'sumSingleDouble': sumSingleDouble,
              'totalCount': 1440,
              'drawCount': parseInt(curData['termId'].substr(-4))
            }

            if (!lottype.includes('28')) {
              resData['firstDT'] = huLungStr.indexOf(result[13]);
              resData['secondDT'] = huLungStr.indexOf(result[14]);
              resData['thirdDT'] = huLungStr.indexOf(result[15]);
              resData['fourthDT'] = huLungStr.indexOf(result[16]);
              resData['fifthDT'] = huLungStr.indexOf(result[17]);
            }

            if (!('result' in curData))
              resData['countTime'] = 0;
  
            return resData;
          }
          return data;
        }
      }
    }
  } catch(err) {
    console.log(err);
  }

  return {};
}

const get_past_data = async (lottype, date, rows) => {
  /* try {
    const currentLottery = get_current_lottery(lottype);
    let url = currentLottery['url'];
  
    if (lottype.includes('28')) {
      let reData = {};
      const today = moment().format("%Y-%m-%d");
      
      if (lottype === 'jianada28')  reData['lotCode'] = '10169';
      else if(lottype === 'taiwan28') reData['lotCode'] = '10171';
      
      if ((date ?? '') != '') {
        reData['day'] = date;
        url += `&day=${date}`;
      }
      if (rows != '' && rows != 0) {
        reData['pageSize'] = parseInt(rows, 10);
        url += `&pageSize=${rows}`;
      }

      const reQuery = decodeURIComponent(objToQuery(objASC(reData)).substring(1));
      const d = `${reQuery}&key=KNWznyHdmVHCbqa5`;
      const signkey = encry_md5(d);

      url += `&signkey=${signkey}`;
      console.log(url);
    } else {
      if ((date ?? '') != '')
        url += `&date=${date}`;
    }
    
    const response = await fetch(url);
    if (response.status === 200) {
      const data = await response.json();
      if ('result' in data) {
        const resData = data['result']['data'];

        if (rows != '' && rows != 0)
          return resData.slice(0, Number(rows));
        return resData;
      } else {
        const resData = data['body'].map(item => {
          const result = item['result'] ? item['result'].split(',') : [];
          const preDrawCode = result.slice(0, lottype.includes('28') ? 3 : 10).map(value => parseInt(value, 10));

          let sumNum, sumSingleDouble, sumBigSmall, huLungData = {};
          if (lottype.includes('28')) {
            sumNum = Number(result[3]);
            sumBigSmall = result[4] == "大" ? 0 : 1;
            sumSingleDouble = result[5] == "单" ? 0 : 1;
          } else {
            sumNum = Number(result[10]);
            sumBigSmall = Number(result[11] == "大");
            sumSingleDouble = Number(result[12] == "单");
            huLungData = {
              firstDT: huLungStr.indexOf(result[13]),
              secondDT: huLungStr.indexOf(result[14]),
              thirdDT: huLungStr.indexOf(result[15]),
              fourthDT: huLungStr.indexOf(result[16]),
              fifthDT: huLungStr.indexOf(result[17])
            }
          }

          return {
            'preDrawCode': preDrawCode.join(','),
            'preDrawIssue': item['termId'],
            'preDrawTime': item['timestamp'],
            'drawTime': moment(item.timestamp).add(1, 'minutes').format('YYYY-MM-DD HH:mm:ss'),
            'sumNum': sumNum,
            'sumBigSmall': sumBigSmall,
            'sumSingleDouble': sumSingleDouble,
            ...huLungData
          }
        });

        if (rows != '' && rows != 0)
          return resData.slice(0, Number(rows));
        return resData;
      }
    }
  } catch(err) {
    console.log(err);
  }
  */
  try {
    // PlanHistory.createIndexes({lottype: 1, preDrawTime: 1});
    const records = await PlanHistory
      .find({lottype: lottype, preDrawTime: { $regex: date }})
      .sort({preDrawIssue: -1})
      .limit(rows);
    return records;
  } catch (err) {
    console.log(err);
  }
  return [];
}

const get_plan_data = async (gameType, lottype, date, rows) => {
  try {
    const result = [];
    const resData = [];
    const time = moment();
    const [pastData, curData] = await Promise.all([
      get_past_data(lottype, date, rows),
      get_cur_data(lottype)
    ]);
    console.log(`Execution time: ${moment().diff(time, "seconds")}`);

    pastData.unshift(curData);
    
    // Initialize Values
    let bingoValue = 0;
    let lotteryCost = [0, 0, 0];
    let lotteryCostAll = [0, 0, 0];
    let profit = ["0", "0", "0"];
    let createPlan = [true, true, true];
    let planValues = [[], [], []];
    let multiple = [-1, -1, -1];
    let minValue = 1;
    let maxValue = 11;

    if (gameType === 'sum3') {
      minValue = 0;
      maxValue = 28;
    }

    for (let k = pastData.length - 1; k >= 0; k--) {
      try {
        let preDrawCode = pastData[k]['preDrawCode'].split(',');
        let values = [];

        if (preDrawCode.length) values = preDrawCode.map(value => parseInt(value, 10));
        
        if (values.length) bingoValue = values[0];
        if (gameType === 'sum3')  bingoValue = lodash.sum(values);

        for (let i = 0; i < 3; i++) {
          ++ multiple[i];

          // Create New Plan
          if (createPlan[i]) {
            planValues[i] = lodash.sampleSize(lodash.range(minValue, maxValue), 5 - i);
            planValues[i].sort((a, b) => a - b);
            createPlan[i] = false;
          }

          lotteryCost[i] = PLAN_PRICES[i] * 2 ** multiple[i];
          lotteryCostAll[i] += lotteryCost[i];

          // If Plan Bingo
          if (planValues[i].includes(bingoValue)) {
            multiple[i] = -1;
            createPlan[i] = true;
            if (gameType == 'sum3') profit[i] = Number(profit[i]) + (lotteryCost[i] / PLAN_PRICES[i] * TIMES_VALUES[bingoValue]);
            else  profit[i] = (Number(profit[i]) + lotteryCost[i] - 0.01).toFixed(2);
          } else {
            profit[i] = (Number(profit[i]) - lotteryCost[i]).toFixed(2);
          }

          // Reset multiple values
          if (multiple[i] == 9) {
            multiple[i] = -1;
            createPlan[i] = true;
          }
        }

        resData.push({
          'preDrawCode': pastData[k]['preDrawCode'],
          'preDrawTime': pastData[k]['preDrawTime'],
          'preDrawIssue': pastData[k]['preDrawIssue'],
          'lotteryCostA': lotteryCost[0],
          'lotteryCostB': lotteryCost[1],
          'lotteryCostC': lotteryCost[2],
          'lotteryCostAllA': lotteryCostAll[0],
          'lotteryCostAllB': lotteryCostAll[1],
          'lotteryCostAllC': lotteryCostAll[2],
          'profitA': profit[0],
          'profitB': profit[1],
          'profitC': profit[2],
          'planA': planValues[0].join(','),
          'planB': planValues[1].join(','),
          'planC': planValues[2].join(','),
          ...(k === 0 ? curData : {})
        });
      } catch (err) {
        console.log("Generating Error:", err);
      }
    }

    resData.reverse();
    return resData;
  } catch(err) {
    console.log(err);
  }
}

const get_statistics = (req, res) => {
  const lottype = req.query['lottype'] ?? '';

  try {
    Statistics.findOne({lottype: lottype}).then(stat => {
      if(!stat)  res.status(404).json({});
      else  res.status(200).json(stat);
    })
  } catch(err) {
    console.log('Error occured while loading statistics');
    res.status(500).json({'message': 'failed'});
  }
}

module.exports = {
  get_cur_data,
  get_past_data,
  get_plan_data,
  get_statistics
}