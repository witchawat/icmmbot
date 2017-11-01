var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var CommandSchema = new Schema({
  name: {type: String},
  text: {type: String},
  createdAt: {type: Date},
  createdByUser: {type: String},
  updatedAt: {type: Date},
  updatedByUser: {type: String},
});

module.exports = mongoose.model("Command", CommandSchema);
