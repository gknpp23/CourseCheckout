// models/Student.js
const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  idade: { type: Number, required: true },
  email: { type: String, required: true, unique: true },
  celular: { type: String, required: true },

}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);