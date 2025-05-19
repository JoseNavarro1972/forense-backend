/* eslint-disable no-unused-vars */
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const { verificarSesion } = require("./middleware/auth");

const app = express();

app.use(cors({
  origin: ['https://josenavarro1972.github.io', 'http://localhost:8080'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-Token', 'X-Requested-With'],
  exposedHeaders: ['X-Session-Token'],
  credentials: true
}));

app.use(express.json());

const PORT = process.env.PORT || 3002;

let db;

try {
  // Configuración de la base de datos
  const dbConfig = process.env.NODE_ENV === 'production' 
    ? {
        // Configuración para la base de datos en producción
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306,
        ssl: process.env.DB_SSL === 'true' ? {rejectUnauthorized: false} : false
      }
    : {
        // Configuración local
        host: "localhost",
        user: "root",
        password: "",
        database: "peritajes",
        port: 3306
      };

  db = mysql.createConnection(dbConfig);

  db.connect((err) => {
    if (err) {
      console.error("Error conectando a MySQL:", err.message);
    } else {
      console.log("Conectado a MySQL correctamente");
    }
  });
} catch (error) {
  console.error("Error al configurar la conexión MySQL:", error.message);
}

// Escuchar en 0.0.0.0 para aceptar conexiones remotas
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor backend corriendo en http://0.0.0.0:${PORT}`);
});

// Ruta básica para verificar que el servidor está funcionando
app.get('/', (req, res) => {
  res.json({ mensaje: "API de Peritajes Forenses funcionando correctamente" });
});

const rutasProtegidas = [
  '/api/usuarios',
  '/api/ingreso',
  '/api/consulta',
  '/api/buscar-modificar',
  '/api/ingresos',
];

app.use((req, res, next) => {
  const ruta = req.path;
  if (req.method === 'OPTIONS' || ruta === '/api/login' || ruta === '/api/logout') {
    return next();
  }
  if (rutasProtegidas.some(protegida => ruta.startsWith(protegida))) {
    return verificarSesion(req, res, next);
  }
  next();
});

// Aquí pegas todos tus endpoints anteriores tal como los tenías definidos
// Por ejemplo:
app.post("/api/login", async (req, res) => {
  // Tu código del login aquí
});

app.post("/api/logout", (req, res) => {
  // Tu código del logout aquí
});

// ... todos los otros endpoints de usuarios, consulta, ingreso, etc.

app.use((req, res) => {
  console.log(`Ruta no encontrada: ${req.method} ${req.url}`);
  res.status(404).json({ mensaje: "Ruta no encontrada" });
});

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

function gracefulShutdown() {
  console.log('Cerrando servidor...');
  server.close(() => {
    console.log('Servidor HTTP cerrado');

    if (db && db.state !== 'disconnected') {
      db.end((err) => {
        if (err) {
          console.error('Error al cerrar la conexión MySQL:', err);
        } else {
          console.log('Conexión MySQL cerrada');
        }
        process.exit(0);
      });
    } else {
      console.log('La conexión MySQL ya estaba cerrada.');
      process.exit(0);
    }
  });

  setTimeout(() => {
    console.error('Tiempo de espera excedido, forzando salida');
    process.exit(1);
  }, 10000);
}
