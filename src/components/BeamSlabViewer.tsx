// @ts-nocheck
'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';

// 召唤核心 3D 画笔
const BeamViewer = dynamic(() => import('@/components/BeamViewer'), { ssr: false });

export default function BeamSlabViewer({ params, isMobile }) {
  // 状态控制：切换查看“底筋”还是“面筋”的规范
  const [activeTab, setActiveTab] = useState('bottom');

  return (
    <div className="flex flex-col lg:flex-row w-full h-full min-h-[80vh] bg-slate-50">
      
      {/* 👑 左侧：3D 核心渲染区 */}
      <div className="flex-1 relative border-r border-slate-200">
        <div className="absolute top-4 left-4 z-10 bg-blue-600 text-white px-4 py-2 rounded shadow-md font-bold">
          🚧 梁板节点：穿插与锚固 3D 坐标注入中...
        </div>
        {/* 暂时以梁为坐标系原点，下一步我们将在此强行注入板的钢筋网格 */}
        <BeamViewer params={params} isMobile={isMobile} />
      </div>

      {/* 📚 右侧：22G101 图集规范与计算公式面板 */}
      <div className="w-full lg:w-96 bg-white p-6 overflow-y-auto shadow-inner">
        <h2 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2">22G101 节点构造解析</h2>

        {/* 交互控制按钮 */}
        <div className="flex gap-2 mb-6">
           <button 
             onClick={() => setActiveTab('bottom')} 
             className={`px-4 py-2 rounded text-sm font-bold transition-colors ${activeTab === 'bottom' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
           >
             板底筋锚固
           </button>
           <button 
             onClick={() => setActiveTab('top')} 
             className={`px-4 py-2 rounded text-sm font-bold transition-colors ${activeTab === 'top' ? 'bg-pink-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
           >
             板面筋穿插
           </button>
        </div>

        {/* 动态内容区：底筋 */}
        {activeTab === 'bottom' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <h3 className="font-bold text-blue-800 mb-2">下部受力筋伸入端支座</h3>
              <p className="text-sm text-slate-600 mb-3">板底钢筋伸入支座内，必须伸过支座中心线，且满足直锚长度要求。</p>
              
              <div className="bg-white p-4 rounded border font-mono text-sm text-slate-800 flex justify-center overflow-x-auto shadow-sm">
                $$L_{bottom} \ge \max\left(\frac{b}{2}, 5d\right)$$
              </div>
              
              <ul className="text-xs text-slate-500 mt-3 list-disc pl-4 space-y-1">
                <li><span className="font-bold text-slate-700">b</span>: 端支座(梁)宽度</li>
                <li><span className="font-bold text-slate-700">d</span>: 板底钢筋直径</li>
              </ul>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
              💡 <strong>空间排布提示</strong>：在真实 3D 渲染中，双向板的短跨底筋位于最下层，长跨底筋紧贴其上。
            </div>
          </div>
        )}

        {/* 动态内容区：面筋 */}
        {activeTab === 'top' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="p-4 bg-pink-50 rounded-lg border border-pink-100">
              <h3 className="font-bold text-pink-800 mb-2">上部负弯矩筋构造</h3>
              <p className="text-sm text-slate-600 mb-3">面筋在端梁处需向下弯折直锚，且必须考虑保护层的绝对避让。</p>
              
              <div className="bg-white p-4 rounded border font-mono text-sm text-slate-800 flex justify-center shadow-sm">
                $$L_{bend} = 15d$$
              </div>
              
              <ul className="text-xs text-slate-500 mt-3 list-disc pl-4 space-y-1">
                <li><span className="font-bold text-slate-700">L_bend</span>: 向下弯折段长度</li>
                <li><span className="font-bold text-slate-700">d</span>: 板面钢筋直径</li>
              </ul>
              
              <div className="mt-5 pt-4 border-t border-pink-200">
                <p className="text-sm font-bold text-pink-900 flex items-center gap-1">
                  ⚠️ 3D 空间避让原则
                </p>
                <p className="text-xs text-slate-700 mt-2 leading-relaxed">
                  板面筋占据最上层空间。梁顶部主筋在实际绑扎时必须“下沉”，下沉高度为：<br/><br/>
                  <code className="bg-white px-2 py-1 rounded border text-pink-700 font-bold">下沉量 = 板保护层 + 板面筋直径</code>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
