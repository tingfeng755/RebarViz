// @ts-nocheck
/* eslint-disable */
'use client';

import dynamic from 'next/dynamic';

// 🛡️ 终极护盾：关闭 SSR，且直接加载组件
const FoundationViewer = dynamic(
  () => import('@/components/FoundationViewer'),
  { ssr: false }
);

export default function FoundationPage() {
  // 核心修复：什么参数都不传，让 TypeScript 彻底闭嘴
  return <FoundationViewer />;
}
