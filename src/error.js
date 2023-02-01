import { translate } from './translation'

/**
 * エラー処理
 * @param {Object} err エラーオブジェクト
 * @return {string} エラーメッセージ
 */
export default async function (err) {
  if (err.name === 'HTTPError') {
    const error = (await err.response.json()).error
    switch (error) {
      case 'ErrItemNotFound': {
        return translate('error.ItemNotFound')
      }
      case 'ErrInvalidClientToken': {
        return translate('error.InvalidClientToken')
      }
      case 'ErrQuotaLimitReached': {
        return translate('error.QuotaLimitReached')
      }
      case 'ErrForbidden': {
        return translate('error.Forbidden')
      }
    }
  } else if (err.message) {
    return translate(`error.${err.message}`)
  }
  console.error(err)
  return { message: 'エラーが発生しました', code: 'ERR_UNKNOWN' }
}
