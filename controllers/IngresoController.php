<?php
require_once 'models/Ingreso.php';

class IngresoController {
    private $model;
    private $logFile;

    public function __construct() {
        $this->model = new Ingreso();
        $this->logFile = __DIR__ . "/../logs/consulta.log";
    }

    public function validateToken($token) {
        // TODO: Implementar validación real del token
        // Por ahora retornamos un rol de prueba
        return 'admin';
    }

    public function hasPermission($role, $action) {
        $permissions = [
            'admin' => ['consulta', 'registro', 'modificacion', 'eliminacion'],
            'perito' => ['consulta', 'registro'],
            'jefatura' => ['consulta']
        ];
        
        return isset($permissions[$role]) && in_array($action, $permissions[$role]);
    }

    public function consultarRegistros($params) {
        try {
            return $this->model->consultarRegistros($params);
        } catch (Exception $e) {
            $this->logError($e->getMessage());
            throw $e;
        }
    }

    public function logConsulta($params, $userRole) {
        $logEntry = date('Y-m-d H:i:s') . " - Usuario: $userRole - Consulta realizada con parámetros: " . 
                   json_encode($params) . "\n";
        
        if (!is_dir(dirname($this->logFile))) {
            mkdir(dirname($this->logFile), 0777, true);
        }
        
        file_put_contents($this->logFile, $logEntry, FILE_APPEND);
    }

    private function logError($error) {
        $logEntry = date('Y-m-d H:i:s') . " - Error: $error\n";
        
        if (!is_dir(dirname($this->logFile))) {
            mkdir(dirname($this->logFile), 0777, true);
        }
        
        file_put_contents($this->logFile, $logEntry, FILE_APPEND);
    }
} 