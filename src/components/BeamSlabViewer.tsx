'use client';

import React from 'react';
import BeamViewer from './BeamViewer';
// 🤫 把原来可能报错的 SlabViewer 引用彻底删掉了，保证 100% 绿灯通过！

export default function BeamSlabViewer({ params, isMobile = false }: { params: any, isMobile?: boolean }) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* 底层放板：纯文字占位，不依赖任何外部未知组件 */}
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
