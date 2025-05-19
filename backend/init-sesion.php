<?php
// Script para inicializar la tabla de sesiones

// Configuración de conexión
$host = "localhost";
$user = "root";
$password = "";
$database = "peritajes";

// Conectar a la base de datos
$conn = new mysqli($host, $user, $password, $database);

// Verificar conexión
if ($conn->connect_error) {
    die("Error de conexión: " . $conn->connect_error);
}

echo "Conectado a la base de datos correctamente.\n";

// Crear tabla si no existe
$tablaSQL = "
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
";

if ($conn->query($tablaSQL) === TRUE) {
    echo "Tabla 'sesion' creada o ya existente.\n";
} else {
    echo "Error al crear la tabla: " . $conn->error . "\n";
}

// Crear índices
$indiceSQL1 = "CREATE INDEX IF NOT EXISTS idx_sesion_usuario ON sesion(id_usuario);";
$indiceSQL2 = "CREATE INDEX IF NOT EXISTS idx_sesion_estado ON sesion(estado);";

if ($conn->query($indiceSQL1) === TRUE) {
    echo "Índice de usuario creado o ya existente.\n";
} else {
    echo "Error al crear índice de usuario: " . $conn->error . "\n";
}

if ($conn->query($indiceSQL2) === TRUE) {
    echo "Índice de estado creado o ya existente.\n";
} else {
    echo "Error al crear índice de estado: " . $conn->error . "\n";
}

// Cerrar sesiones antiguas
$cerrarSesionesSQL = "UPDATE sesion SET estado = 'cerrada', fecha_fin = NOW() 
                      WHERE estado = 'activa' AND fecha_inicio < DATE_SUB(NOW(), INTERVAL 24 HOUR);";

if ($conn->query($cerrarSesionesSQL) === TRUE) {
    $sesiones_cerradas = $conn->affected_rows;
    echo "Se cerraron $sesiones_cerradas sesiones antiguas.\n";
} else {
    echo "Error al cerrar sesiones antiguas: " . $conn->error . "\n";
}

$conn->close();
echo "Operación completada.";
?> 