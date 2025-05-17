<?php
header('Content-Type: application/json');

$conexion = new mysqli("localhost", "root", "", "peritajes");

if ($conexion->connect_error) {
    die(json_encode(["success" => false, "message" => "Error en la conexión a la base de datos."]));
}

$data = json_decode(file_get_contents("php://input"), true);
$id_usuario = $data['id_usuario'] ?? '';

if (empty($id_usuario) || !is_numeric($id_usuario)) {
    echo json_encode(["success" => false, "message" => "Debe proporcionar un ID de usuario válido."]);
    exit;
}

$query = $conexion->prepare("DELETE FROM usuario WHERE id_usuario = ?");
$query->bind_param("i", $id_usuario);

if ($query->execute()) {
    if ($query->affected_rows > 0) {
        echo json_encode(["success" => true, "message" => "Usuario eliminado con éxito."]);
    } else {
        echo json_encode(["success" => false, "message" => "No se encontró el usuario con ese ID."]);
    }
} else {
    echo json_encode(["success" => false, "message" => "Error al eliminar usuario."]);
}

$query->close();
$conexion->close();
?>
