'use client';

import dynamic from 'next/dynamic';

// 🛡️ 终极护盾：强行告诉 Next.js 服务器“不要碰这个 3D 组件”！只允许在用户浏览器里加载！
const FoundationViewer = dynamic(
  () => import('@/components/FoundationViewer'),
  { ssr: false }
);

export default function FoundationPage() {
  return <FoundationViewer params={{}} isMobile={false} />;
}
