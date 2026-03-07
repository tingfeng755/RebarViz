'use client';

import React from 'react';
import BeamViewer from './BeamViewer';
import SlabViewer from './SlabViewer'; // 假设原项目里画板的组件叫这个

// 这个组件接收梁的参数，并且顺带附赠一块板！
export default function BeamSlabViewer({ params, isMobile = false }: any) {
  // 我们强行制造一块演示用的楼板参数
  const dummySlabParams = {
    length: params.span || 4000,
    width: 2000,
    thickness: 120,
    bottomX: { type: 'HRB400', diameter: 8, spacing: 200 },
    bottomY: { type: 'HRB400', diameter: 8, spacing: 200 },
    topX: { type: 'HRB400', diameter: 8, spacing: 200 },
    topY: { type: 'HRB400', diameter: 8, spacing: 200 },
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* 底层放板 */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.8, pointerEvents: 'none' }}>
         {/* 暂时不用真实的 SlabViewer，我们先用文字占位测试引擎是否能重叠 */}
         <div style={{position:'absolute', top:'50%', left:'50%', transform:'translate(-50%, -50%)', color:'pink', fontSize:'24px', fontWeight:'bold', zIndex: 100}}>
             [🚧 虚拟楼板已浇筑 🚧]
         </div>
      </div>
      
      {/* 顶层放梁 */}
      <div style={{ position: 'relative', width: '100%', height: '100%', zIndex: 10 }}>
        <BeamViewer params={params} isMobile={isMobile} />
      </div>
    </div>
  );
}
