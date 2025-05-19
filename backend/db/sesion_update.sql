-- Archivo para actualizar tabla de sesiones
-- Primero verificamos si la tabla existe
CREATE TABLE IF NOT EXISTS sesion (
    id_sesion INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    fecha_inicio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado ENUM('activa', 'cerrada') NOT NULL DEFAULT 'activa',
    fecha_fin DATETIME NULL,
    ip VARCHAR(45) NULL,
    user_agent VARCHAR(255) NULL,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
);

-- Agregar índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_sesion_usuario ON sesion(id_usuario);
CREATE INDEX IF NOT EXISTS idx_sesion_estado ON sesion(estado); 