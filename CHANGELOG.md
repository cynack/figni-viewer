<!-- markdownlint-configure-file { "MD024": { "siblings_only": true } } -->

# Change Log

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [Unreleased]

### Added

### Changed

### Deprecated

### Removed

### Fixed

## [1.7.3] - 2023-02-24

### Added

- `item-id`と`token`から 3D モデルの URL を取得できる関数を追加

### Fixed

- ハイライト周りの処理に関して軽微な修正

## [1.7.2] - 2023-02-20

### Changed

- model-viewer をアップデート([8c14189](https://github.com/google/model-viewer/tree/8c14189c8c5e721339c6cf491a16476b66817928))

## [1.7.1] - 2023-02-08

### Added

- 自由なカメラ移動をサポートする属性`enable-pan`を追加
- カスタムデータをログサーバーに送る関数`updateCustomData()`を追加
- ブラウザの表示言語にあわせてテキストを変更する機能を追加

### Fixed

- 軽微な修正

## [1.7.0] - 2022-11-07

### Added

- カメラの垂直方向の視野を変更できる属性`fov`を追加

### Fixed

- 軽微な修正

## [1.6.11] - 2022-10-28

### Fixed

- パネルの表示が少しぼやける問題を修正

## [1.6.10] - 2022-10-06

### Added

- 閲覧できない時のエラーメッセージを追加

## [1.6.9] - 2022-09-07

### Fixed

- 初回ロード以外でハイライトがちらつく問題を修正

## [1.6.8] - 2022-08-22

### Fixed

- ロード直後にハイライトがちらつく問題を修正

## [1.6.7] -2022-08-01

### Fixed

- 軽微なスタイルの修正

## [1.6.6] - 2022-07-15

### Fixed

- 外部 CSS の影響を受けにくくなるように修正
- UI テキストを修正

## [1.6.5] - 2022-07-06

### Fixed

- ロード画面が消えない問題を修正
- 軽微な問題を修正

## [1.6.3] - 2022-06-20

### Fixed

- ロード画面が消えない問題を数秒後に状態を見ることで修正

## [1.6.2] - 2022-06-17

### Added

- アニメーションを再生/逆再生して二つの状態を切り替える属性`toggle-clip`を追加
- `toggle-clip`による変化に応じてキャプション内の文字列を変更する属性`toggle-text`を追加
- `toggle-clip`による変化に応じて状態を変更する属性`toggle-animation`を追加

### Fixed

- 稀にローディング画面が消えない問題を修正

## [1.6.1] - 2022-06-08

### Added

- パネルの表示時間を計測・取得

### Fixed

- ズームしたときに、適切な位置にカメラが戻らなくなる問題を修正
- キャプションの ✕ ボタンのスタイルを修正
- モデルを再ロードしたときにロード画面が消えない問題を修正

## [1.6.0] - 2022-06-06

### Added

- Figni Viewer の利用ページを特定できる`tag`属性を追加

### Changed

- キャプションを押してカメラの位置が変更されたときに、キャプションを戻るボタンとして使用できるように変更

### Deprecated

- パネルの位置を`center middle`にすることを非推奨に変更

### Fixed

- いくつかの軽微な修正

## [1.5.1] - 2022-05-31

### Added

- データ取得する項目を追加

### Fixed

- データ取得に関する軽微なバグを修正

## [1.5.0] - 2022-05-30

### Added

- 使い方を紹介しているヘルプページを追加
- CSS で指定できるカスタム色を追加
- QR コード表示パネルにアニメーションを追加
- 有効なアニメーションの一覧を取得できるプロパティ(`availableAnimations`)を追加
- `load`, `progress`, `finished` イベントを追加

### Changed

- パネルのサイズを調整
- CSS で指定したカスタム色が影響を及ぼす範囲を拡大
- カメラの位置を初期位置に戻すボタンのスタイルを変更
- エラー画面のスタイルを変更

### Fixed

- エラー画面が表示されない問題を修正

## [1.4.5] - 2022-05-09

### Fixed

- パネルをクリックしてもキャプションをクリックしたときと同じ動作をしてしまう問題を修正

## [1.4.3] - 2022-04-22

### Removed

- WebXR での起動をサポートしないように変更

### Fixed

- 軽微な修正

## [1.4.2] - 2022-04-22

### Fixed

- 軽微な修正

## [1.4.1] - 2022-04-21

### Added

- figni-viwer-base へアクセスできるプロパティを追加

### Fixed

- 初期化時にまれに発生するエラーを修正

## [1.4.0] - 2022-04-21

### Added

- キャプションに強調アニメーションを追加
- タッチ(クリック)している位置を強調するカーソルを追加

### Changed

- ローディングアニメーションを変更
- AR 開始ボタンの位置とデザインを変更
- カメラを初期位置に戻すボタンの位置とデザインを変更

### Fixed

- 利用データの取得に関して正しい値を返すように修正

## [1.3.0] - 2022-03-23

### Added

- `addHotspot()`の引数に`reverse`を追加
- `editHotspot()`の引数に`reverse`を追加
- 利用方法を示すプロンプトを追加

### Changed

- `addHotspot()`の引数`onstart`および`onend`をそれぞれ`onStart`、`onEnd`に変更
- `editHotspot()`の引数`onstart`および`onend`をそれぞれ`onStart`、`onEnd`に変更
- キャプションの表示非表示を切り替えるボタンを属性`toggle-caption`の有無で制御できるように変更

### Fixed

- `addHotspot()`が正しく動作しない問題を修正

## [1.2.0] - 2022-02-10

### Added

- 再生するアニメーションを逆再生に変更する属性`reverse`を追加

### Changed

- 属性`visible-state`において複数の値を設定できるように変更
- `playAnimation()`の引数を(`clip`, `loopCount`, `toState`, `onstart`, `onend`)から(`clip`, `options`)に変更
- キャプションにおいて属性`normal`を指定しなかった場合、常に見えるように変更

### Fixed

- 属性`visible-state`を指定しなかった場合エラーが発生する問題を修正

## [1.1.0] - 2022-02-07

### Added

- カメラ位置をリセットする`resetCameraPosition()`関数を追加
- アニメーションの再生速度を変更する`timeScale`プロパティを追加

### Deprecated

- 属性`anime`を指定しなくても属性`clip`があればアニメーションが再生されるように変更
- 属性`closeup`を指定しなくても属性`taget`または属性`orbit`があればカメラの位置や回転が変更されるように変更

## [1.0.4] - 2022-01-31

### Changed

- 接続先データベースの変更

## [1.0.3] - 2022-01-28

### Changed

- アニメーション再生中はキャプションが表示されないように変更

### Fixed

- キャプションに関して、完全に可視化されるまでクリックできない問題を修正

## [1.0.2] - 2022-01-25

### Added

- 3D モデル読み込み中のエラー表示画面を追加

### Changed

- 3D モデルを再読み込みした時にロード画面を表示するように変更

### Fixed

- 初回ロード時に誤って二回リクエストを送ってしまう問題を修正
- HTML 要素の表示を再利用によって最適化

## [1.0.1] - 2022-01-21

### Changed

- 3D モデルのプリロードするタイミングを figni-viewer がビューポート内に近づいた時に変更

### Fixed

- アニメーションの一回再生に関して、終了時の 3D モデルの状態が 0 フレーム目になっていた問題を修正

## [1.0.0] - 2022-01-14

### Added

- 属性`loopCount`を追加

### Changed

- `playAnimation()`の引数を(`clip`, `loop`, `length`, `toState`, `onstart`, `onend`)から(`clip`, `loopCount`, `toState`, `onstart`, `onend`)に変更
- 属性`anime`および`clip`の挙動を変更

### Removed

- 属性`loop`を削除

### Fixed

- 消えたキャプションにクリック判定が残っていた問題を修正

## [0.0.33] - 2021-12-28

### Added

- 属性`loop`を追加

### Changed

- `playAnimation()`の引数に`loop`を追加

### Fixed

- `closeup`でのカメラの誤った挙動を修正

## [0.0.32] - 2021-12-17

### Added

- フォントを CSS の変数で指定できる機能を追加

### Changed

- ローディングアニメーションを変更

## [0.0.31] - 2021-12-15

### Added

- ローディングアニメーションを追加
- UI 要素の色を CSS の変数で指定できる機能を追加

### Changed

- 描画ボックスの丸角を削除

## [0.0.30] - 2021-12-13

### Fixed

- `onstart`, `onend`が正しく動作しない問題を修正
- キャプションの表示非表示が正しく切り替わらない問題を修正

## [0.0.29] - 2021-12-13

### Fixed

- 特定の環境でクリックが効かない問題を修正

## [0.0.28] - 2021-12-13

### Fixed

- デザインの修正
- 動作が重い場合 3D モデル表示の解像度を下げるように修正

## [0.0.27] - 2021-12-08

### Fixed

- `orbit`の指定が正しく反映されていない問題を修正
- パネルのデザインを修正
- `addHotspot()`で名前が重複したキャプションを追加した場合にエラーを起こす問題を修正

## [0.0.26] - 2021-12-06

### Added

- パネルの位置を指定することができる属性`place`を追加

### Fixed

- パネルのデザインを修正

## [0.0.25] - 2021-12-06

### Fixed

- 3D モデルのテクスチャが黒くなる問題を修正

## [0.0.24] - 2021-12-02

### Fixed

- `model-tag`を利用した 3D モデルの読み込みが正しく行われていない問題を修正
- `visible`の設定されていないキャプションの表示非表示が正しく行われていない問題を修正

## [0.0.23] - 2021-12-01

### Changed

- 属性`visible`を`visible-state`に改名

### Fixed

- キャプションが存在しない場合キャプションの表示非表示を切り替えるボタンが出ないように修正

## [0.0.22] - 2021-12-01

### Fixed

- キャプションの機能およびスタイルが適切に適用されない場合がある問題を修正

## [0.0.21] - 2021-11-30

### Fixed

- `playAnimation()`の`onstart`と`onend`のコールバックが正しく動作しない問題を修正

## [0.0.20] - 2021-11-29

### Added

- アニメーションを再生する`playAnimation()`関数を追加
- アニメーションを停止する`stopAnimation()`関数を追加

### Fixed

- `toggleVisibleHotspot`を呼び出したときにボタンが正しく切り替わらない問題を修正

## [0.0.19] - 2021-11-29

### Added

- キャプションの表示非表示を切り替えるボタンを追加
- キャプションの表示非表示を切り替える`toggleVisibleHotspot()`関数を追加

## [0.0.18] - 2021-11-24

### Added

- キャプションを追加する`addHotspot()`関数を追加
- キャプションの位置や機能を編集する`editHotspot()`関数を追加
- キャプションを削除する`removeHotspot()`関数を追加

### Fixed

- *hostpot*を後から追加した場合に正しい挙動になるように修正

## [0.0.17] - 2021-11-24

## [0.0.16] - 2021-11-22

### Changed

- キャプションのスタイルを上書きできるように変更
- パネルのスタイルを上書きできるように変更
- カメラを初期位置に戻すボタンのスタイルを上書きできるように変更
- スクリーンショットボタンのスタイルを上書きできるように変更

## [0.0.15] - 2021-11-19

## [0.0.14] - 2021-11-19

## [0.0.13] - 2021-11-18

### Added

- キャプションの表示非表示を変化させる`to-state`属性を追加
- キャプションの表示非表示を決定する`visible`属性を追加

[unreleased]: https://github.com/cynack/figni-viewer/compare/v1.7.3...HEAD
[1.7.3]: https://github.com/cynack/figni-viewer/compare/v1.7.2...v1.7.3
[1.7.2]: https://github.com/cynack/figni-viewer/compare/v1.7.1...v1.7.2
[1.7.1]: https://github.com/cynack/figni-viewer/compare/v1.7.0...v1.7.1
[1.7.0]: https://github.com/cynack/figni-viewer/compare/v1.6.11...v1.7.0
[1.6.11]: https://github.com/cynack/figni-viewer/compare/v1.6.10...v1.6.11
[1.6.10]: https://github.com/cynack/figni-viewer/compare/v1.6.9...v1.6.10
[1.6.9]: https://github.com/cynack/figni-viewer/compare/v1.6.8...v1.6.9
[1.6.8]: https://github.com/cynack/figni-viewer/compare/v1.6.7...v1.6.8
[1.6.7]: https://github.com/cynack/figni-viewer/compare/v1.6.6...v1.6.7
[1.6.6]: https://github.com/cynack/figni-viewer/compare/v1.6.5...v1.6.6
[1.6.5]: https://github.com/cynack/figni-viewer/compare/v1.6.3...v1.6.5
[1.6.3]: https://github.com/cynack/figni-viewer/compare/v1.6.2...v1.6.3
[1.6.2]: https://github.com/cynack/figni-viewer/compare/v1.6.1...v1.6.2
[1.6.1]: https://github.com/cynack/figni-viewer/compare/v1.6.0...v1.6.1
[1.6.0]: https://github.com/cynack/figni-viewer/compare/v1.5.1...v1.6.0
[1.5.1]: https://github.com/cynack/figni-viewer/compare/v1.5.0...v1.5.1
[1.5.0]: https://github.com/cynack/figni-viewer/compare/v1.4.5...v1.5.0
[1.4.5]: https://github.com/cynack/figni-viewer/compare/v1.4.3...v1.4.5
[1.4.3]: https://github.com/cynack/figni-viewer/compare/v1.4.2...v1.4.3
[1.4.2]: https://github.com/cynack/figni-viewer/compare/v1.4.1...v1.4.2
[1.4.1]: https://github.com/cynack/figni-viewer/compare/v1.4.0...v1.4.1
[1.4.0]: https://github.com/cynack/figni-viewer/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/cynack/figni-viewer/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/cynack/figni-viewer/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/cynack/figni-viewer/compare/v1.0.4...v1.1.0
[1.0.4]: https://github.com/cynack/figni-viewer/compare/v1.0.3...v1.0.4
[1.0.3]: https://github.com/cynack/figni-viewer/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/cynack/figni-viewer/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/cynack/figni-viewer/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/cynack/figni-viewer/compare/v0.0.33...v1.0.0
[0.0.33]: https://github.com/cynack/figni-viewer/compare/v0.0.32...v0.0.33
[0.0.32]: https://github.com/cynack/figni-viewer/compare/v0.0.31...v0.0.32
[0.0.31]: https://github.com/cynack/figni-viewer/compare/v0.0.30...v0.0.31
[0.0.30]: https://github.com/cynack/figni-viewer/compare/v0.0.29...v0.0.30
[0.0.29]: https://github.com/cynack/figni-viewer/compare/v0.0.28...v0.0.29
[0.0.28]: https://github.com/cynack/figni-viewer/compare/v0.0.27...v0.0.28
[0.0.27]: https://github.com/cynack/figni-viewer/compare/v0.0.26...v0.0.27
[0.0.26]: https://github.com/cynack/figni-viewer/compare/v0.0.25...v0.0.26
[0.0.25]: https://github.com/cynack/figni-viewer/compare/v0.0.24...v0.0.25
[0.0.24]: https://github.com/cynack/figni-viewer/compare/v0.0.23...v0.0.24
[0.0.23]: https://github.com/cynack/figni-viewer/compare/v0.0.22...v0.0.23
[0.0.22]: https://github.com/cynack/figni-viewer/compare/v0.0.21...v0.0.22
[0.0.21]: https://github.com/cynack/figni-viewer/compare/v0.0.20...v0.0.21
[0.0.20]: https://github.com/cynack/figni-viewer/compare/v0.0.19...v0.0.20
[0.0.19]: https://github.com/cynack/figni-viewer/compare/v0.0.18...v0.0.19
[0.0.18]: https://github.com/cynack/figni-viewer/compare/v0.0.17...v0.0.18
[0.0.17]: https://github.com/cynack/figni-viewer/compare/v0.0.16...v0.0.17
[0.0.16]: https://github.com/cynack/figni-viewer/compare/v0.0.15...v0.0.16
[0.0.15]: https://github.com/cynack/figni-viewer/compare/v0.0.14...v0.0.15
[0.0.14]: https://github.com/cynack/figni-viewer/compare/v0.0.13...v0.0.14
[0.0.13]: https://github.com/cynack/figni-viewer/releases/tag/v0.0.13
