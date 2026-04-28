/// <reference types="bun" />

declare module '*.md' {
  const content: string
  export default content
}

declare module '*.png' {
  const content: string
  export default content
}

declare module '*.json' {
  const content: unknown
  export default content
}
