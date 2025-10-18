<?php
// クライアントにキャッシュさせないためのHTTPヘッダーを設定
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: -1');

// データベース設定ファイルを読み込む
require_once __DIR__ . '/db_config.php';

// データベースへ接続
try {
    $pdo = new PDO($dsn, $db_user, $db_pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode(['error' => 'データベースに接続できませんでした。', 'details' => $e->getMessage()]);
    exit;
}

// レスポンスの形式をJSONに設定
header('Content-Type: application/json');

// ランダムにお題を1件取得して返す
try {
    // 1. お題の総件数を取得
    $count_stmt = $pdo->query("SELECT COUNT(*) FROM trivia");
    $total_rows = $count_stmt->fetchColumn();

    if ($total_rows > 0) {
        // 2. 0から (総件数-1) までのランダムなオフセットを生成
        $random_offset = rand(0, $total_rows - 1);

        // 3. 生成したオフセットから1件のお題を取得
        $stmt = $pdo->prepare("SELECT odai, yomi, source FROM trivia LIMIT 1 OFFSET :offset");
        $stmt->bindValue(':offset', $random_offset, PDO::PARAM_INT);
        $stmt->execute();
        
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        echo json_encode($result);

    } else {
        // テーブルにデータが存在しない場合
        http_response_code(404);
        echo json_encode(['error' => 'お題が見つかりませんでした。']);
    }

} catch (PDOException $e) {
    // SQL実行中にエラーが発生した場合
    http_response_code(500);
    header('Content-Type: application/json', true); 
    echo json_encode(['error' => 'データの取得に失敗しました。', 'details' => $e->getMessage()]);
}
?>