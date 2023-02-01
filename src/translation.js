import { I18n } from 'i18n-js'
import yaml from 'js-yaml'

const i18n = new I18n()
i18n.defaultLocale = 'ja'
i18n.locale = navigator.language.slice(0, 2)
i18n.enableFallback = true
i18n.store(
  yaml.load(`
ja:
  button:
    reload: 再読み込み
  error:
    ItemNotFound: 商品が見つかりませんでした
    InvalidClientToken: トークンが無効です
    QuotaLimitReached: APIの使用制限に達しました
    Forbidden: アクセスが拒否されました
    NotSetItemIdOrClientToken: 商品IDまたはトークンが設定されていません
    NoModelFound: モデルが見つかりませんでした
    Unknown: エラーが発生しました

en:
  button:
    reload: Reload
  error:
    ItemNotFound: Item not found
    InvalidClientToken: Invalid token
    QuotaLimitReached: API quota limit reached
    Forbidden: Access denied
    NotSetItemIdOrClientToken: Item ID or token is not set
    NoModelFound: Model not found
    Unknown: An error occurred
`)
)

export function translate(key) {
  return i18n.t(key)
}
