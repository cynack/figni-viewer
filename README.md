# Figni Viewer

[![npm version](https://badge.fury.io/js/@cynack%2Ffigni-viewer.svg)](https://badge.fury.io/js/@cynack%2Ffigni-viewer)

## ドキュメント

[Figni Viewer ドキュメント](https://cynack.notion.site/Figni-Viewer-c53ca5a80bdd4a8abf4f41aa899aa9f1)

## 開発方法

1. `yarn install`で必要なパッケージをダウンロードする
2. src/のファイルを編集(index.html はテスト用の html ファイル)
3. `yarn watch`で test/にテスト用のファイルを出力し、`yarn test`でサーバーを起動して検証
4. `yarn build`で dist/にビルド

## 便利コマンド

- `yarn test`
  - 検証用の HTML(./index.html)のサーバーを立ててくれるよ
- `yarn watch`
  - src/に変更があったら自動でビルド(development)

## 備考

This software includes the work that is distributed in the Apache License 2.0.

このソフトウェアは、 Apache 2.0ライセンスで配布されている製作物が含まれています。
