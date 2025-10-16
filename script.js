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

// ★★★ 修正点 ② ★★★
// グラフ要素のIDを正しく指定
const kpsChartCanvas = document.getElementById('kps-chart'); 
const accuracyChartCanvas = document.getElementById('accuracy-chart');

// 効果音の取得
const typeSound = document.getElementById('type-sound');
const clearSound = document.getElementById('clear-sound');

// グラフに表示する時間（秒）を定義
const GRAPH_WINDOW_SECONDS = 30;

// ★★★ 修正点 ① ★★★
// グローバル変数を正しく宣言
let typingText;
let keyLogs = [];
let scoreHistory = [];
let kpsChart = null; // KPSグラフのインスタンスを保持
let accuracyChart = null; // 正解率グラフのインスタンスを保持
let currentQuestionData = null; // 現在のお題データを保持

/**
 * 履歴アイテムを追加する関数 (変更なし)
 */
function addHistoryItem(questionData) {
    if (!questionData) return;
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
    if (isScrolledToBottom) {
        historyList.scrollTop = historyList.scrollHeight;
    }
}

/**
 * 画面の表示を更新する関数 (変更なし)
 */
function updateDisplay() {
    if (!typingText) return;
    furiganaTextElement.innerHTML = `<span class="completed">${typingText.completedText}</span><span class="remaining">${typingText.remainingText}</span>`;
    romanTextElement.innerHTML = `<span class="completed">${typingText.completedRoman}</span><span class="remaining">${typingText.remainingRoman}</span>`;
}

/**
 * APIからお題データを取得して、次の問題をセットアップする関数 (変更なし)
 */
async function setupNextQuestion() {
    try {
        const response = await fetch(`/api/get_trivia.php?t=${new Date().getTime()}`, { cache: 'no-store' });
        if (!response.ok) {
            // サーバーからのエラーレスポンスをJSONとして解析試行
            const errorData = await response.json().catch(() => null);
            const errorMessage = errorData?.error || `サーバーエラー: ${response.statusText}`;
            const errorDetails = errorData?.details ? ` (${errorData.details})` : '';
            throw new Error(errorMessage + errorDetails);
        }
        currentQuestionData = await response.json();
        odaiTextElement.textContent = currentQuestionData.odai;
        typingText = new TypingText(currentQuestionData.yomi);
        updateDisplay();
        if (currentQuestionData.source && currentQuestionData.source.startsWith('http')) {
            triviaSourceElement.href = currentQuestionData.source;
            triviaSourceElement.textContent = '出典: Wikipedia';
            triviaSourceElement.style.display = 'inline-block';
        } else {
            triviaSourceElement.style.display = 'none';
        }
        odaiTextElement.classList.remove('fade-out');
        furiganaTextElement.classList.remove('fade-out');
        romanTextElement.classList.remove('fade-out');
        triviaSourceElement.classList.remove('fade-out');
    } catch (error) {
        console.error('お題の取得に失敗しました:', error);
        odaiTextElement.textContent = error.message; // より詳細なエラーメッセージを表示
    }
}

/**
 * スコアを計算して表示を更新する関数 (変更なし)
 */
function updateScore() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const recentLogs = keyLogs.filter(log => log.time > oneMinuteAgo);
    keyLogs = recentLogs;
    const totalStrokes = recentLogs.length;
    const correctStrokes = recentLogs.filter(log => log.correct).length;
    const kps = (totalStrokes / 60).toFixed(2);
    const accuracy = totalStrokes > 0 ? ((correctStrokes / totalStrokes) * 100) : 100.0;
    kpsValueElement.textContent = kps;
    accuracyValueElement.textContent = `${accuracy.toFixed(1)}%`;
    scoreHistory.push({ kps: parseFloat(kps), accuracy: accuracy });
    if (scoreHistory.length > 300) {
        scoreHistory.shift();
    }
    if (scoreBoard.classList.contains('expanded')) {
        renderChart();
    }
}

/**
 * グラフを描画する関数
 */
function renderChart() {
    // 古いグラフを破棄
    if (kpsChart) { kpsChart.destroy(); }
    if (accuracyChart) { accuracyChart.destroy(); }

    // グラフ用のデータを準備
    const chartData = scoreHistory.slice(-GRAPH_WINDOW_SECONDS);
    const labels = Array.from({ length: chartData.length }, (_, i) => i + 1);
    const kpsData = chartData.map(data => data.kps);
    const accuracyData = chartData.map(data => data.accuracy);

    // KPSグラフを生成
    kpsChart = new Chart(kpsChartCanvas, {
        type: 'line',
        data: {
            labels: labels,
            // ★★★ 修正点 ③ datasetsを配列 [ ] で囲む ★★★
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

    // 正解率グラフを生成
    accuracyChart = new Chart(accuracyChartCanvas, {
        type: 'line',
        data: {
            labels: labels,
            // ★★★ 修正点 ③ datasetsを配列 [ ] で囲む ★★★
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

// キーボードの入力イベントを監視 (変更なし)
window.addEventListener('keydown', (e) => {
    if (!typingText) return;
    if (!TypingText.isValidInputKey(e.key)) return;
    e.preventDefault();
    const result = typingText.inputKey(e.key);
    const isCorrect = (result !== 'unmatch');
    keyLogs.push({ time: Date.now(), correct: isCorrect });
    if (isCorrect) { if(typeSound.readyState >= 2) { typeSound.currentTime = 0; typeSound.play(); } }
    updateDisplay();
    if (result === 'complete') {
        addHistoryItem(currentQuestionData);
        if (typingText.remainingRoman.length === 0) { if(clearSound.readyState >= 2) { clearSound.play(); } }
        odaiTextElement.classList.add('fade-out');
        furiganaTextElement.classList.add('fade-out');
        romanTextElement.classList.add('fade-out');
        triviaSourceElement.classList.add('fade-out');
        setTimeout(setupNextQuestion, 500);
    }
});

// アイコンクリックでグラフコンテナを開閉 (変更なし)
chartIcon.addEventListener('click', () => {
    scoreBoard.classList.toggle('expanded');
    if (scoreBoard.classList.contains('expanded')) {
        renderChart();
    }
});

// 履歴リストのスクロールイベント (変更なし)
historyList.addEventListener('scroll', () => {
    const isScrolledToBottom = Math.abs(historyList.scrollHeight - historyList.scrollTop - historyList.clientHeight) < 1;
    if (isScrolledToBottom) {
        scrollDownBtn.classList.add('hidden');
    } else {
        scrollDownBtn.classList.remove('hidden');
    }
});

// スクロールダウンボタンのクリックイベント (変更なし)
scrollDownBtn.addEventListener('click', () => {
    historyList.scrollTo({ top: historyList.scrollHeight, behavior: 'smooth' });
});

// 履歴表示切り替えボタンのクリックイベント (変更なし)
toggleHistoryBtn.addEventListener('click', () => {
    historyContainer.classList.toggle('hidden');
    gameContainer.classList.toggle('with-history');
});

// ゲーム開始とスコア更新タイマー
setupNextQuestion();
setInterval(updateScore, 1000);