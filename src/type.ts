export type LoadModelOptions = {
  tags: string[]
  staging: boolean
}

export type LoadModelResponse = {
  id: string
  tag: string
  url: string
  format: 'glb' | 'usdz'
}[]

export interface ModelViewerProgressEvent extends Event {
  detail: {
    totalProgress: number
  }
}
