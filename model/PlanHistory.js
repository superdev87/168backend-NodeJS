const mongoose = require('mongoose');

const PlanHistorySchema = new mongoose.Schema({}, {strict: false});

module.exports = mongoose.model('PlanHistory', PlanHistorySchema);