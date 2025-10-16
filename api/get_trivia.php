<?php
// キャッシュさせないためのヘッダー
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: -1');

echo "Debug: get_trivia.php start<br>";

// 設定ファイルを読み込む
require_once __DIR__ . '/db_config.php';

echo "Debug: db_config.php included<br>";

try {
    echo "Debug: Trying to connect to DB<br>";
    // PostgreSQLに接続
    $pdo = new PDO($dsn, $db_user, $db_pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "Debug: DB connection successful<br>";

} catch (PDOException $e) {
    // このエラーはJSONで返す
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode(['error' => 'データベースに接続できませんでした。', 'details' => $e->getMessage()]);
    exit;
}

header('Content-Type: application/json');

try {
    // ステップ1: お題の総件数を取得する
    $count_stmt = $pdo->query("SELECT COUNT(*) FROM trivia");
    $total_rows = $count_stmt->fetchColumn();

    if ($total_rows > 0) {
        // ステップ2: ランダムなオフセット（取得開始位置）を決定する
        $random_offset = rand(0, $total_rows - 1);

        // ステップ3: 決定したオフセットから1件だけデータを取得する
        // プリペアードステートメントを使って安全にクエリを実行
        $stmt = $pdo->prepare("SELECT odai, yomi, source FROM trivia LIMIT 1 OFFSET :offset");
        $stmt->bindValue(':offset', $random_offset, PDO::PARAM_INT);
        $stmt->execute();
        
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        echo json_encode($result);

    } else {
        // テーブルにデータが1件もなかった場合
        http_response_code(404);
        echo json_encode(['error' => 'お題が見つかりませんでした。']);
    }

} catch (PDOException $e) {
    // SQLの実行エラー
    http_response_code(500);
    header('Content-Type: application/json', true); 
    echo json_encode(['error' => 'データの取得に失敗しました。', 'details' => $e->getMessage()]);
}

?>