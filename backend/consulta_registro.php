<?php
require_once 'config/database.php';
require_once 'models/Ingreso.php';
require_once 'controllers/IngresoController.php';

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Session-Token, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(204);
    exit();
}

$headers = getallheaders();
// Aceptar tanto Authorization como X-Session-Token
$token = isset($headers['X-Session-Token']) ? $headers['X-Session-Token'] : 
        (isset($headers['Authorization']) ? $headers['Authorization'] : '');

if (empty($token)) {
    http_response_code(401);
    echo json_encode(["message" => "No autorizado - Token no proporcionado"]);
    exit();
}

try {
    $controller = new IngresoController();
    
       $params = [
        'nue' => filter_input(INPUT_GET, 'nue', FILTER_DEFAULT),
        'ruc' => filter_input(INPUT_GET, 'ruc', FILTER_DEFAULT),
        'fiscalia' => filter_input(INPUT_GET, 'fiscalia', FILTER_DEFAULT),
        'estado_evidencia' => filter_input(INPUT_GET, 'estado_evidencia', FILTER_DEFAULT),
        'fecha_desde' => filter_input(INPUT_GET, 'fecha_desde', FILTER_DEFAULT),
        'fecha_hasta' => filter_input(INPUT_GET, 'fecha_hasta', FILTER_DEFAULT),
        'anio' => filter_input(INPUT_GET, 'anio', FILTER_DEFAULT),
        'marca' => filter_input(INPUT_GET, 'marca', FILTER_DEFAULT),
        'seccion' => filter_input(INPUT_GET, 'seccion', FILTER_DEFAULT),
        'page' => filter_input(INPUT_GET, 'page', FILTER_VALIDATE_INT) ?: 1,
        'limit' => filter_input(INPUT_GET, 'limit', FILTER_VALIDATE_INT) ?: 50
    ];

    $userRole = $controller->validateToken($token);
    if (!$controller->hasPermission($userRole, 'consulta')) {
        http_response_code(403);
        echo json_encode(["message" => "No tiene permisos para realizar esta acción"]);
        exit();
    }

       $result = $controller->consultarRegistros($params);
    
      $controller->logConsulta($params, $userRole);
    
    http_response_code(200);
    echo json_encode($result);

} catch (Exception $e) {
   
    error_log("Error en consulta_registro.php: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        "message" => "Error interno del servidor",
        "error" => $e->getMessage()
    ]);
}
