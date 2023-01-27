import { I18n } from 'i18n-js'
import path from 'path-browserify'
import ky from 'ky'
import yaml from 'js-yaml'

declare const TRANSLATIONS_FILE: string

const i18n = new I18n()
i18n.defaultLocale = 'ja'
i18n.locale = navigator.language.slice(0, 2)
i18n.enableFallback = true

export async function setupTranslation(): Promise<void> {
  i18n.store(yaml.load(await ky.get(path.join(TRANSLATIONS_FILE)).text()))
}

export function translate(key: string): string {
  return i18n.t(key)
}
