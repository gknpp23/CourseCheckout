require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { body, validationResult } = require('express-validator');
const { sendEmail } = require('./src/services/email.services');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const mongoURI = process.env.MONGO_URI;

// Configuração do Mongoose para evitar warnings
mongoose.set('strictQuery', true);
mongoose.connect(mongoURI)
  .then(() => console.log('✅ Conectado ao MongoDB'))
  .catch(err => console.error('❌ Erro no MongoDB:', err));

// Modelo Student com validação de email único (removido o índice duplicado)
const studentSchema = new mongoose.Schema({
  nome: { 
    type: String, 
    required: true,
    trim: true
  },
  idade: { 
    type: Number, 
    required: true, 
    min: 1,
    max: 120 
  },
  email: { 
    type: String, 
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'E-mail inválido']
  },
  celular: { 
    type: String, 
    required: true,
    trim: true
  },
  chavePix: { 
    type: String, 
    unique: true 
  },
  dataInscricao: { 
    type: Date, 
    default: Date.now 
  },
  pagamentoConfirmado: {
    type: Boolean,
    default: false
  }
});

// Removido studentSchema.index() duplicado - já há unique:true no campo email

const Student = mongoose.model('Student', studentSchema);

// Middleware para tratamento de erros assíncronos
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Rota para verificar email único
app.get('/api/verificar-email', asyncHandler(async (req, res) => {
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
}));

// Rota de inscrição com validações
app.post('/api/inscricao', [
  body('nome')
    .notEmpty().withMessage('Nome é obrigatório')
    .trim()
    .escape()
    .isLength({ min: 3 }).withMessage('Nome precisa ter pelo menos 3 caracteres'),
  body('idade')
    .isInt({ min: 1, max: 120 }).withMessage('Idade deve ser entre 1 e 120 anos')
    .toInt(),
  body('email')
    .isEmail().withMessage('E-mail inválido')
    .normalizeEmail(),
  body('celular')
    .notEmpty().withMessage('Celular é obrigatório')
    .trim()
    .matches(/^[0-9]{10,15}$/).withMessage('Celular inválido (10-15 números)')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      errors: errors.array() 
    });
  }

  const { nome, idade, email, celular } = req.body;

  // Verificação de email existente
  const emailExistente = await Student.findOne({ email });
  if (emailExistente) {
    return res.status(409).json({ 
      success: false, 
      message: 'E-mail já cadastrado' 
    });
  }

    
  const aluno = new Student({ 
    nome, 
    idade, 
    email, 
    celular,
    
  });
  


  await aluno.save();

  // Envio de email com tratamento adequado
  try {
    await sendEmail(email, 'Confirmação de Inscrição', `
      Olá ${nome}, 
      Sua inscrição foi realizada com sucesso!      
    `);
    console.log(`E-mail enviado para: ${email}`);
  } catch (emailError) {
    console.error('Erro ao enviar e-mail:', emailError);
    
  }

  res.json({ 
    success: true, 
    transactionId: aluno._id,
    aluno: {
      id: aluno._id,
      nome: aluno.nome,
      email: aluno.email
    }
  });
}));

// Rota para criar um cliente no AbacatePay
app.post('/api/abacatepay', async (req, res) => {
  try {
    const { nome, email, celular, taxId } = req.body;

    const response = await axios.post('https://api.abacatepay.com/v1/customer/create', {
      nome,
      email,
      celular,
      taxId
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.ABACATEPAY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    // 👇 Aqui você garante que vai mandar JSON pro frontend
    console.log('Resposta da AbacatePay:', response.data);
    res.json(response.data);
  } catch (error) {
    console.error('Erro ao integrar com o AbacatePay:', error.response?.data || error.message);
    res.status(500).json({ message: 'Erro ao processar o pagamento' });
  }
});



// Rota para gerar PIX
/* app.post('/api/pix', asyncHandler(async (req, res) => {
  const { studentId, amount } = req.body;
  
  if (!studentId || !amount) {
    return res.status(400).json({ 
      success: false, 
      message: 'studentId e amount são obrigatórios' 
    });
  }

  const aluno = await Student.findById(studentId);
  if (!aluno) {
    return res.status(404).json({ 
      success: false, 
      message: 'Aluno não encontrado' 
    });
  }

  res.json({
    success: true,
    chavePix: aluno.chavePix,
    amount,
    beneficiary: 'Cursos Online Ltda',
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
  });
}));
*/
// Rota para confirmar pagamento
app.put('/api/confirm-payment/:transactionId', asyncHandler(async (req, res) => {
  const { transactionId } = req.params;

  const aluno = await Student.findByIdAndUpdate(
    transactionId,
    { pagamentoConfirmado: true },
    { new: true }
  );

  if (!aluno) {
    return res.status(404).json({ 
      success: false, 
      message: 'Inscrição não encontrada' 
    });
  }

  res.json({ 
    success: true,
    message: 'Pagamento confirmado com sucesso',
    aluno
  });
}));

// Rota para verificar status
/*
app.get('/api/payment-status/:transactionId', asyncHandler(async (req, res) => {
  const { transactionId } = req.params;

  const aluno = await Student.findById(transactionId);
  if (!aluno) {
    return res.status(404).json({ 
      success: false, 
      message: 'Inscrição não encontrada' 
    });
  }

  res.json({ 
    success: true,
    pagamentoConfirmado: aluno.pagamentoConfirmado,
    status: aluno.pagamentoConfirmado ? 'PAID' : 'PENDING'
  });
}));
*/

// Middleware para tratamento de erros
app.use((err, req, res, next) => {
  console.error('🔥 ERRO:', err);
  
  res.status(500).json({ 
    success: false, 
    message: 'Erro interno no servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});