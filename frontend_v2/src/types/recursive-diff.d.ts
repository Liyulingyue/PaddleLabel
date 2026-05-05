declare module 'recursive-diff' {
  export interface rdiffResult {
    path: (string | number)[];
    op: 'add' | 'remove' | 'update';
    val?: any;
  }
  export function getDiff<T = any>(oldArr: T[], newArr: T[]): rdiffResult[];
  export function applyDiff<T = any>(arr: T[], diff: rdiffResult[]): T[];
}
