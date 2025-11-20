/**
 * UIの管理を担当するクラス。
 * DOM要素の参照、描画更新、UIイベントのセットアップを行う。
 */
export class UIManager {

    GRAPH_WINDOW_SECONDS = 60; // グラフに表示する時間範囲（秒）

    constructor() {
        // お題
        this.odaiTextElement = document.getElementById('odai-text');
        this.furiganaTextElement = document.getElementById('furigana-text');
        this.romanTextElement = document.getElementById('roman-text');
        this.triviaSourceElement = document.getElementById('trivia-source');

        // スコア
        this.kpsValueElement = document.getElementById('kps-value');
        this.accuracyValueElement = document.getElementById('accuracy-value');
        this.scoreBoard = document.getElementById('score-board');
        this.chartIcon = document.getElementById('chart-icon');
        
        // 履歴
        this.gameContainer = document.getElementById('game-container');
        this.historyContainer = document.getElementById('history-container');
        this.historyList = document.getElementById('history-list');
        this.scrollDownBtn = document.getElementById('scroll-down-btn');
        this.toggleHistoryBtn = document.getElementById('toggle-history-btn');

        // グラフ
        this.kpsChartCanvas = document.getElementById('kps-chart');
        this.accuracyChartCanvas = document.getElementById('accuracy-chart');
        
        // 効果音の取得
        this.sounds = {
            type: document.getElementById('type-sound'),
            clear: document.getElementById('clear-sound')
        };

        // グラフインスタンス
        this.kpsChart = null;
        this.accuracyChart = null;
    }
    /**
     * UI関連のイベントリスナーをセットアップする
     * @param {TypingGame} gameController - イベントを通知する先のゲームコントローラー
     */
    setupEventListeners(gameController) {
        // グラフ表示エリアの開閉イベント
        this.chartIcon.addEventListener('click', () => {
            gameController.handleChartToggle();
        });

        // 履歴リストのスクロールイベント（「下へ」ボタンの表示制御）
        this.historyList.addEventListener('scroll', () => {
            this._updateScrollDownButtonVisibility();
        });

        // 「下へ」ボタンのクリックイベント
        this.scrollDownBtn.addEventListener('click', () => {
            this.historyList.scrollTo({ top: this.historyList.scrollHeight, behavior: 'smooth' });
        });

        // 履歴表示エリアの開閉イベント
        this.toggleHistoryBtn.addEventListener('click', () => {
            this.historyContainer.classList.toggle('hidden');
            this.gameContainer.classList.toggle('with-history');
        });
    }

    /**
     * タイピングの進捗状況を画面に反映する
     * @param {TypingText} typingText - 現在のタイピングテキストオブジェクト
     */
    updateTypingDisplay(typingText) {
        if (!typingText) return;
        this.furiganaTextElement.innerHTML = `<span class="completed">${typingText.completedText}</span><span class="remaining">${typingText.remainingText}</span>`;
        this.romanTextElement.innerHTML = `<span class="completed">${typingText.completedRoman}</span><span class="remaining">${typingText.remainingRoman}</span>`;
    }

    /**
     * 新しいお題を画面にセットアップする
     * @param {object} questionData - 表示するお題のデータ
     * @param {TypingText} typingText - 新しいお題のTypingTextインスタンス
     */
    setupNewQuestion(questionData, typingText) {
        if (!questionData) return;

        // テキストを設定
        this.odaiTextElement.textContent = questionData.odai;
        this.updateTypingDisplay(typingText); // ふりがなとローマ字を設定

        // 出典情報があればリンクを表示
        if (questionData.source && questionData.source.startsWith('http')) {
            this.triviaSourceElement.href = questionData.source;
            this.triviaSourceElement.textContent = '出典: Wikipedia';
            this.triviaSourceElement.style.display = 'inline';
        } else {
            this.triviaSourceElement.style.display = 'none';
        }

        // フェードインアニメーションのためにクラスをリセット
        this.odaiTextElement.classList.remove('fade-out');
        this.furiganaTextElement.classList.remove('fade-out');
        this.romanTextElement.classList.remove('fade-out');
        this.triviaSourceElement.classList.remove('fade-out');
    }

    /**
     * お題取得失敗などのエラーメッセージを表示する
     * @param {string} message - 表示するエラーメッセージ
     */
    displayErrorMessage(message) {
        this.odaiTextElement.textContent = message;
        this.furiganaTextElement.innerHTML = '';
        this.romanTextElement.innerHTML = '';
        this.triviaSourceElement.style.display = 'none';
    }

    /**
     * スコアの表示を更新する
     * @param {string} kps - 現在のKPS（キー入力速度）
     * @param {string} accuracy - 現在の正確率
     */
    updateScoreDisplay(kps, accuracy) {
        this.kpsValueElement.textContent = kps;
        this.accuracyValueElement.textContent = `${accuracy}%`;
    }

    /**
     * 完了したお題を履歴に追加する
     * @param {object} questionData - 完了したお題のデータ
     */
    addHistoryItem(questionData) {
        if (!questionData) return;

        // スクロールが一番下にあるか判定
        const isSclolledToBottom = (this.historyList.scrollHeight - this.historyList.scrollTop - this.historyList.clientHeight < 1);

        const item = document.createElement('div');
        item.className = 'history-item';

        const odai = document.createElement('div');
        odai.className = 'odai';
        odai.textContent = questionData.odai;

        const sourceLink = document.createElement('a');
        sourceLink.className = 'source';
        sourceLink.href = questionData.source;
        sourceLink.textContent = '出典: Wikipedia';
        sourceLink.target = '_blank';
        sourceLink.rel = 'noopener noreferrer';

        // 要素をitemに追加
        item.appendChild(odai);
        item.appendChild(sourceLink);

        // itemをhistoryListに追加
        this.historyList.appendChild(item);

        // 履歴追加前に一番下までスクロールされていたら、追加後も一番下にスクロールする
        if (isSclolledToBottom) {
            this.historyList.scrollTop = this.historyList.scrollHeight;
        }
    }

    /**
     * Chart.jsを使ってスコアの遷移グラフを描画する
     * @param {Array<object>} scoreHistory - スコアの履歴データ({ kps, accuracy }の配列)
     */
    renderCharts(scoreHistory) {
        // グラフエリアが開いていない場合は描画しない（負荷軽減）
        if (!this.scoreBoard.classList.contains('expanded')) return;

        // 既存のチャートがあれば破壊
        if (this.kpsChart) {
            this.kpsChart.destroy();
        }
        if (this.accuracyChart) {
            this.accuracyChart.destroy();
        }

        const chartData = scoreHistory.slice(-this.GRAPH_WINDOW_SECONDS);
        const labels = Array.from({ length: chartData.length }, (_, i) => i + 1);
        const kpsData = chartData.map(data => data.kps);
        const accuracyData = chartData.map(data => data.accuracy);

        // KPSグラフの描画
        this.kpsChart = new Chart(this.kpsChartCanvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'KPS(秒間打数)',
                    data: kpsData,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    tension: '0.2',
                    pointRadius: 0
                }]
            },
            options: {
                animation: false, responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
                scales: { x: { title: { display: true, text: `直近${this.GRAPH_WINDOW_SECONDS}秒間の推移` } }, y: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'KPS' }, suggestedMin: 0, suggestedMax: 5 } }
            }
        });

        // 正確率グラフの描画
        this.accuracyChart = new Chart(this.accuracyChartCanvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: '正確率 (%)',
                    data: accuracyData,
                    borderColor: 'rgba(153, 102, 255, 1)',
                    backgroundColor: 'rgba(153, 102, 255, 0.2)',
                    tension: '0.2',
                    pointRadius: 0
                }]
            },
            options: {
                animation: false, responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
                scales: { x: { display: false }, y: { type: 'linear', display: true, position: 'left', title: { display: true, text: '正確率 (%)' }, min: 0, max: 100 } }
            }
        });
    }

    /**
     * 効果音を再生する
     * @param {'type' | 'clear'} soundType - 再生する効果音の種類
     */
    playSound(soundType) {
        const sound = this.sounds[soundType];
        if (sound && sound.readyState >= 2) {
            sound.currentTime = 0;
            sound.play();
        }
    }

    /**
     * 現在のお題をフェードアウトさせる
     */
    fadeOutQuestion() {
        this.odaiTextElement.classList.add('fade-out');
        this.furiganaTextElement.classList.add('fade-out');
        this.romanTextElement.classList.add('fade-out');
        this.triviaSourceElement.classList.add('fade-out');
    }

    /**
     * スコアボードの開閉を切り替える
     * （コントローラーから呼び出される）
     */
    toggleScoreBoard() {
        this.scoreBoard.classList.toggle('expanded');
    }

    /**
     * 履歴リストのスクロール位置に応じて「下へ」ボタンの表示/非表示を更新する
     * @private
     */
    _updateScrollDownButtonVisibility() {
        const isSclolledToBottom = (this.historyList.scrollHeight - this.historyList.scrollTop - this.historyList.clientHeight < 1);
        this.scrollDownBtn.classList.toggle('hidden', isSclolledToBottom);
    }
}