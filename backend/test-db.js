const { Client } = require("pg");

const db = new Client({
  host: "2600:1f1c:f9:4d08:c125:a109:411:48cd", // IPv6 directa
  user: "postgres",
  password: "TU_CONTRASEÑA_REAL",
  database: "postgres",
  port: 5432,
  ssl: { rejectUnauthorized: false }
});

db.connect()
  .then(() => {
    console.log("✅ Conexión a Supabase exitosa.");
    return db.query("SELECT NOW()");
  })
  .then((res) => {
    console.log("🕒 Fecha actual desde Supabase:", res.rows[0]);
    db.end();
  })
  .catch((err) => {
    console.error("❌ Error al conectar a Supabase:", err.message);
  });
