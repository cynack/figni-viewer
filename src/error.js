/**
 * エラー処理
 * @param {Object} err エラーオブジェクト
 * @param {HTMLElement} msg エラーメッセージを表示する要素
 */
export function handleError(err, msg) {
  if (err.response && err.response.data) {
    switch (err.response.data.error) {
      case 'ErrItemNotFound': {
        msg.innerText = '商品が見つかりませんでした'
        return
      }
      case 'ErrInvalidClientToken': {
        msg.innerText = 'トークンが無効です'
        return
      }
      case 'ErrQuotaLimitReached': {
        msg.innerText = 'API利用回数が上限に達しました'
        return
      }
    }
  }
  msg.innerText = 'エラーが発生しました'
}
