const crypto = require('crypto');

function queryToObj(se) {
  if (typeof se !== "undefined") {
      var arr = se.split("&"),
          obj = {},
          newarr = [];
      $.each(arr, function (i, v) {
          newarr = v.split("=");
          if (typeof obj[newarr[0]] === "undefined") {
              obj[newarr[0]] = newarr[1];
          }
      });
      return obj;
  }
}

function objToQuery(param, key, encode) {
  if (param == null) return ''
  var paramStr = ''
  var t = typeof (param)
  if (t == 'string' || t == 'number' || t == 'boolean') {
      paramStr += '&' + key + '=' + ((encode == null || encode) ? encodeURIComponent(param) : param)
  } else {
      for (let i in param) {
          let k = key == null ? i : key + (param instanceof Array ? '[' + i + ']' : '.' + i)
          paramStr += objToQuery(param[i], k, encode)
      }
  }
  return paramStr
}

function objASC(obj) {
  var newObj = {}
  Object.keys(obj).sort().forEach(function (key) {
      newObj[key] = obj[key]
  })
  return newObj
}

function encry_md5(inputString, toUpper = true) {
  const md5Hash = crypto
    .createHash('md5')
    .update(String(inputString))
    .digest('hex');
  
  if (toUpper)
    return md5Hash.toUpperCase();
  return md5Hash;
}

module.exports = {
  encry_md5,
  queryToObj,
  objToQuery,
  objASC
}