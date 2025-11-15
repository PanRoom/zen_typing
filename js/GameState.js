/** ゲームの状態を管理するクラス
 * キーログ、スコア、現在のお題とタイピング進捗を保持する
 */
export class GameState {

    // スコア計算の担当とする時間(ミリ秒)
    SCORE_CALCULATION_WINDOW_MS = 60000; // 1分

    // 保持するスコア履歴の最大数
    MAX_SCORE_HISTORY = 300; // 300件 (約5相当)

    constructor() {
        /** 
         * キー入力のログ
         * @type {Array<{time: number, correct: boolean}>}
         */
        this.keyLogs = [];
        
        /**
         * スコア履歴
         * @type {Array<{kps: number, accuracy: number}>}
         */
        this.scoreHistory = [];

        /**
         * 現在のお題の生データ
         * @type {object | null}
         */
        this.currentQuestionData = null;

        /**
         * 現在のお題のタイピングロジック
         * @type {TypingLogic | null}
         */
        this.typingText = null;
    }

    /** 
     * 新しいお題データをセットし、TypingTextインスタンスを生成する
     * @param {object} questionData - APIから取得したお題データ
     */
    setCurrentQuestion(questionData) {
        this.currentQuestionData = questionData;
        // TypingTextクラスを使ってインスタンス化
        this.typingText = new TypingText(questionData.yomi);
    }

    /**
     * キー入力をTypingTextインスタンスに渡し、結果を返す
     * @param {string} key - 入力されたキー
     * @returns {'match' | 'unmatch' | 'complete' | 'null'} - TypingTextの処理結果
     */
    inputKey(key) {
        if (!this.typingText) return 'null';

        return this.typingText.inputKey(key);
    }

    /**
     * キー入力ログを追加する
     * @param {boolean} isCorrect - 入力が正解かどうか
     */
    addKeyLog(isCorrect) {
        const now = Date.now();
        this.keyLogs.push({ time: now, correct: isCorrect });

        // 古いログを削除
        const cutoffTime = now - this.SCORE_CALCULATION_WINDOW_MS;
        this.keyLogs = this.keyLogs.filter(log => log.time > cutoffTime);
    }

    /** 
     * スコアの履歴を追加する
     * @param {{kps: number, accuracy: number}} score - 計算されたオブジェクト
     */
    addScoreHistory(score) {
        this.scoreHistory.push(score);

        // 履歴が最大数を超えたら古いものを削除
        if (this.scoreHistory.length > this.MAX_SCORE_HISTORY) {
            this.scoreHistory.shift(); //配列の先頭から削除
        }
    }

    /**
     * 現在のキーログを元に、スコアを計算する
     * @returns {{kps: number, accuracy: number}} - 計算されたスコアオブジェクト
     */
    calculateScore() {
        // このメソッドはTypingGameから1秒ごとに呼び出される想定
       
        // ログが1件もない場合は 0
        if (this.keyLogs.length === 0) {
            return { kps: 0, accuracy: 100.0 };
        }
        
        const totalStrokes = this.keyLogs.length;
        const correctStrokes = this.keyLogs.filter(log => log.correct).length;

        // KPS (Keys Per Second)
        // 1分間のキー入力数を60で割る
        const kps = totalStrokes / (this.SCORE_CALCULATION_WINDOW_MS / 1000);

        // 正確率
        const accuracy = totalStrokes > 0 ? (correctStrokes / totalStrokes) * 100 : 100.0;

        return { kps: kps, accuracy: accuracy};
    }
}