require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { body, validationResult } = require('express-validator');
const { sendEmail } = require('./src/services/email.services');

const app = express();
app.use(cors());
app.use(express.json());

const mongoURI = process.env.MONGO_URI;

mongoose.connect(mongoURI)
  .then(() => console.log('✅ Conectado ao MongoDB'))
  .catch(err => console.error('❌ Erro no MongoDB:', err));

app.get('/', (req, res) => {
  res.send('Bem-vindo ao CourseCheckout!');
});

const Student = require('./models/Student');

app.post('/api/inscricao', [
  body('nome').notEmpty().withMessage('Nome é obrigatório'),
  body('idade').isInt({ min: 1 }).withMessage('Idade deve ser um número positivo'),
  body('email').isEmail().withMessage('E-mail inválido'),
  body('celular').notEmpty().withMessage('Celular é obrigatório'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      errors: errors.array() 
    });
  }

  try {
    const { nome, idade, email, celular, endereco, curso } = req.body;

    const aluno = new Student({ nome, idade, email, celular, endereco, curso });
    await aluno.save();

    const chavePix = `pix-${Math.random().toString(36).substr(2, 9)}`;
    
    // Envia e-mail (assincrono)
    sendEmail(email, 'Confirmação de Inscrição', `Olá ${nome}, sua chave Pix é: ${chavePix}`);
    
    res.json({ 
      success: true, 
      chavePix 
    });

  } catch (error) {
    console.error('🔥 ERRO:', error);
    
    let errorMessage = 'Erro ao processar inscrição';
    if (error.code === 11000) {
      errorMessage = 'E-mail já cadastrado';
    }

    res.status(500).json({ 
      success: false, 
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});