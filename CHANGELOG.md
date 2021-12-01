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

- *panel*を後から追加した場合に正しい挙動になるように修正

## [0.0.22] - 2021-12-01

### Fixed

- *hotspot*の機能およびスタイルが適切に適用されない場合がある問題を修正

## [0.0.21] - 2021-11-30

### Fixed

- `playAnimation`メソッドの`onstart`と`onend`のコールバックが正しく動作しない問題を修正

## [0.0.20] - 2021-11-29

### Added

- アニメーションを再生する`playAnimation`メソッドを追加
- アニメーションを停止する`stopAnimation`メソッドを追加

### Fixed

- `toggleVisibleHotspot`を呼び出したときにボタンが正しく切り替わらない問題を修正

## [0.0.19] - 2021-11-29

### Added

- *hotspot*の表示非表示を切り替えるボタンを追加
- *hotspot*の表示非表示を切り替える`toggleVisibleHotspot`メソッドを追加

## [0.0.18] - 2021-11-24

### Added

- *hotspot*を追加する`addHotspot`メソッドを追加
- *hotspot*の位置や機能を編集する`editHotspot`メソッドを追加
- *hotspot*を削除する`removeHotspot`メソッドを追加

### Fixed

- *hostpot*を後から追加した場合に正しい挙動になるように修正

## [0.0.17] - 2021-11-24

## [0.0.16] - 2021-11-22

### Changed

- *hotspot*のスタイルを上書きできるように変更
- *panel*のスタイルを上書きできるように変更
- カメラを初期位置に戻すボタンのスタイルを上書きできるように変更
- スクリーンショットボタンのスタイルを上書きできるように変更

## [0.0.15] - 2021-11-19

## [0.0.14] - 2021-11-19

## [0.0.13] - 2021-11-18

### Added

- *hotspot*の表示非表示を変化させる`to-state`属性を追加
- *hotspot*の表示非表示を決定する`visible`属性を追加

[unreleased]: https://github.com/cynack/figni-viewer/compare/v0.0.22...HEAD
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
