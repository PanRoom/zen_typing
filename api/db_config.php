<?php
/**
 * Vercel環境にデプロイされたPostgreSQLデータベースへの接続設定を行います。
 * 接続情報はVercelプロジェクトの環境変数 `POSTGRES_URL` から自動的に取得されます。
 */

// Vercelの環境変数からデータベース接続文字列を取得
$db_url = getenv('POSTGRES_URL');

// 環境変数が設定されていない場合はエラー
if ($db_url === false) {
    http_response_code(500);
    echo json_encode(['error' => 'データベース接続文字列(POSTGRES_URL)が設定されていません。']);
    exit;
}

// 接続文字列をパースして、ホスト、ポート、ユーザー名、パスワード、DB名を取得
$db_parts = parse_url($db_url);

if ($db_parts === false || !isset($db_parts['host'])) {
    http_response_code(500);
    echo json_encode(['error' => 'データベース接続文字列のパースに失敗しました。']);
    exit;
}

$db_host = $db_parts['host'];
$db_port = $db_parts['port'] ?? '5432'; // ポートがなければデフォルトの5432
$db_user = $db_parts['user'];
$db_pass = $db_parts['pass'];
$db_name = ltrim($db_parts['path'], '/');

// PDO用のDSN (Data Source Name) を構築
// VercelのPostgreSQLはSSL接続が必須のため `sslmode=require` を指定
$dsn = "pgsql:host={$db_host};port={$db_port};dbname={$db_name};sslmode=require";
?>