import { UIManager } from './UIManager.js';
import { GameState } from './GameState.js';
import { QuestionManager } from './QuestionManager.js';

/**
 * タイピングゲーム全体を制御するクラス
 * ゲームのロジックとイベントフローを管理する
 */
export class TypingGame {

    constructor() {
        // 各クラスのインスタンスを生成し、プロパティとして保持する
        this.ui = new UIManager();
        this.state = new GameState();

        // APIのエンドポイントを指定してQuestionManagerを生成
        this.questions = new QuestionManager('api/get_trivia.php');

        /**
         * スコア更新タイマーのInterval ID
         * @type {number | null}
         */
        this.scoreUpdateIntervalId = null;
    }

    /**
     * ゲームを開始する
     */
    start() {
        // UIのイベントリスナーをセットアップ
        this.ui.setupEventListeners(this);

        // メインのキー入力イベントリスナーをセットアップ
        window.addEventListener('keydown', (event) => this.handleKeyDown(event));

        // 1秒ごとにスコアを更新するタイマーを開始
        this.scoreUpdateIntervalId = setInterval(() => this.updateScore(), 1000);

        // 最初のお題を読み込む
        this.loadNextQuestion();
    }

    /**
     * キー入力イベントのメインハンドラ
     * @param {KeyboardEvent} event - キーボードイベント
     */
    handleKeyDown(event) {
        // タイピングロジックが初期化されていない場合は何もしない
        if (!this.state.typingText) return;

        // TypingTextライブラリの静的メソッドで、有効なキーか判定
        if (!TypingText.isValidInputKey(event.key)) return;

        // デフォルトのキー動作をキャンセル
        event.preventDefault();

        // 状態に入力を試み、結果をもらう
        const result = this.state.inputKey(event.key);
        const isCorrect = (result !== 'unmatch');

        // 状態にキーログを追加
        this.state.addKeyLog(isCorrect);

        // UIに効果音の再生を指示
        if (isCorrect) {
            this.ui.playSound('type');
        }

        // UIにお題の進捗を反映
        this.ui.updateTypingDisplay(this.state.typingText);

        // お題が完了した場合の処理
        if (result === 'complete') {
            this.handleQuestionComplete();
        }
    }

    /**
     * お題が完了した際に呼ばれる処理
     */
    handleQuestionComplete() {
        // UIに完了履歴の追加を指示
        this.ui.addHistoryItem(this.state.currentQuestionData);

        // UIに完了音の再生を指示
        this.ui.playSound('clear');

        // UIにフェードアウトアニメーションの開始を指示
        this.ui.fadeOutQuestion();

        // アニメーション終了後に次のお題を読み込む
        setTimeout(() => this.loadNextQuestion(), 500);
    }

    /**
     * 次のお題を読み込み、画面にセットする
     */
    async loadNextQuestion() {
        // 先行読み込みしておいたお題データを取得
        const questionData = await this.questions.getNextQuestion();

        if (questionData) {
            // 状態に新しいお題をセット
            this.state.setCurrentQuestion(questionData);

            // UIに新しいお題の表示を指示
            this.ui.setupNewQuestion(this.state.currentQuestionData, this.state.typingText);
        } else {
            // お題の取得に失敗した場合
            this.ui.displayErrorMessage('お題の取得に失敗しました。ページをリロードしてください。');
            // スコア更新タイマーを禁止
            if (this.scoreUpdateIntervalId) {
                clearInterval(this.scoreUpdateIntervalId);
            }
        }
    }

    /**
     * スコア更新(1秒ごとにsetIntervalで呼ばれる)
     */
    updateScore() {
        // 状態から最新のスコアを計算してもらう
        const { kps, accuracy } = this.state.calculateScore();

        // 状態にスコア履歴を追加
        this.state.addScoreHistory({ kps, accuracy });

        // UIにスコア表示の更新を指示
        this.ui.updateScoreDisplay(kps, accuracy);

        // UIにグラフの再描画を指示
        this.ui.renderCharts(this.state.scoreHistory);
    }

    /**
     * グラフ開閉アイコンがクリックされたときにUIManagerに呼ばれる
     */
    handleChartToggle() {
        // UIにスコアボードの開閉を指示
        this.ui.toggleScoreBoard();

        // UIにグラフの再描画を指示
        this.ui.renderCharts(this.state.scoreHistory);
    }
}