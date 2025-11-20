<?php
// セッションを開始
session_start();

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

try {
    // お題の総数を取得
    $count_stmt = $pdo->query("SELECT COUNT(*) FROM trivia");
    $total_count = (int)$count_stmt->fetchColumn();

    if ($total_count === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'お題が見つかりませんでした。']);
        exit;
    }

    // 履歴配列の最大長を計算
    $history_max_size = ceil($total_count / 2);

    // セッションから最近の出題IDリストを取得
    if (!isset($_SESSION['recent_trivia_ids']) || !is_array($_SESSION['recent_trivia_ids'])) {
        $_SESSION['recent_trivia_ids'] = [];
    }
    $recent_ids = $_SESSION['recent_trivia_ids'];

    // 履歴に含まれないお題のIDリストを取得
    $sql = "SELECT id FROM trivia";
    $params = [];
    if (!empty($recent_ids)) {
        $placeholders = implode(',', array_fill(0, count($recent_ids), '?'));
        $sql .= " WHERE id NOT IN ($placeholders)";
        $params = array_values($recent_ids);
    }
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $available_ids = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    if (empty($available_ids)) {
         http_response_code(500);
         echo json_encode(['error' => '利用可能なお題を取得できませんでした。データが少ない場合に発生する可能性があります。']);
         exit;
    }

    // 利用可能なIDからランダムに1つ選ぶ
    $random_key = array_rand($available_ids);
    $random_id = $available_ids[$random_key];

    // 選ばれたIDのお題を取得
    $stmt = $pdo->prepare("SELECT id, odai, yomi, source FROM trivia WHERE id = ?");
    $stmt->execute([$random_id]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);

    // 新しいIDを履歴に追加し、長さを調整
    $_SESSION['recent_trivia_ids'][] = $result['id'];
    while (count($_SESSION['recent_trivia_ids']) > $history_max_size) {
        array_shift($_SESSION['recent_trivia_ids']);
    }

    // 結果を返す
    echo json_encode($result);

} catch (PDOException $e) {
    http_response_code(500);
    header('Content-Type: application/json', true);
    echo json_encode([
        'error' => 'データの取得に失敗しました。',
        'details' => $e->getMessage()
    ]);
}
?>