/// <reference types="react" />

declare module 'react/compiler-runtime' {
  export function c(count: number): (value: unknown) => unknown
}
