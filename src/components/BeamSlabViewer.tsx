// @ts-nocheck
'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// 召唤两大核心 3D 画笔！
const BeamViewer = dynamic(() => import('@/components/BeamViewer'), { ssr: false });
const SlabViewer = dynamic(() => import('@/components/SlabViewer'), { ssr: false });

// 从原作者的保险箱里，偷出一块标准的楼板参数图纸
import { SLAB_PRESETS } from '@/lib/rebar';

export default function BeamSlabViewer({ params, isMobile }) {
  // 加载标准楼板参数，防止渲染器罢工
  const slabParams = SLAB_PRESETS.standard;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', minHeight: '80vh' }}>
      
      {/* 👑 上半屏：梁的 3D 视图 */}
      <div style={{ flex: 1, position: 'relative', borderBottom: '4px dashed #cbd5e1', background: '#f8fafc' }}>
        {/* 听风专属 UI 标签 */}
        <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 10, background: 'linear-gradient(to right, #3b82f6, #2dd4bf)', color: 'white', padding: '6px 16px', borderRadius: '8px', fontWeight: 'bold', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          🔍 梁 KL - 节点主骨架
        </div>
        <BeamViewer params={params} isMobile={isMobile} />
      </div>

      {/* 👑 下半屏：楼板的 3D 视图 */}
      <div style={{ flex: 1, position: 'relative', background: '#f1f5f9' }}>
         {/* 听风专属 UI 标签 */}
         <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 10, background: 'linear-gradient(to right, #ec4899, #f43f5e)', color: 'white', padding: '6px 16px', borderRadius: '8px', fontWeight: 'bold', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          🔍 板 LB - 节点穿插层
        </div>
        <SlabViewer params={slabParams} isMobile={isMobile} />
      </div>

    </div>
  );
}
