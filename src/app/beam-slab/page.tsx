import type { Metadata } from 'next';
import { Suspense } from 'react';
// 注意看下面这行！我们把 ./ 改成了 ../beam/ ，意思是去隔壁借用引擎！
import { BeamPageClient } from '../beam/BeamPageClient';

export const metadata: Metadata = {
  title: '梁板节点 - 3D 配筋可视化 | RebarViz',
  description: '听风专属定制：在线查看梁板节点 3D 配筋构造。',
};

export default function BeamSlabPage() {
  return (
    <Suspense>
      <BeamPageClient />
    </Suspense>
  );
}
