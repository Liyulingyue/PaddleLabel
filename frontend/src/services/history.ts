import { getDiff, applyDiff, type rdiffResult } from 'recursive-diff';
import { RpcApi } from './api';
import { message } from 'antd';

export const MOST_HISTORY_STEPS = 40;
export type HistoryType = {
  undos: (string)[];
  redos: (string)[];
};

export function HistoryUtils(_rpcApi: typeof RpcApi) {
  const init = () => {
    localStorage.removeItem('history');
    localStorage.setItem('history', JSON.stringify({ undos: [], redos: [] }));
  };

  const record = async (prevState: any, currState: any) => {
    const diff: rdiffResult[] = getDiff(prevState, currState);
    if (diff.length === 0) return;
    const historyStr = localStorage.getItem('history');
    const history: HistoryType = historyStr ? JSON.parse(historyStr) : { undos: [], redos: [] };
    history.redos = [];
    const diffStr = JSON.stringify(diff);
    history.undos.push(diffStr.length > 1000 ? diffStr : JSON.stringify(diff));
    localStorage.setItem('history', JSON.stringify(history));
  };

  const forward = async (prevState: any, setPrev: (s: any) => void) => {
    const historyStr = localStorage.getItem('history');
    if (!historyStr) { message.error('history string not saved'); return; }
    const history: HistoryType = JSON.parse(historyStr);
    if (!history || history.redos.length === 0) { message.error('No next state to redo'); return; }
    const diffStr = history.redos.pop()!;
    const diff: rdiffResult[] = JSON.parse(diffStr);
    const curr = applyDiff(JSON.parse(JSON.stringify(prevState)), diff);
    const newDiff = JSON.stringify(getDiff(curr, prevState));
    history.undos.push(newDiff);
    setPrev(curr);
    localStorage.setItem('history', JSON.stringify(history));
    return curr;
  };

  const backward = async (prevState: any, setPrev: (s: any) => void) => {
    const historyStr = localStorage.getItem('history');
    if (!historyStr) { message.error('history string not found'); return; }
    const history: HistoryType = JSON.parse(historyStr);
    if (!history || history.undos.length === 0) { message.error('No previous state to undo'); return; }
    const diffStr = history.undos.pop()!;
    const diff: rdiffResult[] = JSON.parse(diffStr);
    const curr = applyDiff(JSON.parse(JSON.stringify(prevState)), diff);
    history.redos.push(JSON.stringify(getDiff(curr, prevState)));
    setPrev(curr);
    localStorage.setItem('history', JSON.stringify(history));
    return curr;
  };

  return { init, record, forward, backward };
}
