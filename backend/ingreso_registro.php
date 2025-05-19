<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') exit(0);

$mysqli = new mysqli("localhost", "root", "", "peritajes");
if ($mysqli->connect_error) {
    http_response_code(500);
    exit(json_encode(["success" => false, "message" => "Error de conexión."]));
}
$mysqli->set_charset("utf8mb4");

$input = file_get_contents("php://input");
$data = json_decode($input, true);

if (!is_array($data)) {
    http_response_code(400);
    exit(json_encode(["success" => false, "message" => "Datos no válidos."]));
}

function limpiar($v) {
    return isset($v) && $v !== '' ? $v : null;
}

$campos = [
    "oficio_remisor", "fecha_recepcion", "fecha_oficio", "ruc", "nue", "fiscalia",
    "fecha_instruccion_particular", "tribunal_garantia", "fecha_autorizacion_orden_judicial",
    "nombre_juez_autoriza", "fecha_parte", "nombre_perito", "grado_perito", "dia_plazo",
    "nro_informe_extraccion", "fecha_informe_extraccion", "orden_judicial", "prorroga",
    "tipo_solicitud", "estado_pericia", "marca", "modelo", "tipo_extraccion", "nro_telefono",
    "nro_informe_analisis", "resultado", "fecha_informe_analisis", "nro_parte",
    "cant_extracciones", "observaciones", "estado_evidencia", "cant_celular", "seccion",
    "region", "delito", "nombre_imputado", "cedula_identidad"
];

foreach ($campos as $campo) {
    $$campo = limpiar($data[$campo] ?? null);
}

$dia_plazo = is_numeric($dia_plazo) ? (int)$dia_plazo : null;
$cant_celular = is_numeric($cant_celular) ? (int)$cant_celular : null;
$cant_extracciones = is_numeric($cant_extracciones) ? (int)$cant_extracciones : null;

$cedula_num = null;
$dv = null;
if (preg_match('/^(\d+)-?([\dkK])$/', $cedula_identidad, $matches)) {
    $cedula_num = $matches[1];
    $dv = strtoupper($matches[2]);
} elseif (ctype_digit($cedula_identidad)) {
    $cedula_num = $cedula_identidad;
}

$mysqli->begin_transaction();

try {
    // region
    $id_region = null;
    if ($region) {
        $stmt = $mysqli->prepare("SELECT id_region FROM region WHERE nombre_region = ?");
        $stmt->bind_param("s", $region);
        $stmt->execute();
        $stmt->bind_result($id_region);
        if (!$stmt->fetch()) {
            $stmt->close();
            $stmt = $mysqli->prepare("INSERT INTO region (nombre_region) VALUES (?)");
            $stmt->bind_param("s", $region);
            $stmt->execute();
            $id_region = $stmt->insert_id;
        }
        $stmt->close();
    }

     $id_delito = null;
    if ($delito) {
        $stmt = $mysqli->prepare("SELECT id_delito FROM delito WHERE nombre_delito = ?");
        $stmt->bind_param("s", $delito);
        $stmt->execute();
        $stmt->bind_result($id_delito);
        if (!$stmt->fetch()) {
            $stmt->close();
            $stmt = $mysqli->prepare("INSERT INTO delito (nombre_delito, descripcion_delito) VALUES (?, ?)");
            $stmt->bind_param("ss", $delito, $delito);
            $stmt->execute();
            $id_delito = $stmt->insert_id;
        }
        $stmt->close();
    }

    $id_imputado = null;
    if ($nombre_imputado || $cedula_num) {
        $stmt = $mysqli->prepare("INSERT INTO imputado (nombre_imputado, cedula_identidad, dv) VALUES (?, ?, ?)");
        $stmt->bind_param("sss", $nombre_imputado, $cedula_num, $dv);
        $stmt->execute();
        $id_imputado = $stmt->insert_id;
        $stmt->close();
    }

    $sql = "INSERT INTO ingreso (
        oficio_remisor, fecha_recepcion_ingreso, fecha_oficio,
        causa_ruc_ingreso, nue_ingreso, fiscalia_ingreso, fecha_ip_ingreso,
        tribunal_garantia_ingreso, fecha_orden_judicial_ingreso, nombre_juez_ingreso,
        fecha_parte, nombre_perito_ingreso, grado_perito_ingreso, plazo_pericia_ingreso,
        nro_informe_extraccion, fecha_informe_extraccion, orden_judicial, prorroga,
        tipo_solicitud, estado_pericia, marca_ingreso, modelo_ingreso, tipo_extraccion,
        numero_telefono_ingreso, nro_informe_analisis, resultado, fecha_informe_analisis,
        nro_parte, cant_extracciones, observaciones, estado_evidencia, cant_celular, reg_ing
    ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW()
    )";

    $stmt = $mysqli->prepare($sql);
    $stmt->bind_param(
        "ssssssssssssissssssssssssssss",
        $oficio_remisor, $fecha_recepcion, $fecha_oficio, $ruc, $nue, $fiscalia,
        $fecha_instruccion_particular, $tribunal_garantia, $fecha_autorizacion_orden_judicial,
        $nombre_juez_autoriza, $fecha_parte, $nombre_perito, $grado_perito, $dia_plazo,
        $nro_informe_extraccion, $fecha_informe_extraccion, $orden_judicial, $prorroga,
        $tipo_solicitud, $estado_pericia, $marca, $modelo, $tipo_extraccion, $nro_telefono,
        $nro_informe_analisis, $resultado, $fecha_informe_analisis, $nro_parte,
        $cant_extracciones, $observaciones, $estado_evidencia, $cant_celular
    );
    $stmt->execute();
    $id_ingreso = $stmt->insert_id;
    $stmt->close();

    $stmt = $mysqli->prepare("INSERT INTO peritaje (
        id_ingreso, id_imputado, id_region, id_delito,
        seccion, cantidad_celular, observaciones, fec_ing
    ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())");

    $stmt->bind_param("iiiisss", $id_ingreso, $id_imputado, $id_region, $id_delito, $seccion, $cant_celular, $observaciones);
    $stmt->execute();
    $stmt->close();

    $mysqli->commit();
    echo json_encode(["success" => true, "message" => "Registro ingresado con éxito", "id_ingreso" => $id_ingreso]);

} catch (Exception $e) {
    $mysqli->rollback();
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
} finally {
    $mysqli->close();
}
?>
