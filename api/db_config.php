<?php
// Vercelの環境変数からデータベース接続文字列を取得
$db_url = getenv('POSTGRES_URL');

if ($db_url === false) {
    http_response_code(500);
    echo json_encode(['error' => 'データベース接続文字列が設定されていません。']);
    exit;
}

// 接続文字列をパースして各要素を取得
$db_parts = parse_url($db_url);

if ($db_parts === false || !isset($db_parts['host'])) {
    http_response_code(500);
    echo json_encode(['error' => 'データベース接続文字列のパースに失敗しました。無効なURLです。']);
    exit;
}

$db_host = $db_parts['host'];
// ポートが指定されていない場合はデフォルトの5432を使用する
$db_port = $db_parts['port'] ?? '5432';
$db_user = $db_parts['user'];
$db_pass = $db_parts['pass'];
$db_name = ltrim($db_parts['path'], '/');

// PostgreSQL用のDSNを構築
$dsn = "pgsql:host={$db_host};port={$db_port};dbname={$db_name};sslmode=require";
?>