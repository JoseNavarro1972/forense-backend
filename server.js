const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcryptjs"); // Para hashear contraseñas
const { verificarSesion } = require("./middleware/auth");

const app = express();
app.use(cors({
  origin: '*', // Permite cualquier origen
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-Token', 'X-Requested-With'],
  exposedHeaders: ['X-Session-Token'],
  credentials: true
}));
app.use(express.json()); 

const PORT = 3002; 

let db;

try {
  db = mysql.createConnection({
    host: "localhost",
    user: "root", 
    password: "", 
    database: "peritajes", 
    port: 3306
  });

  db.connect((err) => {
    if (err) {
      console.error("Error conectando a MySQL:", err.message);
      console.log("El servidor continuará, pero las operaciones de base de datos no funcionarán.");
    } else {
      console.log("Conectado a MySQL correctamente");
    }
  });
} catch (error) {
  console.error("Error al configurar la conexión MySQL:", error.message);
}

const server = app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
});

// Middleware para rutas protegidas
const rutasProtegidas = [
  '/api/usuarios',
  '/api/ingreso',
  '/api/consulta',
  '/api/buscar-modificar',
  '/api/ingresos',
];

app.use((req, res, next) => {
  const ruta = req.path;
  // Excluir la ruta de login y OPTIONS de la verificación
  if (req.method === 'OPTIONS' || ruta === '/api/login' || ruta === '/api/logout') {
    return next();
  }
  
  // Verificar si la ruta debe estar protegida
  if (rutasProtegidas.some(protegida => ruta.startsWith(protegida))) {
    return verificarSesion(req, res, next);
  }
  
  next();
});

app.post("/api/usuarios", async (req, res) => {
  if (!db || db.state === 'disconnected') {
    return res.status(500).json({ mensaje: "❌ Error de conexión a la base de datos" });
  }

  console.log("Recibiendo datos en /api/usuarios:", req.body);

  const { usuario, clave, rol } = req.body;

  if (!usuario || !clave || !rol) {
    return res.status(400).json({ mensaje: "Todos los campos son obligatorios" });
  }

  try {
    const claveHash = await bcrypt.hash(clave, 10);
    const id_perfil = rol === "admin" ? 1 : 2; 

    const sql = "INSERT INTO usuario (id_perfil, nombres_usuario, clave_usuario, grado_usuario, fec_ing, estado) VALUES (?, ?, ?, ?, NOW(), 1)";
    const valores = [id_perfil, usuario, claveHash, rol];

    db.query(sql, valores, (err, result) => {
      if (err) {
        console.error("Error al insertar usuario:", err);
        return res.status(500).json({ mensaje: "Error al crear el usuario" });
      }
      res.status(201).json({ mensaje: "Usuario creado con éxito", id_usuario: result.insertId });
    });
  } catch (error) {
    console.error("Error en el servidor:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
});

app.post("/api/login", async (req, res) => {
  if (!db || db.state === 'disconnected') {
    return res.status(500).json({ mensaje: "Error de conexión a la base de datos" });
  }

  console.log("Recibiendo datos en /api/login:", req.body);

  const { usuario, clave } = req.body;
  const userIp = req.ip || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'] || '';

  if (!usuario || !clave) {
    return res.status(400).json({ mensaje: "Usuario y contraseña son obligatorios" });
  }

  try {
    const sql = "SELECT id_usuario, id_perfil, nombres_usuario, clave_usuario FROM usuario WHERE nombres_usuario = ?";
    
    db.query(sql, [usuario], async (err, result) => {
      if (err) {
        console.error("Error en la consulta:", err);
        return res.status(500).json({ mensaje: "Error al buscar el usuario" });
      }

      if (result.length === 0) {
        return res.status(401).json({ mensaje: "Usuario no encontrado" });
      }

      const user = result[0];

      const esValida = await bcrypt.compare(clave, user.clave_usuario);
      if (!esValida) {
        return res.status(401).json({ mensaje: "Contraseña incorrecta" });
      }

      // Registrar la sesión en la base de datos
      const sqlSesion = "INSERT INTO sesion (id_usuario, estado, ip, user_agent) VALUES (?, 'activa', ?, ?)";
      db.query(sqlSesion, [user.id_usuario, userIp, userAgent], (errSesion, resultSesion) => {
        if (errSesion) {
          console.error("Error al registrar sesión:", errSesion);
          return res.status(500).json({ mensaje: "Error al iniciar sesión" });
        }

        res.json({
          mensaje: "Inicio de sesión exitoso",
          id_usuario: user.id_usuario,
          id_perfil: user.id_perfil,
          nombres_usuario: user.nombres_usuario,
          id_sesion: resultSesion.insertId
        });
      });
    });
  } catch (error) {
    console.error("Error en el servidor:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
});

// Endpoint para cerrar sesión
app.post("/api/logout", (req, res) => {
  const sessionToken = req.headers['x-session-token'];
  
  if (!sessionToken) {
    return res.status(400).json({ mensaje: "No se proporcionó token de sesión" });
  }

  const sql = "UPDATE sesion SET estado = 'cerrada', fecha_fin = NOW() WHERE id_sesion = ?";
  db.query(sql, [sessionToken], (err, result) => {
    if (err) {
      console.error("Error al cerrar sesión:", err);
      return res.status(500).json({ mensaje: "Error al cerrar sesión" });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ mensaje: "Sesión no encontrada" });
    }
    
    res.json({ mensaje: "Sesión cerrada correctamente" });
  });
});

app.get("/api/usuarios", (req, res) => {
  if (!db || db.state === 'disconnected') {
    return res.status(500).json({ mensaje: "Error de conexión a la base de datos" });
  }

  // Si hay un parámetro de búsqueda, filtrar por nombre de usuario
  const buscar = req.query.buscar;
  let sql = "SELECT id_usuario, id_perfil, nombres_usuario, grado_usuario, fec_ing, estado FROM usuario";
  
  // Si se especifica un término de búsqueda, añadimos condición WHERE
  if (buscar) {
    sql += " WHERE nombres_usuario LIKE ?";
    const termino = `%${buscar}%`;
    
    db.query(sql, [termino], (err, results) => {
      if (err) {
        console.error("Error al buscar usuarios:", err);
        return res.status(500).json({ mensaje: "Error al buscar usuarios" });
      }
      res.json(results);
    });
  } else {
    // Si no hay término de búsqueda, devolver todos los usuarios
    db.query(sql, (err, results) => {
      if (err) {
        console.error("Error al obtener usuarios:", err);
        return res.status(500).json({ mensaje: "Error al obtener los usuarios" });
      }
      res.json(results);
    });
  }
});

app.delete("/api/usuarios/:id", (req, res) => {
  if (!db || db.state === 'disconnected') {
    return res.status(500).json({ mensaje: "Error de conexión a la base de datos" });
  }

  const { id } = req.params;

  const sql = "DELETE FROM usuario WHERE id_usuario = ?";
  db.query(sql, [id], (err) => {
    if (err) {
      console.error("Error al eliminar usuario:", err);
      return res.status(500).json({ mensaje: "Error al eliminar el usuario" });
    }
    res.json({ mensaje: "Usuario eliminado con éxito" });
  });
});

app.put("/api/usuarios/:id", async (req, res) => {
  if (!db || db.state === 'disconnected') {
    return res.status(500).json({ mensaje: "Error de conexión a la base de datos" });
  }

  const { id } = req.params;
  const { usuario, clave, rol, estado } = req.body;

  if (!usuario || !rol) {
    return res.status(400).json({ mensaje: "Nombre de usuario y rol son obligatorios" });
  }

  try {
    const id_perfil = rol === "admin" ? 1 : 2;
    
    if (clave) {
      const claveHash = await bcrypt.hash(clave, 10);
      const sql = "UPDATE usuario SET id_perfil = ?, nombres_usuario = ?, clave_usuario = ?, grado_usuario = ?, estado = ? WHERE id_usuario = ?";
      db.query(sql, [id_perfil, usuario, claveHash, rol, estado || 1, id], (err) => {
        if (err) {
          console.error("Error al actualizar usuario:", err);
          return res.status(500).json({ mensaje: "Error al actualizar el usuario" });
        }
        res.json({ mensaje: "Usuario actualizado con éxito" });
      });
    } else {
      const sql = "UPDATE usuario SET id_perfil = ?, nombres_usuario = ?, grado_usuario = ?, estado = ? WHERE id_usuario = ?";
      db.query(sql, [id_perfil, usuario, rol, estado || 1, id], (err) => {
        if (err) {
          console.error("Error al actualizar usuario:", err);
          return res.status(500).json({ mensaje: "Error al actualizar el usuario" });
        }
        res.json({ mensaje: "Usuario actualizado con éxito" });
      });
    }
  } catch (error) {
    console.error("Error en el servidor:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
});

// Endpoint para consulta de registros
app.get("/api/consulta", (req, res) => {
  console.log("⭐ Endpoint /api/consulta llamado con parámetros:", req.query);
  
  if (!db || db.state === 'disconnected') {
    console.error("❌ Error de conexión a la base de datos en /api/consulta");
    return res.status(500).json({ mensaje: "Error de conexión a la base de datos" });
  }

  try {
    let sql = `SELECT 
      id_ingreso AS id_forense, 
      nue_ingreso AS nue, 
      estado_evidencia, 
      fecha_recepcion_ingreso AS fecha_recepcion,
      causa_ruc_ingreso AS causa_ruc,
      fiscalia_ingreso AS fiscalia,
      fecha_ip_ingreso AS fecha_ip,
      tribunal_garantia_ingreso AS tribunal_garantia,
      orden_judicial AS nro_orden
    FROM ingreso 
    WHERE 1=1`;
    
    const queryParams = [];

    // Filtro por estado_evidencia - Corregido para manejar estado_pericia/estado_evidencia
    if (req.query.estado_evidencia) {
      // Verificar ambos campos posibles
      sql += " AND (LOWER(estado_evidencia) LIKE ? OR LOWER(estado_pericia) LIKE ?)";
      const termino = `%${req.query.estado_evidencia.toLowerCase()}%`;
      queryParams.push(termino, termino);
    }

    // Filtro por fecha desde
    if (req.query.fecha_desde) {
      sql += " AND fecha_recepcion_ingreso >= ?";
      queryParams.push(req.query.fecha_desde);
    }

    // Filtro por fecha hasta
    if (req.query.fecha_hasta) {
      sql += " AND fecha_recepcion_ingreso <= ?";
      queryParams.push(req.query.fecha_hasta);
    }

    // Filtro por año
    if (req.query.anio) {
      sql += " AND YEAR(fecha_recepcion_ingreso) = ?";
      queryParams.push(req.query.anio);
    }

    // Filtro por NUE
    if (req.query.nue) {
      sql += " AND LOWER(nue_ingreso) LIKE ?";
      queryParams.push(`%${req.query.nue.toLowerCase()}%`);
    }

    // Filtro por RUC
    if (req.query.ruc) {
      sql += " AND LOWER(causa_ruc_ingreso) LIKE ?";
      queryParams.push(`%${req.query.ruc.toLowerCase()}%`);
    }

    // Filtro por fiscalía
    if (req.query.fiscalia) {
      sql += " AND LOWER(fiscalia_ingreso) LIKE ?";
      queryParams.push(`%${req.query.fiscalia.toLowerCase()}%`);
    }

    // Filtro por marca
    if (req.query.marca) {
      sql += " AND LOWER(marca_ingreso) LIKE ?";
      queryParams.push(`%${req.query.marca.toLowerCase()}%`);
    }

    // Filtro por sección
    if (req.query.seccion) {
      sql += " AND LOWER(tribunal_garantia_ingreso) LIKE ?";
      queryParams.push(`%${req.query.seccion.toLowerCase()}%`);
    }

    // Orden y límite
    sql += " ORDER BY id_ingreso DESC";
    
    console.log("📝 Query SQL:", sql);
    console.log("📝 Parámetros:", queryParams);
    
    // Ejecutar consulta
    db.query(sql, queryParams, (err, results) => {
      if (err) {
        console.error("❌ Error al consultar registros:", err);
        return res.status(500).json({ mensaje: "Error al consultar registros", error: err.message });
      }
      console.log(`✅ Consulta exitosa: ${results.length} registros encontrados`);
      res.json(results);
    });
  } catch (error) {
    console.error("❌ Error en /api/consulta:", error);
    res.status(500).json({ mensaje: "Error interno del servidor", error: error.message });
  }
});

// Endpoint para buscar registros para modificar
app.post("/api/buscar-modificar", (req, res) => {
  console.log("⭐ Endpoint /api/buscar-modificar llamado con criterio:", req.body.criterio);
  
  if (!db || db.state === 'disconnected') {
    console.error("❌ Error de conexión a la base de datos en /api/buscar-modificar");
    return res.status(500).json({ mensaje: "Error de conexión a la base de datos" });
  }

  try {
    const criterio = req.body.criterio;
    
    if (!criterio) {
      return res.json({ resultados: [] });
    }
    
    const sql = `SELECT id_ingreso, causa_ruc_ingreso, estado_evidencia as estado 
                FROM ingreso 
                WHERE id_ingreso = ? OR causa_ruc_ingreso LIKE ?`;
                
    const criterioParcial = `%${criterio}%`;
    
    // Ejecutar consulta
    db.query(sql, [criterio, criterioParcial], (err, results) => {
      if (err) {
        console.error("❌ Error al buscar registros:", err);
        return res.status(500).json({ mensaje: "Error al buscar registros", error: err.message });
      }
      
      console.log(`✅ Búsqueda exitosa: ${results.length} registros encontrados`);
      res.json({ resultados: results });
    });
  } catch (error) {
    console.error("❌ Error en /api/buscar-modificar:", error);
    res.status(500).json({ mensaje: "Error interno del servidor", error: error.message });
  }
});

// Endpoint para obtener un registro específico por ID
app.get("/api/ingresos/:id", (req, res) => {
  console.log(`⭐ Endpoint GET /api/ingresos/${req.params.id} llamado`);
  
  if (!db || db.state === 'disconnected') {
    console.error(`❌ Error de conexión a la base de datos en GET /api/ingresos/${req.params.id}`);
    return res.status(500).json({ mensaje: "Error de conexión a la base de datos" });
  }

  try {
    const id = req.params.id;
    
    // Mostrar diagnóstico detallado
    console.log(`🔍 Buscando registro con ID: ${id}`);
    console.log("🔌 Estado de la base de datos:", db.state);
    
    const sql = `SELECT * FROM ingreso WHERE id_ingreso = ?`;
    
    // Ejecutar consulta
    db.query(sql, [id], (err, results) => {
      if (err) {
        console.error("❌ Error al obtener registro:", err);
        return res.status(500).json({ mensaje: "Error al obtener el registro", error: err.message });
      }
      
      console.log(`📊 Resultados encontrados: ${results.length}`);
      
      if (results.length === 0) {
        console.log(`⚠️ Registro con ID ${id} no encontrado`);
        return res.status(404).json({ mensaje: "Registro no encontrado" });
      }
      
      // Transformar nombres de campos para coincidir con el frontend
      const registro = {
        id_ingreso: results[0].id_ingreso,
        orden_judicial: results[0].orden_judicial,
        fecha_recepcion: results[0].fecha_recepcion_ingreso,
        nombre_perito: results[0].nombre_perito_ingreso,
        grado_perito: results[0].grado_perito_ingreso,
        oficio_remisor: results[0].oficio_remisor,
        fecha_oficio: results[0].fecha_oficio,
        ruc: results[0].causa_ruc_ingreso,
        fecha_instruccion_particular: results[0].fecha_instruccion_particular,
        fiscalia: results[0].fiscalia_ingreso,
        tribunal_garantia: results[0].tribunal_garantia_ingreso,
        fecha_autorizacion_orden_judicial: results[0].fecha_autorizacion_orden_judicial,
        nombre_juez_autoriza: results[0].nombre_juez_autoriza,
        nue: results[0].nue_ingreso,
        seccion: results[0].seccion,
        nro_parte: results[0].nro_parte,
        fecha_parte: results[0].fecha_parte,
        delito: results[0].delito,
        marca: results[0].marca_ingreso,
        modelo: results[0].modelo_ingreso,
        nombre_imputado: results[0].nombre_imputado,
        cedula_identidad: results[0].cedula_identidad,
        nro_telefono: results[0].numero_telefono_ingreso,
        tipo_extraccion: results[0].tipo_extraccion,
        nro_informe_extraccion: results[0].nro_informe_extraccion,
        fecha_informe_extraccion: results[0].fecha_informe_extraccion,
        nro_informe_analisis: results[0].nro_informe_analisis,
        fecha_informe_analisis: results[0].fecha_informe_analisis,
        tipo_solicitud: results[0].tipo_solicitud,
        region: results[0].region,
        dia_plazo: results[0].dia_plazo,
        prorroga: results[0].prorroga,
        cant_celular: results[0].cant_celular,
        cant_extracciones: results[0].cant_extracciones,
        estado_evidencia: results[0].estado_evidencia,
        resultado: results[0].resultado,
        observaciones: results[0].observaciones
      };
      
      console.log(`✅ Registro con ID ${id} obtenido correctamente`);
      res.json(registro);
    });
  } catch (error) {
    console.error(`❌ Error en GET /api/ingresos/${req.params.id}:`, error);
    res.status(500).json({ mensaje: "Error interno del servidor", error: error.message });
  }
});

// Endpoint para crear o actualizar un registro
app.post("/api/ingresos", (req, res) => {
  console.log("⭐ Endpoint POST /api/ingresos llamado");
  console.log("📦 Datos recibidos:", JSON.stringify(req.body, null, 2));
  
  // Verificar token de sesión
  const sessionToken = req.headers['x-session-token'];
  console.log("🔑 Token de sesión recibido:", sessionToken);
  
  if (!db || db.state === 'disconnected') {
    console.error("❌ Error de conexión a la base de datos en POST /api/ingresos");
    return res.status(500).json({ 
      success: false, 
      message: "Error de conexión a la base de datos" 
    });
  }

  try {
    const data = req.body;
    const idIngreso = data.id_ingreso;
    
    console.log("🔍 Intentando " + (idIngreso ? "actualizar registro existente" : "crear nuevo registro"));
    
    // Usar directamente los datos que vienen del cliente, que ya están mapeados correctamente
    const dbData = {...data};
    
    // Asignar id_usuario por defecto si no está presente
    if (!dbData.id_usuario) {
      dbData.id_usuario = 1;
    }
    
    // Asignar fecha de registro para nuevos registros
    if (!idIngreso && !dbData.reg_ing) {
      dbData.reg_ing = new Date();
    }
    
    console.log("📊 Datos preparados para la base de datos:", dbData);
    
    if (idIngreso) {
      // Es una actualización - eliminamos el id_ingreso para no intentar actualizarlo
      delete dbData.id_ingreso;
      
      const updateSql = `UPDATE ingreso SET ? WHERE id_ingreso = ?`;
      
      console.log("🔄 SQL actualización:", updateSql);
      console.log("🔄 Parámetros:", [dbData, idIngreso]);
      
      db.query(updateSql, [dbData, idIngreso], (err, result) => {
        if (err) {
          console.error("❌ Error al actualizar registro:", err);
          return res.status(500).json({ 
            success: false, 
            message: "Error al actualizar el registro",
            error: err.message
          });
        }
        
        console.log(`✅ Registro con ID ${idIngreso} actualizado correctamente`);
        res.json({ 
          success: true, 
          message: "Registro actualizado con éxito",
          id_ingreso: idIngreso
        });
      });
    } else {
      // Es una inserción - verificamos campos mínimos
      if (!dbData.nue_ingreso || !dbData.causa_ruc_ingreso) {
        console.error("❌ Faltan campos obligatorios");
        return res.status(400).json({
          success: false,
          message: "Se requieren campos obligatorios: NUE y RUC"
        });
      }
      
      const insertSql = `INSERT INTO ingreso SET ?`;
      
      console.log("➕ SQL inserción:", insertSql);
      console.log("➕ Datos:", dbData);
      
      db.query(insertSql, dbData, (err, result) => {
        if (err) {
          console.error("❌ Error al insertar registro:", err);
          return res.status(500).json({
            success: false,
            message: "Error al insertar el registro",
            error: err.message
          });
        }
        
        const nuevoId = result.insertId;
        console.log(`✅ Nuevo registro creado con ID ${nuevoId}`);
        res.json({
          success: true,
          message: "Registro creado con éxito",
          id_ingreso: nuevoId
        });
      });
    }
  } catch (error) {
    console.error("❌ Error en POST /api/ingresos:", error);
    res.status(500).json({ 
      success: false,
      message: "Error interno del servidor",
      error: error.message
    });
  }
});

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
    if (db) {
      try {
        db.end();
        console.log('Conexión MySQL cerrada');
      } catch (err) {
        console.error('Error al cerrar la conexión MySQL:', err);
      }
    }
    process.exit(0);
  });
  
  setTimeout(() => {
    console.error('Tiempo de espera excedido, forzando salida');
    process.exit(1);
  }, 10000);
}
