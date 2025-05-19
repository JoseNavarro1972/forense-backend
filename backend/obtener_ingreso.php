<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

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

if (!isset($_GET['id_ingreso'])) {
    http_response_code(400);
    echo json_encode(["error" => "Falta el parámetro id_ingreso"]);
    exit;
}

$id_ingreso = intval($_GET['id_ingreso']);

try {
    $sql = "SELECT 
        id_ingreso,
        oficio_remisor,
        fecha_recepcion_ingreso AS fecha_recepcion,
        fecha_oficio,
        causa_ruc_ingreso AS ruc,
        nue_ingreso AS nue,
        fiscalia_ingreso AS fiscalia,
        fecha_ip_ingreso AS fecha_instruccion_particular,
        tribunal_garantia_ingreso AS tribunal_garantia,
        fecha_orden_judicial_ingreso AS fecha_autorizacion_orden_judicial,
        nombre_juez_ingreso AS nombre_juez_autoriza,
        fecha_parte,
        nombre_perito_ingreso AS nombre_perito,
        grado_perito_ingreso AS grado_perito,
        plazo_pericia_ingreso AS dia_plazo,
        nro_informe_extraccion,
        fecha_informe_extraccion,
        orden_judicial,
        prorroga,
        tipo_solicitud,
        estado_pericia AS estado_evidencia,
        marca_ingreso AS marca,
        modelo_ingreso AS modelo,
        tipo_extraccion,
        numero_telefono_ingreso AS nro_telefono,
        nro_informe_analisis,
        resultado,
        fecha_informe_analisis,
        nro_parte,
        cant_extracciones,
        observaciones,
        reg_ing,
        cant_celular
    FROM ingreso
    WHERE id_ingreso = :id_ingreso";

    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':id_ingreso', $id_ingreso, PDO::PARAM_INT);
    $stmt->execute();

    $registro = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($registro) {
        echo json_encode($registro);
    } else {
        http_response_code(404);
        echo json_encode(["error" => "Registro no encontrado"]);
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Error al consultar: " . $e->getMessage()]);
}
