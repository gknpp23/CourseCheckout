// // db/connection.js
const mongoose = require('mongoose');

// // Configurações iniciais
// process.env.MONGODB_SCRAM_SHA_1_DISABLE_SASL_PREP = "1";
// mongoose.set('strictQuery', true);

// const RETRY_DELAY = 5000;
// const MAX_RETRIES = 3;
// let retryCount = 0;

// const connectDB = async () => {
//   try {
//     const connectionString = process.env.MONGO_URL || process.env.MONGO_URI;
    
//     if (!connectionString) {
//       throw new Error('❌ Variáveis MONGO_URL/MONGO_URI não definidas');
//     }

//     console.log(`⌛ Tentando conexão (${retryCount + 1}/${MAX_RETRIES})...`);

//     await mongoose.connect(connectionString, {
//       ssl: true,
//       tlsAllowInvalidCertificates: false,
//       retryWrites: true,
//       w: 'majority',
//       serverSelectionTimeoutMS: 8000,
//       socketTimeoutMS: 45000,
//       ...(process.env.RAILWAY_ENVIRONMENT && { family: 4 }) // IPv4 apenas no Railway
//     });

//     console.log('✅ Conectado ao MongoDB');
//     retryCount = 0;
//     return mongoose.connection;

//   } catch (err) {
//     retryCount++;
//     console.error(`❌ Erro na conexão: ${err.message}`);
    
//     if (retryCount < MAX_RETRIES) {
//       console.log(`⌛ Nova tentativa em ${RETRY_DELAY/1000}s...`);
//       await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
//       return connectDB();
//     }
    
//     throw new Error('🔥 Falha crítica na conexão com MongoDB');
//   }
// };

// // Eventos de conexão
// mongoose.connection.on('disconnected', () => {
//   console.warn('⚠️ Conexão perdida com MongoDB');
// });

// mongoose.connection.on('reconnected', () => {
//   console.log('🔁 Conexão reestabelecida');
// });

// module.exports = {
//   connectDB,
//   mongoose
// };

// process.env.MONGODB_SCRAM_SHA_1_DISABLE_SASL_PREP = "1";
// mongoose.set('strictQuery', true);


// const RETRY_DELAY = 5000; // 5 segundos entre tentativas
// const MAX_RETRIES = 5;    // Máximo de tentativas

// let retryCount = 0;

// const connectWithRetry = async () => {
//   try {
//     // Usa MONGO_URL do Railway ou MONGO_URI como fallback
//     const connectionString = process.env.MONGO_URL || process.env.MONGO_URI;
    
//     await mongoose.connect(connectionString, {
//       // Configurações para MongoDB Atlas
//       ssl: true,
//       tlsAllowInvalidCertificates: false,
      
//       // Configurações para Railway MongoDB
//       authMechanism: process.env.MONGO_URL ? 'DEFAULT' : 'SCRAM-SHA-1',
//       retryWrites: true,
//       w: 'majority',
//       retryReads: true,
      
//       // Timeouts otimizados
//       serverSelectionTimeoutMS: 3000,
//       socketTimeoutMS: 45000,
//       connectTimeoutMS: 3000,
      
//       // Força IPv4 se estiver no Railway
//       family: process.env.MONGO_URL ? 4 : undefined
//     });

//     console.log('✅ Conectado ao MongoDB');
//     retryCount = 0; // Reseta o contador após conexão bem-sucedida
    
//   } catch (err) {
//     retryCount++;
//     console.error(`❌ Erro na conexão (Tentativa ${retryCount}/${MAX_RETRIES}):`, err.message);
    
//     if (retryCount < MAX_RETRIES) {
//       console.log(`⏳ Tentando reconexão em ${RETRY_DELAY/1000} segundos...`);
//       setTimeout(connectWithRetry, RETRY_DELAY);
//     } else {
//       console.error('🔥 Falha crítica: Máximo de tentativas alcançado');
//       process.exit(1);
//     }
//   }
// };

// // Handlers adicionais para monitoramento
// mongoose.connection.on('disconnected', () => {
//   console.warn('⚠️ Conexão com MongoDB perdida');
// });

// mongoose.connection.on('reconnected', () => {
//   console.log('🔁 Conexão com MongoDB reestabelecida');
// });

// // Inicia a conexão
// connectWithRetry();

// module.exports = mongoose;

// const mongoose = require('mongoose');
// const path = require('path');

// // Solução definitiva para módulos faltantes
// process.env.MONGODB_SCRAM_SHA_1_DISABLE_SASL_PREP = "1";
// process.env.MONGODB_DRIVER_PATH = path.dirname(require.resolve('mongodb'));

// mongoose.set('strictQuery', true);

// const connectDB = async () => {
//   try {
//     const conn = await mongoose.connect(process.env.MONGO_URL, {
//       useNewUrlParser: true,
//       useUnifiedTopology: true,
//       ssl: true,
//       tlsAllowInvalidCertificates: false,
//       serverSelectionTimeoutMS: 5000,
//       socketTimeoutMS: 30000,
//       family: 4 // Força IPv4 se necessário
//     });
//     console.log(`✅ MongoDB conectado: ${conn.connection.host}`);
//   } catch (err) {
//     console.error('❌ Falha na conexão:', err.message);
//     process.exit(1);
//   }
// };

// module.exports = connectDB;


// Adicione no TOPO do arquivo (antes de tudo)
process.env.MONGODB_DRIVER_PATH = require.resolve('mongodb');
process.env.MONGODB_SCRAM_SHA_1_DISABLE_SASL_PREP = "1";

mongoose.set('strictQuery', false); // Recomendado para Mongoose 8+

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      ssl: true,
      tlsAllowInvalidCertificates: false,
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
      family: 4, // Força IPv4 no Railway
      retryWrites: true,
      w: 'majority'
    });
    console.log('✅ MongoDB conectado com sucesso');
  } catch (err) {
    console.error('❌ Falha crítica na conexão:', err.message);
    process.exit(1); // Encerra o processo com erro
  }
};

// Eventos de conexão
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ Conexão perdida com MongoDB');
});

module.exports = connectDB;