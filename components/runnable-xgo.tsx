'use client';

import { Play } from 'lucide-react';
import { useId, useState } from 'react';

const messages = {
  en: {
    summary: 'Try this example',
    editor: 'XGo source',
    run: 'Run',
    running: 'Running…',
    output: 'Program output',
    noOutput: 'Program finished without output.',
    exitCode: 'Program exited with status',
    failed: 'Could not reach the XGo Playground. Try again or run the example locally.',
    service: 'Run sends the editor contents to the official XGo Playground.',
  },
  'zh-CN': {
    summary: '在线运行示例',
    editor: 'XGo 源代码',
    run: '运行',
    running: '正在运行…',
    output: '程序输出',
    noOutput: '程序已结束，未产生输出。',
    exitCode: '程序退出状态',
    failed: '无法连接 XGo Playground。请重试，或在本地运行此示例。',
    service: '点击运行后，编辑器中的代码会发送到官方 XGo Playground。',
  },
};

type RunResponse = {
  Events?: { Message: string }[];
  Errors?: string;
  Status?: number;
};

type Locale = keyof typeof messages;

export function RunnableXGo({ initialSource, locale }: { initialSource: string; locale: Locale }) {
  const sourceId = useId();
  const message = messages[locale];
  const [source, setSource] = useState(initialSource);
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);
  const [failed, setFailed] = useState(false);
  const canRun = !running && source.trim().length > 0;

  async function run() {
    if (!canRun) return;
    setRunning(true);
    setFailed(false);
    setOutput(message.running);
    try {
      const response = await fetch('https://seplay.xgo.dev/compile', {
        method: 'POST',
        body: new URLSearchParams({ version: '2', body: source, withVet: 'false', goplus: 'true' }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw new Error('Playground request failed');
      const result: RunResponse = await response.json();
      const events = result.Events?.map((event) => event.Message).join('') ?? '';
      const error = result.Errors || (result.Status ? message.exitCode + ' ' + result.Status : '');
      setFailed(Boolean(error));
      setOutput([events.trimEnd(), error].filter(Boolean).join('\n') || message.noOutput);
    } catch {
      setFailed(true);
      setOutput(message.failed);
    } finally {
      setRunning(false);
    }
  }

  return (
    <details className="runnable-xgo not-prose">
      <summary>{message.summary}</summary>
      <div className="runnable-xgo__panel">
        <label htmlFor={sourceId}>{message.editor}</label>
        <textarea
          id={sourceId}
          value={source}
          onChange={(event) => setSource(event.target.value)}
          rows={Math.min(Math.max(initialSource.split('\n').length + 1, 4), 15)}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          wrap="off"
          dir="ltr"
        />
        <div className="runnable-xgo__actions">
          <button type="button" onClick={run} aria-disabled={!canRun}>
            <Play aria-hidden="true" size={14} />
            {message.run}
          </button>
          <p>{message.service}</p>
        </div>
        <div aria-label={message.output} role="status">
          {output && <pre data-failed={failed || undefined}>{output}</pre>}
        </div>
      </div>
    </details>
  );
}
