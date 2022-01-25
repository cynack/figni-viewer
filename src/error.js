/**
 * エラー処理
 * @param {Object} err エラーオブジェクト
 * @return {string} エラーメッセージ
 */
export function getErrorMessage(err) {
  if (err.response && err.response.data) {
    switch (err.response.data.error) {
      case 'ErrItemNotFound': {
        return '商品が見つかりませんでした(ERR_ITEM_NOT_FOUND)'
      }
      case 'ErrInvalidClientToken': {
        return 'トークンが無効です(ERR_INVALID_CLIENT_TOKEN)'
      }
      case 'ErrQuotaLimitReached': {
        return 'API利用回数が上限に達しました(ERR_QUOTA_LIMIT_REACHED)'
      }
    }
  }
  return 'エラーが発生しました(ERR_UNKNOWN)'
}
