/**
 * エラー処理
 * @param {Object} err エラーオブジェクト
 * @return {string} エラーメッセージ
 */
export function getErrorMessage(err) {
  if (err.response && err.response.data) {
    switch (err.response.data.error) {
      case 'ErrItemNotFound': {
        return '商品が見つかりませんでした'
      }
      case 'ErrInvalidClientToken': {
        return 'トークンが無効です'
      }
      case 'ErrQuotaLimitReached': {
        return 'API利用回数が上限に達しました'
      }
    }
  }
  return 'エラーが発生しました'
}
