'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// 核心修复：加装延迟启动器！告诉机器不要在服务器端渲染 3D 画布
const BeamViewer = dynamic(() => import('./BeamViewer'), { ssr: false });

// 忽略 ts 类型检查，防止严格模式报错
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function BeamSlabViewer({ params, isMobile = false }: { params: any, isMobile?: boolean }) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* 底层放板：纯文字占位 */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
         <div style={{position:'absolute', top:'30%', left:'50%', transform:'translate(-50%, -50%)', color:'#ff1493', fontSize:'28px', fontWeight:'900', zIndex: 100, textShadow: '2px 2px 4px rgba(0,0,0,0.5)'}}>
             [🚧 听风专属：虚拟楼板已浇筑 🚧]
         </div>
      </div>
      
      {/* 顶层放梁：正常召唤 3D 梁 */}
      <div style={{ position: 'relative', width: '100%', height: '100%', zIndex: 10 }}>
        <BeamViewer params={params} isMobile={isMobile} />
      </div>
    </div>
  );
}
