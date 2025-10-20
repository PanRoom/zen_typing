# 禅タイピング

Wikipediaから引用した雑学を題材にした、シンプルなタイピングゲームです。

![スクリーンショット](https://private-user-images.githubusercontent.com/88648234/502870251-662261eb-0e4e-49f8-84f6-76120adcea84.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NjA5NDAzNTUsIm5iZiI6MTc2MDk0MDA1NSwicGF0aCI6Ii84ODY0ODIzNC81MDI4NzAyNTEtNjYyMjYxZWItMGU0ZS00OWY4LTg0ZjYtNzYxMjBhZGNlYTg0LnBuZz9YLUFtei1BbGdvcml0aG09QVdTNC1ITUFDLVNIQTI1NiZYLUFtei1DcmVkZW50aWFsPUFLSUFWQ09EWUxTQTUzUFFLNFpBJTJGMjAyNTEwMjAlMkZ1cy1lYXN0LTElMkZzMyUyRmF3czRfcmVxdWVzdCZYLUFtei1EYXRlPTIwMjUxMDIwVDA2MDA1NVomWC1BbXotRXhwaXJlcz0zMDAmWC1BbXotU2lnbmF0dXJlPTI2YTM5YzljYzJhOTdjMmVhYzBkMmNlYzYxODhhNjg4ZTUyYjE2OGE5NzBkNjk1OTY5MTJiNzhhMTkyNzZjNmImWC1BbXotU2lnbmVkSGVhZGVycz1ob3N0In0.90dabSNu7fi6ED4wBcTcJvMOwT-Oj6cYeTXxJsxKbaQ)

落ち着いた雰囲気の中で、キーボードを叩く心地よさに集中できます。表示されるお題をタイピングし、自身のタイピング速度（KPS）と正確性（Accuracy）をリアルタイムで確認できます。

デモ: [https://zen-typing.vercel.app/](https://zen-typing.vercel.app/)

## 特徴

*   **リアルタイムスコア表示**: 秒間打鍵数（KPS）と正解率（Accuracy）を常に表示します。
*   **スコア推移グラフ**: 直近30秒間のKPSと正解率の推移をグラフで視覚的に確認できます。
*   **タイピング履歴**: クリアしたお題は履歴として一覧表示されます。
*   **出典表示**: お題の出典元（主にWikipedia）へのリンクが表示されます。
*   **スムーズなゲーム体験**: 次のお題をバックグラウンドで読み込むことで、待ち時間なくスムーズに次のタイピングへ移れます。

## 使用技術

*   **フロントエンド**: HTML, CSS, JavaScript (Chart.js)
*   **バックエンド**: PHP
*   **データベース**: PostgreSQL
*   **ホスティング**: Vercel

## こだわった点・実装の詳細

*   **待ち時間のないゲーム体験**
    *   ユーザーが現在のお題をタイピングしている間に、次のお題を非同期で先読みして準備しておくことで、お題間の待ち時間をなくし、スムーズなゲームプレイを実現しています。(`fetchNextQuestion`, `loadNextQuestion`)

*   **リアルタイムなパフォーマンス分析**
    *   `setInterval` を使用して1秒ごとにタイピング速度（KPS）と正確性を計算し、UIに反映させています。
    *   `Chart.js` を活用し、KPSと正解率の推移を折れ線グラフでリアルタイムに描画することで、ユーザーが自身のパフォーマンスを視覚的に把握できるようにしました。

*   **快適なUI/UX**
    *   タイピング完了時にはお題がフェードアウトするなど、細かなアニメーションで視覚的なフィードバックを加えています。
    *   タイピング履歴は表示・非表示を切り替え可能にし、ゲーム画面の広さをユーザーが選択できるようにしました。
