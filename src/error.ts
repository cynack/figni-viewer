import { translate } from './translation'

export default function (err: Error): string {
  return translate('error.' + err.message)
}
