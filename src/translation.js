import { I18n } from 'i18n-js'
import yaml from 'js-yaml'
import ky from 'ky'
import path from '../assets/translations.yml'

const i18n = new I18n()
i18n.defaultLocale = 'ja'
i18n.locale = navigator.language.slice(0, 2)
i18n.enableFallback = true
i18n.missingTranslation.register('null', () => null)
i18n.missingBehavior = 'null'

export async function setup() {
  i18n.store(yaml.load(await ky.get(path).text()))
}

export function translate(key) {
  return i18n.t(key) || key
}

export function has(key) {
  return i18n.t(key) !== null
}
