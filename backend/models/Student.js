// models/Student.js
const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  idade: { type: Number, required: true },
  email: { type: String, required: true, unique: true },
  celular: { type: String, required: true },
  pago: { type: Boolean, default: false },
  dataPagamento: { type: Date },
  valorPago: { type: Number }
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);
