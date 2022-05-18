/**
 * 経過時間などを計測、累積、取得する
 */
const db = {}

/**
 * 時間の計測を開始する
 * @param {string} name 計測している時間の名前
 */
export function startMesure(name) {
  if (!db[name]) {
    db[name] = { mark: 0, sum: 0 }
  }
  db[name].mark = performance.now()
}

/**
 * 時間の計測を終了する
 * @param {string} name 計測していた時間の名前
 */
export function endMesure(name) {
  if (!db[name]) {
    return
  }
  const { mark, sum } = db[name]
  const elapsed = performance.now() - mark
  db[name].sum = sum + elapsed
  db[name].mark = 0
}

/**
 * 任意の計測している時間の現在までの経過時間の累積を取得する
 * @param {string} name 計測している時間の名前
 * @return {number} 経過時間の累積
 */
export function getElapsedTime(name) {
  if (!db[name]) {
    return 0
  }
  const { mark, sum } = db[name]
  let ret = sum
  if (mark) {
    const elapsed = performance.now() - mark
    ret += elapsed
  }
  return ret
}