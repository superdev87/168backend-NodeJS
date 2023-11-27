const mongoose = require('mongoose');

const StatisticsSchema = new mongoose.Schema({}, {strict: false});

module.exports = mongoose.model('statistics', StatisticsSchema);