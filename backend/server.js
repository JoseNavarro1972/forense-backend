const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const { Client } = require("pg");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// 🔒 Conexión segura usando URI
const db = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

db.connect()
  .then(() => console.log("✅ Conectado a Supabase PostgreSQL"))
  .catch((err) => {
    console.error("❌ Error conectando a Supabase:", err.message);
  });

// Endpoint de login
app.post("/api/login", async (req, res) => {
  const { usuario, clave } = req.body;

  if (!usuario || !clave) {
    return res.status(400).json({ mensaje: "Usuario y clave requeridos" });
  }

  try {
    const result = await db.query("SELECT * FROM usuario WHERE usuario = $1", [usuario]);

    if (result.rows.length === 0) {
      return res.status(401).json({ mensaje: "Usuario no encontrado" });
    }

    const user = result.rows[0];
    const esValida = await bcrypt.compare(clave, user.clave);

    if (!esValida) {
      return res.status(401).json({ mensaje: "Contraseña incorrecta" });
    }

    res.json({
      mensaje: "Inicio de sesión exitoso",
      usuario: user.usuario,
      id: user.identificacion
    });

  } catch (error) {
    console.error("❌ Error en /api/login:", error);
    res.status(500).json({ mensaje: "Error en el servidor" });
  }
});

// Puerto
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`🟢 Servidor backend corriendo en http://localhost:${PORT}`);
});
