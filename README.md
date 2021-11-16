# Figni Viewer

[![npm version](https://badge.fury.io/js/@cynack%2Ffigni-viewer.svg)](https://badge.fury.io/js/@cynack%2Ffigni-viewer)

## 開発方法

1. `npm install`で必要なパッケージをダウンロードする
2. src/のファイルを編集(index.htmlはテスト用のhtmlファイル)
3. `npm run watch`で test/にテスト用のファイルを出力し、`npm run test`でサーバーを起動して検証
4. `npm run build`でdist/にビルド

## 便利コマンド

- `npm run test`
  - 検証用の HTML(./index.html)のサーバーを立ててくれるよ
- `npm run watch`
  - src/に変更があったら自動でビルド(development)
