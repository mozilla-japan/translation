# mdn-textlint-ja

mdnのtranslated-contentの日本語翻訳向けのlintツール

## Setup

依存パッケージをインストール

```
yarn
```

## Usage

```
yarn run lint <チェックするファイル/ディレクトリの相対パス>
```

ex1. 特定のファイルをチェックする場合

```
yarn run lint ../../../translated-content/files/ja/mdn/contribute/index.md
```

ex2. 特定のディレクトリ配下のファイルをチェックする場合

```
yarn run lint ../../../translated-content/files/ja/mdn/contribute/
```
