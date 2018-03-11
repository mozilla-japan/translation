# MDN翻訳お役立ちツール

## 機能

### 新規翻訳

- 見出しのidを英語のままにするためのname属性付与（[参考](TranslationHelper.user.js)）
- 自動翻訳もとい置換
  - 見出しや互換性表などのよくある語句
  - 実装・継承するプロパティ・メソッドがないことを示す文
  - The hogehoge interface → hogehoge インターフェイス
- /en-US/docs/ → /ja/docs/
- 翻訳中フラグをオフに、編集レビューをオンに
- タグを元記事からコピー
- 編集コメントに元記事のリビジョン番号を自動入力

### 更新

- 元記事が更新されていた場合は、そのリビジョン番号を自動入力

### 手動実行ボタン

- エディタ上部: 訳文初期化、Translation Helper（新規翻訳時の本文の処理）
- 記事タグ: タグを元記事からコピー
- 編集コメント: 元記事のリビジョン番号をカーソル位置に挿入

## 使用上の注意

新規翻訳では、処理前・後に確認を表示したり、差分を表示したりすることなく、編集画面を開いた瞬間に処理が行われます。

おかしな自動編集が行われていないかは適宜自分で確認してください。[ソースコード](TranslationHelper.user.js)
を読んで、具体的な処理の方法を把握しておくのもよいでしょう。

## インストール

開発は主に Google Chrome で行っていますが、ES2015が普通に使える環境なら動くはずです。

1. Greasemonkey や Tampermonkey といった、UserScriptを動かすための拡張機能を入れます
2. このリポジトリの MDN/TranslationHelper.user.js を開いて右上の Raw をクリック。  
もしくはこちらから: https://github.com/mozilla-japan/translation/raw/master/MDN/TranslationHelper.user.js

MDNで翻訳画面や日本語記事の編集画面を開くと自動で作動します。

## 何かあれば

Issues か ML へ。単刀直入に PullRequest でも。

言い出しっぺは @unarist です。
