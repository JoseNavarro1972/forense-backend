<?php
class Database {
    private static $instance = null;
    private $conn;

    private function __construct() {
        $host = "localhost";
        $db_user = "root";
        $db_pass = "";
        $db_name = "peritajes";

        $this->conn = new mysqli($host, $db_user, $db_pass, $db_name);
        $this->conn->set_charset("utf8mb4");

        if ($this->conn->connect_error) {
            throw new Exception("Error de conexión a la base de datos: " . $this->conn->connect_error);
        }
    }

    public static function getInstance() {
        if (self::$instance == null) {
            self::$instance = new Database();
        }
        return self::$instance;
    }

    public function getConnection() {
        return $this->conn;
    }

    public function closeConnection() {
        if ($this->conn) {
            $this->conn->close();
        }
    }
} 