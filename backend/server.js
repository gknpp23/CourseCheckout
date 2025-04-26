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

mongoose.set('strictQuery', true);
mongoose.connect(mongoURI)
  .then(() => console.log('✅ Conectado ao MongoDB'))
  .catch(err => console.error('❌ Erro no MongoDB:', err));

const studentSchema = new mongoose.Schema({
  nome: { type: String, required: true, trim: true },
  idade: { type: Number, required: true, min: 1, max: 120 },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true,
  match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'E-mail inválido'] },
  celular: { type: String, required: true, trim: true },
  dataInscricao: { type: Date, default: Date.now },
  pagamentoConfirmado: { type: Boolean, default: false }
});

const Student = mongoose.model('Student', studentSchema);

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

app.get('/api/verificar-email', asyncHandler(async (req, res) => {
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
  body('celular').notEmpty().withMessage('Celular é obrigatório').trim().matches(/^[0-9]{10,15}$/).withMessage('Celular inválido (10-15 números)')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { nome, idade, email, celular } = req.body;
  const emailExistente = await Student.findOne({ email });
  if (emailExistente) {
    return res.status(409).json({ success: false, message: 'E-mail já cadastrado' });
  }

  const aluno = new Student({ nome, idade, email, celular });
  await aluno.save();

  try {
    await sendEmail(email, 'Confirmação de Inscrição', `Olá ${nome}, Sua inscrição foi realizada com sucesso!`);
    console.log(`E-mail enviado para: ${email}`);
  } catch (emailError) {
    console.error('Erro ao enviar e-mail:', emailError);
  }

  res.json({ success: true, transactionId: aluno._id, aluno: { id: aluno._id, nome: aluno.nome, email: aluno.email } });
}));

app.post('/api/checkout', async (req, res) => {
  try {
    const { nome, email, celular, taxId } = req.body;

    // Criação do cliente
    const clienteRes = await axios.post('https://api.abacatepay.com/v1/customer/create', {
        name: nome,
        cellphone: celular,
        taxId: taxId,
        email: email
      
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.ABACATEPAY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const customerId = clienteRes.data.customerId || clienteRes.data.id;

    // Criação da cobrança
    const cobrancaRes = await axios.post('https://api.abacatepay.com/v1/billing/create', {
      frequency: 'ONE_TIME',
      methods: ['PIX'],
      products: [
        {
          externalId: 'prod-1234',
          name: 'Assinatura de Programa Fitness',
          description: 'Acesso ao programa fitness premium por 1 mês.',
          quantity: 2,
          price: 2000 // em centavos
        }
      ],
      returnUrl: 'https://e9f6-187-94-205-75.ngrok-free.app/',
      completionUrl: 'https://099f-187-94-205-75.ngrok-free.app/success',
      customerId: customerId,
      customer: {
        name: nome,
        cellphone: celular,
        email: email,
        taxId: taxId
      }
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.ABACATEPAY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    
    const checkoutUrl = cobrancaRes.data.data.url;
    console.log('URL de checkout:', checkoutUrl);

    res.json({ checkoutUrl });

  } catch (error) {
    console.error('Erro ao criar cobrança:', error.response?.data || error.message);
    res.status(500).json({ message: 'Erro ao processar o checkout' });
  }
});

app.post("/webhook", express.json(), async (req, res) => {
  console.log("📩 Requisição recebida no webhook");

  try {
    const secretRecebida = req.query.secret || req.query.webhookSecret;
    const SECRET_ESPERADA = process.env.WEBHOOK_SECRET || 'sapoha'; // valor padrão de fallback

    // Verifica se o segredo recebido é válido
    if (secretRecebida !== SECRET_ESPERADA) {
      console.warn("❌ Secret inválida recebida:", secretRecebida);
      return res.status(403).send("Acesso negado: Secret incorreta.");
    }

    const event = req.body;
    console.log("📦 Evento recebido:", JSON.stringify(event, null, 2));

    const eventType = event?.event;
    const customer = event?.data?.billing?.customer || event?.data?.customer;
    const metadata = customer?.metadata || {};

    const email = metadata?.email;

    if (!email) {
      console.error("❌ Email do cliente ausente nos metadados.");
      return res.status(400).send("Email não encontrado.");
    }

    if (eventType === 'billing.paid') {
      // Atualiza o aluno no banco de dados
      const alunoAtualizado = await Student.findOneAndUpdate(
        { email },
        {
          pagamentoConfirmado: true,
          dataInscricao: new Date(),
        },
        { new: true }
      );

      if (!alunoAtualizado) {
        console.warn("⚠️ Aluno não encontrado para o e-mail:", email);
        return res.status(404).send("Aluno não encontrado.");
      }

      // Envia e-mail de confirmação
      await sendEmail(
        email,
        "Confirmação de Inscrição 🚀",
        `
          <p>Olá <strong>${alunoAtualizado.nome}</strong>,</p>

          <p>Seu pagamento foi aprovado e sua vaga no curso tá garantida! 👊</p>

          <p>Agora é só aguardar os próximos passos que vamos te enviar por aqui mesmo.</p>

          <p>Enquanto isso, prepare-se para uma jornada incrível de aprendizado.</p>

          <p>Qualquer dúvida, é só dar um alô.</p>

          <p>Abraços,<br>Equipe <strong>Fábrica do Liso</strong> 🤓</p>
        `
      );

      console.log("✅ Pagamento confirmado e aluno atualizado:", alunoAtualizado);
      return res.status(200).send("Pagamento processado com sucesso.");
    } else {
      console.info("ℹ️ Evento ignorado:", eventType);
      return res.status(200).send("Evento não tratado.");
    }
  } catch (error) {
    console.error("💥 Erro no processamento do webhook:", error);
    return res.status(500).send("Erro interno.");
  }
});




// app.post('/api/abacatepay', async (req, res) => {
//   try {
//     const { nome, email, celular, taxId } = req.body;

//     console.log('Dados enviados para AbacatePay:', {
//       name: nome,
//       cellphone: celular,
//       taxId: taxId,
//       email: email
//     });

//     const response = await axios.post('https://api.abacatepay.com/v1/customer/create', {
//       name: nome,
//       cellphone: celular,
//       taxId: taxId,
//       email: email
//     }, {
//       headers: {
//         'Authorization': `Bearer ${process.env.ABACATEPAY_API_KEY}`,
//         'Content-Type': 'application/json'
//       }
//     });

//     console.log('Resposta da AbacatePay:', response.data);
//     res.json(response.data);
//   } catch (error) {
//     console.error('Erro ao integrar com o AbacatePay:', error.response?.data || error.message);
//     res.status(500).json({ message: 'Erro ao processar o pagamento' });
//   }
// });

app.put('/api/confirm-payment/:transactionId', asyncHandler(async (req, res) => {
  const { transactionId } = req.params;
  const aluno = await Student.findByIdAndUpdate(transactionId, { pagamentoConfirmado: true }, { new: true });

  if (!aluno) {
    return res.status(404).json({ success: false, message: 'Inscrição não encontrada' });
  }

  res.json({ success: true, message: 'Pagamento confirmado com sucesso', aluno });
}));

app.use((err, req, res, next) => {
  console.error('🔥 ERRO:', err);
  res.status(500).json({ success: false, message: 'Erro interno no servidor', error: process.env.NODE_ENV === 'development' ? err.message : undefined });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
