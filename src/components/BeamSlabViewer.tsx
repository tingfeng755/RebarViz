// @ts-nocheck
'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// 使用绝对路径，防止迷路
const BeamViewer = dynamic(() => import('@/components/BeamViewer'), { ssr: false });

export default function BeamSlabViewer({ params, isMobile }) {
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
