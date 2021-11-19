# Figni Viewer

[![npm version](https://badge.fury.io/js/@cynack%2Ffigni-viewer.svg)](https://badge.fury.io/js/@cynack%2Ffigni-viewer)

## ドキュメント

[figni-viewer document](https://cynack.notion.site/figni-viewer-e5f236458b9d4c889d4d57f7bcbce862)

## 開発方法

1. `npm install`で必要なパッケージをダウンロードする
2. src/のファイルを編集(index.html はテスト用の html ファイル)
3. `npm run watch`で test/にテスト用のファイルを出力し、`npm run test`でサーバーを起動して検証
4. `npm run build`で dist/にビルド

## 便利コマンド

- `npm run test`
  - 検証用の HTML(./index.html)のサーバーを立ててくれるよ
- `npm run watch`
  - src/に変更があったら自動でビルド(development)
