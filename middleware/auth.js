const mysql = require("mysql2/promise");

// Middleware para validar la autenticación
const verificarSesion = async (req, res, next) => {
  // Obtener token de sesión del encabezado
  const sessionToken = req.headers['x-session-token'];
  
  if (!sessionToken) {
    return res.status(401).json({
      success: false,
      message: "No ha iniciado sesión",
      redirect: true
    });
  }

  // Conexión a la base de datos
  try {
    const connection = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "",
      database: "peritajes",
      port: 3306
    });

    // Verificar si la sesión existe y está activa
    const [rows] = await connection.execute(
      'SELECT s.id_sesion, s.id_usuario, s.estado, u.id_perfil, u.nombres_usuario ' +
      'FROM sesion s ' +
      'JOIN usuario u ON s.id_usuario = u.id_usuario ' +
      'WHERE s.id_sesion = ? AND s.estado = "activa"',
      [sessionToken]
    );

    await connection.end();

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Sesión no válida o expirada",
        redirect: true
      });
    }

    // Añadir datos de usuario a la request para uso posterior
    req.usuario = {
      id_usuario: rows[0].id_usuario,
      id_perfil: rows[0].id_perfil,
      nombres_usuario: rows[0].nombres_usuario,
      id_sesion: rows[0].id_sesion
    };

    // Continuar con la siguiente función
    next();
  } catch (error) {
    console.error("Error al verificar sesión:", error);
    return res.status(500).json({
      success: false,
      message: "Error al verificar la sesión"
    });
  }
};

module.exports = { verificarSesion }; 