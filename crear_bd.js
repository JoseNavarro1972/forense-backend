const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  port: 3306
});

connection.connect((err) => {
  if (err) {
    console.error(' Error al conectar a MySQL:', err);
    process.exit(1);
  }
  
  console.log('✅ Conectado a MySQL correctamente');
  

  connection.query('CREATE DATABASE IF NOT EXISTS peritajes', (err) => {
    if (err) {
      console.error(' Error al crear la base de datos peritajes:', err);
      connection.end();
      process.exit(1);
    }
    
    console.log('✅ Base de datos "peritajes" creada o verificada correctamente');
    
       connection.query('USE peritajes', (err) => {
      if (err) {
        console.error(' Error al seleccionar la base de datos peritajes:', err);
        connection.end();
        process.exit(1);
      }
      
          const createTableScripts = [
        // Tabla usuario
        `CREATE TABLE IF NOT EXISTS usuario (
          id_usuario INT AUTO_INCREMENT PRIMARY KEY,
          id_perfil INT NOT NULL,
          nombres_usuario VARCHAR(255) NOT NULL,
          clave_usuario VARCHAR(255) NOT NULL,
          grado_usuario VARCHAR(50),
          fec_ing DATETIME DEFAULT CURRENT_TIMESTAMP,
          estado TINYINT DEFAULT 1
        )`,
        
               `CREATE TABLE IF NOT EXISTS tipo_extraccion (
          id_extraccion INT AUTO_INCREMENT PRIMARY KEY,
          descripcion VARCHAR(100) NOT NULL
        )`,
        
       
        `CREATE TABLE IF NOT EXISTS delito (
          id_delito INT AUTO_INCREMENT PRIMARY KEY,
          tipo_delito VARCHAR(100) NOT NULL
        )`,
        
      
        `CREATE TABLE IF NOT EXISTS cantidad_telefonos (
          id_cantidad INT AUTO_INCREMENT PRIMARY KEY,
          cantidad_telefonos INT
        )`,
        
       
        `CREATE TABLE IF NOT EXISTS perito (
          id_perito INT AUTO_INCREMENT PRIMARY KEY,
          nombre VARCHAR(100) NOT NULL,
          especialidad VARCHAR(100)
        )`,
        
               `CREATE TABLE IF NOT EXISTS ingreso (
          id_ingreso INT AUTO_INCREMENT PRIMARY KEY,
          id_usuario INT NOT NULL,
          id_extraccion INT NOT NULL,
          id_delito INT NOT NULL,
          id_cantidad INT,
          fecha_recepcion_ingreso DATE NOT NULL,
          causa_ruc_ingreso VARCHAR(50) NOT NULL,
          nue_ingreso VARCHAR(50) NOT NULL UNIQUE,
          nombre_perito_ingreso VARCHAR(100) NOT NULL,
          marca_ingreso VARCHAR(50),
          modelo_ingreso VARCHAR(50),
          estado_evidencia VARCHAR(20) NOT NULL DEFAULT 'pendiente',
          reg_ing DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario),
          FOREIGN KEY (id_extraccion) REFERENCES tipo_extraccion(id_extraccion),
          FOREIGN KEY (id_delito) REFERENCES delito(id_delito),
          FOREIGN KEY (id_cantidad) REFERENCES cantidad_telefonos(id_cantidad)
        )`
      ];
      
      let tablesCreated = 0;
      createTableScripts.forEach((script, index) => {
        connection.query(script, (err) => {
          if (err) {
            console.error(`Error al crear la tabla #${index + 1}:`, err);
          } else {
            tablesCreated++;
            console.log(`Tabla #${index + 1} creada o verificada correctamente`);
            
            if (tablesCreated === createTableScripts.length) {
              connection.end();
              console.log('🔌 Conexión cerrada');
            }
          }
        });
      });
    });
  });
}); 