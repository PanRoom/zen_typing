<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

echo "Debug: db_config.php start<br>";

// Vercelの環境変数からデータベース接続文字列を取得
$db_url = getenv('POSTGRES_URL');

echo "Debug: POSTGRES_URL value:<br>";
var_dump($db_url);
echo "<br>";

if ($db_url === false) {
    http_response_code(500);
    echo json_encode(['error' => 'データベース接続文字列が設定されていません。']);
    exit;
}

// 接続文字列をパースして各要素を取得
$db_parts = parse_url($db_url);

echo "Debug: parse_url result:<br>";
var_dump($db_parts);
echo "<br>";

if ($db_parts === false || !isset($db_parts['host'])) {
    http_response_code(500);
    echo json_encode(['error' => 'データベース接続文字列のパースに失敗しました。無効なURLです。']);
    exit;
}


$db_host = $db_parts['host'];
$db_port = $db_parts['port'];
$db_user = $db_parts['user'];
$db_pass = $db_parts['pass'];
$db_name = ltrim($db_parts['path'], '/');

// PostgreSQL用のDSNを構築
$dsn = "pgsql:host={$db_host};port={$db_port};dbname={$db_name};sslmode=require";

echo "Debug: DSN created: " . $dsn . "<br>";
echo "Debug: db_config.php end<br>";
?>