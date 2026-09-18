import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { FloatWindow } from './float/FloatWindow.tsx';
import { blocks } from './data/store.ts';

// 开发时在控制台里直接写数据用（纯浏览器预览没有开发面板的窗口）
if (import.meta.env.DEV) (window as unknown as { __kali: typeof blocks }).__kali = blocks;

// 同一个前端跑两个窗口：主窗口是 App，带 ?float 的是常驻悬浮窗
const isFloat = new URLSearchParams(location.search).has('float');
if (isFloat) document.documentElement.dataset.win = 'float';

createRoot(document.getElementById('root')!).render(<StrictMode>{isFloat ? <FloatWindow /> : <App />}</StrictMode>);
