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

// Modelo Student com validação de email único
const studentSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  idade: { type: Number, required: true, min: 1 },
  email: { 
    type: String, 
    required: true,
    unique: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'E-mail inválido']
  },
  celular: { type: String, required: true },
  chavePix: { type: String, unique: true },
  dataInscricao: { type: Date, default: Date.now }
});

// Adiciona índice único para melhor performance
studentSchema.index({ email: 1 }, { unique: true });

const Student = mongoose.model('Student', studentSchema);

// Rota para verificar email único (usada pelo frontend)
app.get('/api/verificar-email', async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Parâmetro email é obrigatório' 
      });
    }

    const alunoExistente = await Student.findOne({ email });
    res.json({ 
      success: true, 
      emailDisponivel: !alunoExistente 
    });

  } catch (error) {
    console.error('Erro ao verificar email:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao verificar email' 
    });
  }
});

// Rota de inscrição com validações aprimoradas
app.post('/api/inscricao', [
  body('nome')
    .notEmpty().withMessage('Nome é obrigatório')
    .trim()
    .escape(),
  body('idade')
    .isInt({ min: 1 }).withMessage('Idade deve ser um número positivo')
    .toInt(),
  body('email')
    .isEmail().withMessage('E-mail inválido')
    .normalizeEmail(),
  body('celular')
    .notEmpty().withMessage('Celular é obrigatório')
    .trim()
    .matches(/^[0-9]{10,15}$/).withMessage('Celular inválido')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      errors: errors.array() 
    });
  }

  try {
    const { nome, idade, email, celular } = req.body;

    // Verificação redundante (importante para consistência)
    const emailExistente = await Student.findOne({ email });
    if (emailExistente) {
      return res.status(400).json({ 
        success: false, 
        message: 'E-mail já cadastrado' 
      });
    }

    const chavePix = `pix-${Math.random().toString(36).substr(2, 9)}-${Date.now().toString(36)}`;
    
    const aluno = new Student({ 
      nome, 
      idade, 
      email, 
      celular,
      chavePix
    });

    await aluno.save();

    // Envia e-mail (assíncrono - não espera resposta)
    sendEmail(email, 'Confirmação de Inscrição', `
      Olá ${nome}, 
      Sua inscrição foi realizada com sucesso!
      Chave PIX para pagamento: ${chavePix}
      Valor: R$ XXX,XX
      Prazo: 3 dias úteis
    `).catch(console.error); // Captura erros sem afetar a resposta

    res.json({ 
      success: true, 
      chavePix,
      aluno: {
        id: aluno._id,
        nome: aluno.nome,
        email: aluno.email
      }
    });

  } catch (error) {
    console.error('🔥 ERRO:', error);
    
    let errorMessage = 'Erro ao processar inscrição';
    let statusCode = 500;
    
    if (error.code === 11000) {
      errorMessage = 'E-mail já cadastrado';
      statusCode = 400;
    }

    res.status(statusCode).json({ 
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