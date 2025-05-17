<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit();
}

// Conexión a la base de datos
$conexion = new mysqli("localhost", "root", "", "peritajes");

if ($conexion->connect_error) {
    die(json_encode(["success" => false, "message" => " Error en la conexión a la base de datos."]));
}

// Recibir  en formato JSON
$data = json_decode(file_get_contents("php://input"), true);
$usuario = trim($data['usuario'] ?? '');
$clave = $data['clave'] ?? '';

if (empty($usuario) || empty($clave)) {
    echo json_encode(["success" => false, "message" => "Usuario y contraseña son obligatorios."]);
    exit;
}

$query = $conexion->prepare("SELECT id_usuario, clave_usuario, id_perfil FROM usuario WHERE LOWER(TRIM(nombres_usuario)) = LOWER(TRIM(?))");
$query->bind_param("s", $usuario);
$query->execute();
$query->bind_result($id_usuario, $clave_hasheada, $id_perfil);
$query->fetch();
$query->close();

if (!$id_usuario) {
    echo json_encode(["success" => false, "message" => " Usuario no encontrado."]);
    exit;
}


if (password_verify($clave, $clave_hasheada)) {
    // Redirigir según el perfil del usuario
    $redirect_url = ($id_perfil == 1) ? "/menu-administrador" : "/menu-usuario";

    echo json_encode([
        "success" => true,
        "message" => " Login exitoso.",
        "redirect" => $redirect_url,
        "usuario" => [
            "id" => $id_usuario,
            "nombre" => $usuario,
            "id_perfil" => $id_perfil
        ]
    ]);
} else {
    echo json_encode(["success" => false, "message" => "❌ Contraseña incorrecta."]);
}

$conexion->close();
?>
