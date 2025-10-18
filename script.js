// DOM要素の取得
const odaiTextElement = document.getElementById('odai-text');
const furiganaTextElement = document.getElementById('furigana-text');
const romanTextElement = document.getElementById('roman-text');
const triviaSourceElement = document.getElementById('trivia-source');
const kpsValueElement = document.getElementById('kps-value');
const accuracyValueElement = document.getElementById('accuracy-value');
const scoreBoard = document.getElementById('score-board');
const chartIcon = document.getElementById('chart-icon');
const gameContainer = document.getElementById('game-container');
const historyContainer = document.getElementById('history-container');
const historyList = document.getElementById('history-list');
const scrollDownBtn = document.getElementById('scroll-down-btn');
const toggleHistoryBtn = document.getElementById('toggle-history-btn');
const kpsChartCanvas = document.getElementById('kps-chart');
const accuracyChartCanvas = document.getElementById('accuracy-chart');

// 効果音の取得
const typeSound = document.getElementById('type-sound');
const clearSound = document.getElementById('clear-sound');

// ゲームの状態を管理する変数
let typingText; // 現在のタイピングテキストオブジェクト
let keyLogs = []; // キー入力のログ（スコア計算用）
let scoreHistory = []; // スコアの履歴（グラフ描画用）
let kpsChart = null; // KPSグラフのインスタンス
let accuracyChart = null; // 正解率グラフのインスタンス
let currentQuestionData = null; // 現在表示中のお題のデータ
let nextQuestionPromise = null; // 次のお題を非同期で取得するPromise

// グラフに表示する秒数
const GRAPH_WINDOW_SECONDS = 30;

/**
 * 完了したお題を履歴に追加する
 * @param {object} questionData - 表示したお題のデータ
 */
function addHistoryItem(questionData) {
    if (!questionData) return;

    // スクロールが一番下にあるか判定
    const isScrolledToBottom = Math.abs(historyList.scrollHeight - historyList.scrollTop - historyList.clientHeight) < 1;

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

    item.appendChild(odai);
    item.appendChild(sourceLink);
    historyList.appendChild(item);

    // 履歴追加前に一番下までスクロールされていたら、追加後も一番下にスクロールする
    if (isScrolledToBottom) {
        historyList.scrollTop = historyList.scrollHeight;
    }
}

/**
 * タイピングの進捗状況を画面に反映する
 */
function updateDisplay() {
    if (!typingText) return;
    furiganaTextElement.innerHTML = `<span class="completed">${typingText.completedText}</span><span class="remaining">${typingText.remainingText}</span>`;
    romanTextElement.innerHTML = `<span class="completed">${typingText.completedRoman}</span><span class="remaining">${typingText.remainingRoman}</span>`;
}

/**
 * APIから次のお題を非同期で取得する
 * @returns {Promise<object|null>} お題のデータ、またはエラー時にnull
 */
async function fetchNextQuestion() {
    try {
        // キャッシュを避けるためにタイムスタンプを追加
        const response = await fetch(`/api/get_trivia.php?t=${new Date().getTime()}`, { cache: 'no-store' });
        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            const errorMessage = errorData?.error || `サーバーエラー: ${response.statusText}`;
            const errorDetails = errorData?.details ? ` (${errorData.details})` : '';
            throw new Error(errorMessage + errorDetails);
        }
        return await response.json();
    } catch (error) {
        console.error('お題の取得に失敗しました:', error);
        odaiTextElement.textContent = 'お題の取得に失敗しました。ページをリロードしてください。';
        return null;
    }
}

/**
 * 新しいお題を画面にセットアップする
 * @param {object} questionData - 表示するお題のデータ
 */
function setupQuestion(questionData) {
    if (!questionData) return;

    currentQuestionData = questionData;
    odaiTextElement.textContent = currentQuestionData.odai;
    typingText = new TypingText(currentQuestionData.yomi);
    updateDisplay();

    // 出典情報があればリンクを表示
    if (currentQuestionData.source && currentQuestionData.source.startsWith('http')) {
        triviaSourceElement.href = currentQuestionData.source;
        triviaSourceElement.textContent = '出典: Wikipedia';
        triviaSourceElement.style.display = 'inline-block';
    } else {
        triviaSourceElement.style.display = 'none';
    }

    // フェードインアニメーションのためにクラスをリセット
    odaiTextElement.classList.remove('fade-out');
    furiganaTextElement.classList.remove('fade-out');
    romanTextElement.classList.remove('fade-out');
    triviaSourceElement.classList.remove('fade-out');
}

/**
 * 次のお題を読み込んで表示する
 */
async function loadNextQuestion() {
    // 裏で取得しておいたお題データを待つ
    const questionData = await nextQuestionPromise;
    
    // 新しいお題を画面に表示
    setupQuestion(questionData);

    // さらに次のお題を裏で取得開始
    nextQuestionPromise = fetchNextQuestion();
}


/**
 * スコア（KPSと正解率）を計算して表示を更新する
 */
function updateScore() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000; // 1分前までのログを対象とする

    // 古いキーログを削除
    keyLogs = keyLogs.filter(log => log.time > oneMinuteAgo);

    const totalStrokes = keyLogs.length;
    const correctStrokes = keyLogs.filter(log => log.correct).length;
    
    const kps = (totalStrokes / 60).toFixed(2);
    const accuracy = totalStrokes > 0 ? ((correctStrokes / totalStrokes) * 100) : 100.0;

    kpsValueElement.textContent = kps;
    accuracyValueElement.textContent = `${accuracy.toFixed(1)}%`;

    // グラフ描画用にスコアを履歴に保存
    scoreHistory.push({ kps: parseFloat(kps), accuracy: accuracy });
    if (scoreHistory.length > 300) { // 履歴は最大300件まで保持
        scoreHistory.shift();
    }

    // グラフが表示されている場合のみ再描画
    if (scoreBoard.classList.contains('expanded')) {
        renderChart();
    }
}

/**
 * Chart.jsを使ってスコアの推移グラフを描画する
 */
function renderChart() {
    // 既存のチャートがあれば破棄
    if (kpsChart) { kpsChart.destroy(); }
    if (accuracyChart) { accuracyChart.destroy(); }

    const chartData = scoreHistory.slice(-GRAPH_WINDOW_SECONDS);
    const labels = Array.from({ length: chartData.length }, (_, i) => i + 1);
    const kpsData = chartData.map(data => data.kps);
    const accuracyData = chartData.map(data => data.accuracy);

    // KPSグラフの描画
    kpsChart = new Chart(kpsChartCanvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'KPS (秒間打数)',
                data: kpsData,
                borderColor: 'rgba(54, 162, 235, 1)',
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                tension: 0.2,
                pointRadius: 0
            }]
        },
        options: {
            animation: false, responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
            scales: { x: { title: { display: true, text: `直近${GRAPH_WINDOW_SECONDS}秒間の推移` } }, y: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'KPS' }, suggestedMin: 0, suggestedMax: 5 } }
        }
    });

    // 正解率グラフの描画
    accuracyChart = new Chart(accuracyChartCanvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '正解率 (%)',
                data: accuracyData,
                borderColor: 'rgba(255, 99, 132, 1)',
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                tension: 0.2,
                pointRadius: 0,
            }]
        },
        options: {
            animation: false, responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
            scales: { x: { display: false }, y: { type: 'linear', display: true, position: 'left', title: { display: true, text: '正解率 (%)' }, min: 0, max: 100 } }
        }
    });
}

/**
 * キーボード入力のイベントリスナー
 */
window.addEventListener('keydown', (e) => {
    if (!typingText || !TypingText.isValidInputKey(e.key)) {
        return;
    }
    e.preventDefault();

    const result = typingText.inputKey(e.key);
    const isCorrect = (result !== 'unmatch');
    keyLogs.push({ time: Date.now(), correct: isCorrect });

    if (isCorrect) {
        if(typeSound.readyState >= 2) {
            typeSound.currentTime = 0;
            typeSound.play();
        }
    }

    updateDisplay();

    // タイピングが完了した場合
    if (result === 'complete') {
        addHistoryItem(currentQuestionData);
        if (typingText.remainingRoman.length === 0) {
            if(clearSound.readyState >= 2) { clearSound.play(); }
        }
        
        // フェードアウトアニメーション
        odaiTextElement.classList.add('fade-out');
        furiganaTextElement.classList.add('fade-out');
        romanTextElement.classList.add('fade-out');
        triviaSourceElement.classList.add('fade-out');
        
        // アニメーション後に次のお題を読み込む
        setTimeout(loadNextQuestion, 500);
    }
});

/**
 * グラフ表示エリアの開閉イベント
 */
chartIcon.addEventListener('click', () => {
    scoreBoard.classList.toggle('expanded');
    if (scoreBoard.classList.contains('expanded')) {
        renderChart();
    }
});

/**
 * 履歴リストのスクロールイベント（「下へ」ボタンの表示制御）
 */
historyList.addEventListener('scroll', () => {
    const isScrolledToBottom = Math.abs(historyList.scrollHeight - historyList.scrollTop - historyList.clientHeight) < 1;
    scrollDownBtn.classList.toggle('hidden', isScrolledToBottom);
});

/**
 * 「下へ」ボタンのクリックイベント
 */
scrollDownBtn.addEventListener('click', () => {
    historyList.scrollTo({ top: historyList.scrollHeight, behavior: 'smooth' });
});

/**
 * 履歴エリアの表示/非表示を切り替えるイベント
 */
toggleHistoryBtn.addEventListener('click', () => {
    historyContainer.classList.toggle('hidden');
    gameContainer.classList.toggle('with-history');
});

/**
 * ゲームを開始する初期化関数
 */
function startGame() {
    // ユーザーの操作を待たずに、先にお題を取得開始しておく
    nextQuestionPromise = fetchNextQuestion();
    
    // 最初のお題を表示
    loadNextQuestion();
    
    // 1秒ごとにスコアを更新するタイマーを開始
    setInterval(updateScore, 1000);
}

// ゲーム開始
startGame();
