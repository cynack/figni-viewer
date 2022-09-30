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
      case 'ErrForbidden': {
        return {
          message: 'アクセスが拒否されました',
          code: 'ERR_FORBIDDEN',
        }
      }
    }
  }
  if (err.message) {
    switch (err.message) {
      case 'ErrNotSetItemIdOrClientToken': {
        return {
          message: '商品IDまたはトークンが設定されていません',
          code: 'ERR_NOT_SET_ITEM_ID_OR_CLIENT_TOKEN',
        }
      }
      case 'ErrNoModelFound': {
        return {
          message: 'モデルが見つかりませんでした',
          code: 'ERR_NO_MODEL_FOUND',
        }
      }
    }
  }
  console.error(err)
  return { message: 'エラーが発生しました', code: 'ERR_UNKNOWN' }
}
