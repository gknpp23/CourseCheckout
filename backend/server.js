process.env.MONGODB_DISABLE_SASL_PREP = "1";
process.env.MONGODB_DRIVER_PATH = require.resolve('mongodb');
require('dotenv').config();
const express = require('express');
const { json, urlencoded } = express;
const { set, connect, Schema, model } = require('mongoose');
const mongoose = require('mongoose');
const cors = require('cors');
const { body, validationResult } = require('express-validator');
const { sendEmail } = require('./src/services/email.services');
const { post } = require('axios');
const rateLimit = require('express-rate-limit');

// Configurações iniciais
const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(json());
app.use(urlencoded({ extended: true }));

// Rate Limiting para APIs públicas
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // limite de 100 requisições por IP
  message: 'Too many requests from this IP, please try again later'
});
process.env.MONGODB_SCRAM_SHA_1_DISABLE_SASL_PREP = "1";
mongoose.set('strictQuery', true);


const RETRY_DELAY = 5000; // 5 segundos entre tentativas
const MAX_RETRIES = 5;    // Máximo de tentativas

let retryCount = 0;

const connectWithRetry = async () => {
  try {
    // Usa MONGO_URL do Railway ou MONGO_URI como fallback
    const connectionString = process.env.MONGO_URL || process.env.MONGO_URI;
    
    await mongoose.connect(connectionString, {
      // Configurações para MongoDB Atlas
      ssl: true,
      tlsAllowInvalidCertificates: false,
      
      // Configurações para Railway MongoDB
      authMechanism: process.env.MONGO_URL ? 'DEFAULT' : 'SCRAM-SHA-1',
      retryWrites: true,
      w: 'majority',
      retryReads: true,
      
      // Timeouts otimizados
      serverSelectionTimeoutMS: 3000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 3000,
      
      // Força IPv4 se estiver no Railway
      family: process.env.MONGO_URL ? 4 : undefined
    });

    console.log('✅ Conectado ao MongoDB');
    retryCount = 0; // Reseta o contador após conexão bem-sucedida
    
  } catch (err) {
    retryCount++;
    console.error(`❌ Erro na conexão (Tentativa ${retryCount}/${MAX_RETRIES}):`, err.message);
    
    if (retryCount < MAX_RETRIES) {
      console.log(`⏳ Tentando reconexão em ${RETRY_DELAY/1000} segundos...`);
      setTimeout(connectWithRetry, RETRY_DELAY);
    } else {
      console.error('🔥 Falha crítica: Máximo de tentativas alcançado');
      process.exit(1);
    }
  }
};

// Handlers adicionais para monitoramento
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ Conexão com MongoDB perdida');
});

mongoose.connection.on('reconnected', () => {
  console.log('🔁 Conexão com MongoDB reestabelecida');
});

// Inicia a conexão
connectWithRetry();

module.exports = mongoose;

// Modelos
const studentSchema = new Schema({
  nome: { type: String, required: true, trim: true },
  idade: { type: Number, required: true, min: 1, max: 120 },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true, 
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'E-mail inválido'] 
  },
  celular: { type: String, required: true, trim: true },
  dataInscricao: { type: Date, default: Date.now },
  pagamentoConfirmado: { type: Boolean, default: false },
  customerId: { type: String } // Adicionado para armazenar ID do cliente no gateway de pagamento
});

const Student = model('Student', studentSchema);

// Utilitários
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const validateRequest = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  return null;
};

// Rotas
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

app.get('/api/verificar-email', apiLimiter, asyncHandler(async (req, res) => {
  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Parâmetro email é obrigatório' });
  }
  const alunoExistente = await Student.findOne({ email });
  res.json({ success: true, emailDisponivel: !alunoExistente });
}));

app.post('/api/inscricao', [
  body('nome').notEmpty().withMessage('Nome é obrigatório').trim().escape().isLength({ min: 3 }).withMessage('Nome precisa ter pelo menos 3 caracteres'),
  body('idade').isInt({ min: 1, max: 120 }).withMessage('Idade deve ser entre 1 e 120 anos').toInt(),
  body('email').isEmail().withMessage('E-mail inválido').normalizeEmail(),
  body('celular').notEmpty().withMessage('Celular é obrigatório').trim().matches(/^[0-9]{10,15}$/).withMessage('Celular inválido (10-15 números)'),
  body('taxId').if(body('taxId').exists()).isTaxID().withMessage('CPF/CNPJ inválido')
], asyncHandler(async (req, res) => {
  const validationError = validateRequest(req, res);
  if (validationError) return validationError;

  const { nome, idade, email, celular, taxId } = req.body;
  
  const alunoExistente = await Student.findOne({ email });
  if (alunoExistente) {
    return res.status(409).json({ success: false, message: 'E-mail já cadastrado' });
  }

  const aluno = new Student({ nome, idade, email, celular });
  await aluno.save();

  try {
    await sendEmail(email, 'Confirmação de Inscrição', `Olá ${nome}, sua inscrição foi realizada com sucesso!`);
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

// Integração com Gateway de Pagamento
const createAbacatePayCustomer = async (customerData) => {
  try {
    const response = await post('https://api.abacatepay.com/v1/customer/create', customerData, {
      headers: {
        'Authorization': `Bearer ${process.env.ABACATEPAY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Erro ao criar cliente no AbacatePay:', error.response?.data || error.message);
    throw error;
  }
};

const createAbacatePayBilling = async (billingData) => {
  try {
    const response = await post('https://api.abacatepay.com/v1/billing/create', billingData, {
      headers: {
        'Authorization': `Bearer ${process.env.ABACATEPAY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Erro ao criar cobrança no AbacatePay:', error.response?.data || error.message);
    throw error;
  }
};

app.post('/api/checkout', asyncHandler(async (req, res) => {
  const { nome, email, celular, taxId } = req.body;

  // 1. Criar cliente no gateway de pagamento
  const customerData = {
    name: nome,
    cellphone: celular,
    taxId: taxId,
    email: email,
    metadata: { email } // Adiciona email nos metadados para webhook
  };

  const customerResponse = await createAbacatePayCustomer(customerData);
  const customerId = customerResponse.customerId || customerResponse.id;

  // 2. Criar aluno no banco de dados
  const aluno = new Student({ 
    nome, 
    idade: req.body.idade || null, 
    email, 
    celular,
    customerId 
  });
  await aluno.save();

  // 3. Criar cobrança
  const billingData = {
    frequency: 'ONE_TIME',
    methods: ['PIX'],
    products: [
      {
        externalId: 'prod-1234',
        name: 'Assinatura de Programa Fitness',
        description: 'Acesso ao programa fitness premium por 1 mês.',
        quantity: 1,
        price: 2000 // em centavos
      }
    ],
    returnUrl: process.env.PAYMENT_RETURN_URL,
    completionUrl: process.env.PAYMENT_SUCCESS_URL,
    customerId,
    customer: customerData
  };

  const billingResponse = await createAbacatePayBilling(billingData);
  const checkoutUrl = billingResponse.data?.url || billingResponse.url;

  // 4. Atualizar aluno com dados da transação
  aluno.transactionId = billingResponse.id;
  await aluno.save();

  res.json({ 
    success: true, 
    checkoutUrl,
    transactionId: aluno._id
  });
}));

// Webhook de Pagamento
app.post("/webhook", json(), asyncHandler(async (req, res) => {
  console.log("📩 Requisição recebida no webhook");

  const secretRecebida = req.query.secret || req.headers['x-webhook-secret'];
  if (secretRecebida !== process.env.WEBHOOK_SECRET) {
    console.warn("❌ Secret inválida recebida");
    return res.status(403).send("Acesso negado");
  }

  const event = req.body;
  console.log("📦 Evento recebido:", JSON.stringify(event, null, 2));

  const eventType = event?.event;
  const customer = event?.data?.billing?.customer || event?.data?.customer;
  const email = customer?.email || customer?.metadata?.email;

  if (!email) {
    console.error("❌ Email do cliente ausente");
    return res.status(400).send("Email não encontrado");
  }

  if (eventType === 'billing.paid') {
    const alunoAtualizado = await Student.findOneAndUpdate(
      { email },
      { 
        pagamentoConfirmado: true,
        dataPagamento: new Date(),
        statusPagamento: 'approved'
      },
      { new: true }
    );

    if (!alunoAtualizado) {
      console.warn("⚠️ Aluno não encontrado para o e-mail:", email);
      return res.status(404).send("Aluno não encontrado");
    }

    await sendEmail(
      email,
      "Confirmação de Pagamento 🎉",
      `Olá ${alunoAtualizado.nome}, seu pagamento foi confirmado!`
    );

    console.log("✅ Pagamento confirmado para:", email);
    return res.status(200).send("Webhook processado com sucesso");
  }

  res.status(200).send("Evento não tratado");
}));

// Rotas administrativas
app.put('/api/confirm-payment/:transactionId', asyncHandler(async (req, res) => {
  const { transactionId } = req.params;
  const aluno = await Student.findByIdAndUpdate(
    transactionId, 
    { 
      pagamentoConfirmado: true,
      dataPagamento: new Date() 
    }, 
    { new: true }
  );

  if (!aluno) {
    return res.status(404).json({ success: false, message: 'Inscrição não encontrada' });
  }

  res.json({ 
    success: true, 
    message: 'Pagamento confirmado com sucesso', 
    aluno: {
      id: aluno._id,
      nome: aluno.nome,
      email: aluno.email,
      status: 'confirmed'
    }
  });
}));

// Tratamento de erros
app.use((err, req, res, next) => {
  console.error('🔥 ERRO:', err);
  res.status(500).json({ 
    success: false, 
    message: 'Erro interno no servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Inicialização do servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🔗 Ambiente: ${process.env.NODE_ENV || 'development'}`);
});