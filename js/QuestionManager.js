/**
 * APIからのお題取得と先行読み込みを管理するクラス
 */
export class QuestionManager {
    /**
     * @param {string} apiUrl - お題取得APIのURL
     */
    constructor(apiUrl) {
        if (!apiUrl) {
            throw new Error('API URL is required');
        }
        this.apiUrl = apiUrl;

        /**
         * 次のお題を取得するPromise。先行読み込みに利用する
         * @type {Promise<object|null>}
         */
        this.nextQuestionPromise = null;

        // インスタンス化と同時に、最初のお題の先行読み込みを開始
        this.preloadNextQuestion();
    }

    /**
     * 次のお題を非同期で取得し、'nextQuestionPromise'にセットする
     */
    preloadNextQuestion() {
        this.nextQuestionPromise = this._fetchQuestion();
    }

    /**
     * APIからお題データを1件取得する
     * @returns {Promise<object|null>} - 取得したお題データ、またはnull（失敗時）
     * @private
     */
    async _fetchQuestion() {
        try {
            // キャッシュを避けるためにタイムスタンプを追加
            const url = `${this.apiUrl}?t=${new Date().getTime()}`;

            const response = await fetch(url, { cache: 'no-store'});

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                const errorMessage = errorData?.error || `サーバーエラー: ${response.statusText}`;
                const errorDetails = errorData?.details ? ` (${errorData.details})` : '';
                throw new Error(errorMessage + errorDetails);
            }

            return await response.json();
        } catch (error) {
            console.error('お題の取得に失敗しました:', error);
            // 呼び出し元でのエラーハンドリングのためにnullを返す
            return null;
        }
    }
    
    /**
     * 先読みしておいたお題データを取得する
     * 取得後、すぐに次の次のお題の先行読み込みを開始する
     * @returns {Promise<object|null>} - 取得したお題データ、またはnull（失敗時）
     */
    async getNextQuestion() {
        // 現在読み込み中のpromiseを待つ
        const questionData = await this.nextQuestionPromise;

        // 次のお題の先行読み込みを開始
        this.preloadNextQuestion();

        // 待っていたお題データを返す
        return questionData;
    }
}