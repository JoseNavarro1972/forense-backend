<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit();
}

$input = file_get_contents("php://input");
$data = json_decode($input, true);

if (!$data) {
    echo json_encode(["mensaje" => "❌ No se recibieron datos"]);
    exit();
}

$usuario = $data["usuario"] ?? "";
$clave = $data["clave"] ?? "";
$rol = $data["rol"] ?? "";

if (empty($usuario) || empty($clave) || empty($rol)) {
    echo json_encode(["mensaje" => "❌ Todos los campos son obligatorios"]);
    exit();
}

$conn = new mysqli("localhost", "root", "", "peritajes");

if ($conn->connect_error) {
    die(json_encode(["mensaje" => "❌ Error de conexión a la base de datos"]));
}

$clave_hash = password_hash($clave, PASSWORD_DEFAULT);

$id_perfil = ($rol === "admin") ? 1 : 2;

$sql = "INSERT INTO usuario (id_perfil, nombres_usuario, clave_usuario, grado_usuario, fec_ing, estado) VALUES (?, ?, ?, ?, NOW(), 1)";
$stmt = $conn->prepare($sql);
$stmt->bind_param("isss", $id_perfil, $usuario, $clave_hash, $rol);

if ($stmt->execute()) {
    echo json_encode(["mensaje" => "Usuario creado con éxito"]);
} else {
    echo json_encode(["mensaje" => "Error al crear usuario"]);
}

$stmt->close();
$conn->close();
?>
