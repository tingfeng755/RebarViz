// @ts-nocheck
'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';

// 这是一个临时的 3D 占位符，等下一波指令我们就往这里塞模型
const BeamViewer = dynamic(() => import('@/components/BeamViewer'), { ssr: false });

export default function FoundationViewer({ params: initialParams, isMobile }) {
  const [activeTab, setActiveTab] = useState('foundation');
  const [selectedRebar, setSelectedRebar] = useState(null);

  // 1. 核心状态机：管理 22G101-1/3 全系列参数
  const [config, setConfig] = useState({
    // 基础尺寸
    foundL: 2000, foundB: 2000, foundH: 600,
    foundD: 14, foundSpacing: 200, // 基础底筋
    // 柱插筋
    colB: 500, colH: 500,
    colD: 20, colCount: 8,
    // 材料环境
    concGrade: 'C30', seismicGrade: '二级', cover: 40
  });

  return (
    <div className="flex flex-col lg:flex-row w-full h-full min-h-[80vh] bg-slate-50 relative">
      
      {/* 👑 左侧：3D 渲染区（暂用占位符，准备接收模型） */}
      <div className="flex-1 relative border-r border-slate-200" style={{ minHeight: '500px' }}>
        <div className="absolute top-4 left-4 z-10 bg-blue-600 text-white px-4 py-2 rounded shadow-md font-bold">
          🏗️ 柱-基础节点：全图集 3D 实验室
        </div>
        
        {/* 占位渲染 */}
        <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-400">
           模型加载中：等待底板钢筋网算法注入...
        </div>
      </div>

      {/* 📚 右侧：专属控制中心 */}
      <div className="w-full lg:w-96 bg-white p-6 overflow-y-auto shadow-inner">
        
        {/* 🎛️ 听风专属：全图集动态调节面板 */}
        <div className="mb-6 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 shadow-sm">
           <h3 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
             <span>🎛️</span> 22G101 参数化控制台
           </h3>
           
           <div className="space-y-4">
              {/* 基础部分 */}
              <div className="pt-2 border-t border-blue-200/50">
                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">22G101-3 独立基础</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-slate-500">基础高度 h (mm)</label>
                    <input type="number" value={config.foundH} onChange={e => setConfig({...config, foundH: Number(e.target.value)})} className="p-1 border rounded text-sm font-mono focus:ring-1 focus:ring-blue-400 outline-none" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-slate-500">底筋直径 d (mm)</label>
                    <input type="number" value={config.foundD} onChange={e => setConfig({...config, foundD: Number(e.target.value)})} className="p-1 border rounded text-sm font-mono focus:ring-1 focus:ring-blue-400 outline-none" />
                  </div>
                </div>
              </div>

              {/* 柱插筋部分 */}
              <div className="pt-2 border-t border-blue-200/50">
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2">22G101-1 柱插筋生根</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-slate-500">柱截面 b (mm)</label>
                    <input type="number" value={config.colB} onChange={e => setConfig({...config, colB: Number(e.target.value)})} className="p-1 border rounded text-sm font-mono focus:ring-1 focus:ring-indigo-400 outline-none" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-slate-500">纵筋直径 D (mm)</label>
                    <input type="number" value={config.colD} onChange={e => setConfig({...config, colD: Number(e.target.value)})} className="p-1 border rounded text-sm font-mono focus:ring-1 focus:ring-indigo-400 outline-none" />
                  </div>
                </div>
              </div>
           </div>
        </div>

        {/* 📚 节点构造解析选卡 */}
        <div className="flex gap-2 mb-4">
           <button onClick={() => setActiveTab('foundation')} className={`flex-1 py-2 rounded text-xs font-bold transition-all ${activeTab === 'foundation' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600'}`}>基础构造</button>
           <button onClick={() => setActiveTab('column')} className={`flex-1 py-2 rounded text-xs font-bold transition-all ${activeTab === 'column' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-600'}`}>柱筋生根</button>
        </div>

        {activeTab === 'foundation' && (
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 space-y-3 animate-in fade-in duration-300">
            <h4 className="font-bold text-blue-800 text-sm italic">22G101-3 独立基础底板配筋</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              基础底板双向受力筋，应执行“短向在下，长向在上”原则。边缘需满足锚固构造，网片交叉点需全数绑扎。
            </p>
          </div>
        )}

        {activeTab === 'column' && (
          <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100 space-y-3 animate-in fade-in duration-300">
            <h4 className="font-bold text-indigo-800 text-sm italic">柱纵筋在基础中生根</h4>
            <div className="bg-white p-2 rounded border font-mono text-[10px] text-center text-indigo-700 shadow-sm">
              L_bend = max(6d, 150mm)
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              柱纵筋应伸至基础底部钢筋网片之上，其末端应向基础外侧做 90° 弯折构造。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
