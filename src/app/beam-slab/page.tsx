import type { Metadata } from 'next';
import { Suspense } from 'react';
// 引入我们刚刚造好的专属控制台！
import { BeamSlabPageClient } from './BeamSlabPageClient';

export const metadata: Metadata = {
  title: '梁板节点 - 3D 配筋可视化 | RebarViz',
  description: '听风专属定制：在线查看梁板节点 3D 配筋构造。',
};

export default function BeamSlabPage() {
  return (
    <Suspense>
      <BeamSlabPageClient />
    </Suspense>
  );
}
