<?php
header('Content-Type: application/json');

$conexion = new mysqli("localhost", "root", "", "peritajes");

if ($conexion->connect_error) {
    die(json_encode(["success" => false, "message" => "Error en la conexión a la base de datos."]));
}

$usuario = $_GET['usuario'] ?? '';

if (empty($usuario)) {
    echo json_encode(["success" => false, "message" => "Debe proporcionar un nombre de usuario."]);
    exit;
}

$query = $conexion->prepare("SELECT id_usuario FROM usuario WHERE nombres_usuario = ?");
$query->bind_param("s", $usuario);
$query->execute();
$query->bind_result($id_usuario);
$query->fetch();
$query->close();

if (!empty($id_usuario)) {
    echo json_encode(["success" => true, "id_usuario" => $id_usuario]);
} else {
    echo json_encode(["success" => false, "message" => "Usuario no encontrado."]);
}


$conexion->close();
?>

