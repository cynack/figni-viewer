/**
 * エラー処理
 * @param {Object} err エラーオブジェクト
 * @return {{message: string, code: string}} エラーオブジェクト
 */
export function getError(err) {
  if (err.response && err.response.data) {
    switch (err.response.data.error) {
      case 'ErrItemNotFound': {
        return {
          message: '商品が見つかりませんでした',
          code: 'ERR_ITEM_NOT_FOUND',
        }
      }
      case 'ErrInvalidClientToken': {
        return {
          message: 'トークンが無効です',
          code: 'ERR_INVALID_CLIENT_TOKEN',
        }
      }
      case 'ErrQuotaLimitReached': {
        return {
          message: 'API利用回数が上限に達しました',
          code: 'ERR_QUOTA_LIMIT_REACHED',
        }
      }
    }
  }
  console.error(err)
  return { message: 'エラーが発生しました', code: 'ERR_UNKNOWN' }
}
