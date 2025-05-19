<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, X-Session-Token, Authorization");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

// Manejar la solicitud OPTIONS (preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    // Devolver una respuesta vacía (200 OK) para la solicitud preflight
    exit(0);
}

$host = "localhost";
$dbname = "peritajes";
$username = "root";
$password = "";

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Error de conexión: " . $e->getMessage()]);
    exit;
}


$input = json_decode(file_get_contents("php://input"), true);
$criterio = isset($input['criterio']) ? trim($input['criterio']) : '';

if (empty($criterio)) {
    echo json_encode(["resultados" => []]);
    exit;
}


try {
    $sql = "SELECT id_ingreso, causa_ruc_ingreso, estado_evidencia as estado FROM ingreso 
            WHERE id_ingreso = :criterio OR causa_ruc_ingreso LIKE :criterio_parcial";
    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(":criterio", $criterio);
    $criterioParcial = "%$criterio%";
    $stmt->bindParam(":criterio_parcial", $criterioParcial);
    $stmt->execute();

    $resultados = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(["resultados" => $resultados]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Error en la consulta: " . $e->getMessage()]);
}

//ME FALTA VER
//- QUE INGRESE Y MODIFIQUE LOS REGISTROS UPGRADE E INSERT
//- VERIFICAR LOS CODIGOS DE BUSCAR Y OBTENER