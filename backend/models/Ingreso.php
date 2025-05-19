<?php
require_once 'config/database.php';

class Ingreso {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    public function consultarRegistros($params) {
        $conn = $this->db->getConnection();
        
        $sql = "SELECT
            orden_judicial AS nro_orden,
            id_ingreso AS id_forense,
            estado_evidencia,
            fecha_recepcion_ingreso AS fecha_recepcion,
            causa_ruc_ingreso AS causa_ruc,
            fiscalia_ingreso AS fiscalia,
            fecha_ip_ingreso AS fecha_ip,
            tribunal_garantia_ingreso AS tribunal_garantia,
            nue_ingreso AS nue
        FROM ingreso
        WHERE 1=1";

        $queryParams = [];
        $types = "";

        // Construir consulta con filtros
        if (!empty($params['fecha_desde']) && !empty($params['fecha_hasta'])) {
            $sql .= " AND fecha_recepcion_ingreso BETWEEN ? AND ?";
            $queryParams[] = $params['fecha_desde'];
            $queryParams[] = $params['fecha_hasta'];
            $types .= "ss";
        } elseif (!empty($params['fecha_desde'])) {
            $sql .= " AND fecha_recepcion_ingreso >= ?";
            $queryParams[] = $params['fecha_desde'];
            $types .= "s";
        } elseif (!empty($params['fecha_hasta'])) {
            $sql .= " AND fecha_recepcion_ingreso <= ?";
            $queryParams[] = $params['fecha_hasta'];
            $types .= "s";
        }

        if (!empty($params['anio'])) {
            $sql .= " AND YEAR(fecha_recepcion_ingreso) = ?";
            $queryParams[] = (int)$params['anio'];
            $types .= "i";
        }

        // Agregar filtros de búsqueda
        $searchFields = ['nue', 'ruc', 'fiscalia', 'estado_evidencia', 'marca', 'seccion'];
        foreach ($searchFields as $field) {
            if (!empty($params[$field])) {
                $sql .= " AND LOWER(" . $this->getFieldName($field) . ") LIKE ?";
                $queryParams[] = "%" . mb_strtolower(trim($params[$field]), 'UTF-8') . "%";
                $types .= "s";
            }
        }

        // Agregar paginación
        $offset = ($params['page'] - 1) * $params['limit'];
        $sql .= " ORDER BY id_ingreso DESC LIMIT ? OFFSET ?";
        $queryParams[] = $params['limit'];
        $queryParams[] = $offset;
        $types .= "ii";

        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            throw new Exception("Error al preparar consulta: " . $conn->error);
        }

        if (!empty($types)) {
            $stmt->bind_param($types, ...$queryParams);
        }

        if (!$stmt->execute()) {
            throw new Exception("Error al ejecutar consulta: " . $stmt->error);
        }

        $result = $stmt->get_result();
        $registros = $result->fetch_all(MYSQLI_ASSOC);

        // Obtener total de registros para paginación
        $totalSql = "SELECT COUNT(*) as total FROM ingreso WHERE 1=1";
        $totalStmt = $conn->prepare($totalSql);
        $totalStmt->execute();
        $total = $totalStmt->get_result()->fetch_assoc()['total'];

        $stmt->close();
        $totalStmt->close();

        return [
            'data' => $registros,
            'pagination' => [
                'total' => $total,
                'page' => $params['page'],
                'limit' => $params['limit'],
                'pages' => ceil($total / $params['limit'])
            ]
        ];
    }

    private function getFieldName($field) {
        $fieldMap = [
            'nue' => 'nue_ingreso',
            'ruc' => 'causa_ruc_ingreso',
            'fiscalia' => 'fiscalia_ingreso',
            'estado_evidencia' => 'estado_evidencia',
            'marca' => 'marca_ingreso',
            'seccion' => 'tribunal_garantia_ingreso'
        ];
        return $fieldMap[$field] ?? $field;
    }
} 