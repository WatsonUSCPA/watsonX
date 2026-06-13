# Watson US CPA — 日米クロスボーダー税務 情報サイト

米国公認会計士（US CPA / [@watsonuscpa](https://x.com/watsonuscpa)）による、日米をまたぐ個人向けの情報サイトです。
**「節税のポイントを質問に答えていくと、状況に応じたアドバイスと関連note記事が出てくる」** 診断ツールを中心に、
[note（@wtcajptc）](https://note.com/wtcajptc) への導線として運用します。

将来的には会計事務所のWebサイトへ拡張する想定です。

## 特長

- **ビルド不要の静的サイト**（HTML / CSS / バニラJS）。GitHub Pages 等にそのまま公開できます。
- **診断ツリーとnoteリンクは1ファイルで管理**（`assets/js/content.js`）。非エンジニアでも追記できます。
- レスポンシブ対応・免責表記つき。

## ファイル構成

```
.
├── index.html              トップページ（ヒーロー / 診断 / ケース / 運営者 / フッター）
├── assets/
│   ├── css/style.css       デザイン
│   └── js/
│       ├── content.js      ★ 質問・アドバイス・noteリンクの定義（ここを編集）
│       └── app.js          診断の描画エンジン（通常触らない）
├── .nojekyll               GitHub Pages 用
└── README.md
```

## コンテンツの編集方法（`assets/js/content.js`）

### 1. note記事のリンクを追加・更新する

`ARTICLES` に記事を登録します。URLが決まったら `url` を埋めるだけ。
`url` が空のものは「準備中」と表示され、noteトップへのリンクになります。

```js
const ARTICLES = {
  fbar: {
    title: "FBAR（FinCEN Form 114）の提出要件と注意点",
    url: "https://note.com/wtcajptc/n/xxxxxxxx", // ← URLが決まったら記入
  },
};
```

### 2. 質問やアドバイスを追加・変更する

`FLOW` がそのまま画面に反映されます。ノードは2種類：

- **質問（branch）**：`{ question, options: [{ label, hint, next }] }`
- **結果（leaf）**：`{ result: true, tag, title, points: [...], articles: ["記事キー"], note }`

`start` が開始ノードです。新しいケースを足すときは、結果ノードを追加して
どこかの `options` から `next` で繋げてください。

### 3. IRA特集を後から「合流」させる

1. `ARTICLES` にIRA関連記事を追加
2. `FLOW` の `retirement` 配下（`ret_ira` など）の `articles` に記事キーを追加

これだけで反映されます。新カテゴリにしたい場合は `start.options` に選択肢を1つ追加してください。

### 4. 相談導線の差し替え

`CONTACT_URL` は現在 note を指しています。問い合わせフォームができたらURLを差し替えてください。

## ローカルで確認する

```bash
python3 -m http.server 8000
# ブラウザで http://localhost:8000 を開く
```

## 公開（GitHub Pages の例）

1. このブランチ／`main` をリポジトリに push
2. リポジトリの **Settings → Pages** で公開ブランチを選択
3. 数分後に発行されるURLで閲覧可能

## 免責

本サイトの内容は一般的な情報提供を目的としたもので、個別の税務・法務上のアドバイスではありません。
要件・金額基準は年度や個別事情で変わります。実際のご判断は資格を有する専門家にご相談ください。
