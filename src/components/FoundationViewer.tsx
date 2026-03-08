// @ts-nocheck
'use client';

import React, { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import * as THREE from 'three';

// 借用底层的 3D 画布环境
const BeamViewer = dynamic(() => import('@/components/BeamViewer'), { ssr: false });

// 🚧 听风专属：柱-基础 3D 节点生成引擎
function FoundationInjectionMesh({ config, onSelect }) {
  const scale = 0.001; 

  // 读取参数并进行毫米到米的转换
  const foundH = config.foundH * scale;
  const foundL = config.foundL * scale;
  const foundB = config.foundB * scale;
  const cover = config.cover * scale;
  
  const colB = config.colB * scale;
  const colH = config.colH * scale;
  const colD = config.colD * scale;
  const r = colD / 2;
  
  // 核心计算 1：柱插筋的底部 Y 坐标 (基础高度 - 底部保护层 - 预留底板钢筋厚度)
  const bottomY = -foundH + cover + (config.foundD * 2 * scale);
  // 柱子向上伸出的高度 (模拟伸出基础面 1.2 米)
  const topY = 1.2; 
  const rebarLength = topY - bottomY;
  const rebarCenterY = bottomY + rebarLength / 2;

  // 核心计算 2：图集规范弯折长度 max(6d, 150mm)
  const bendLength_mm = Math.max(6 * config.colD, 150);
  const bendL = bendLength_mm * scale;

  // 算法：生成柱周边纵筋的坐标 (简化版：四角 + 四边中点，共8根)
  const colRebarPos = [
    { x: -colB/2 + cover, z: -colH/2 + cover, dirX: -1, dirZ: -1 }, // 左上角
    { x: colB/2 - cover,  z: -colH/2 + cover, dirX: 1,  dirZ: -1 }, // 右上角
    { x: -colB/2 + cover, z: colH/2 - cover,  dirX: -1, dirZ: 1 },  // 左下角
    { x: colB/2 - cover,  z: colH/2 - cover,  dirX: 1,  dirZ: 1 },  // 右下角
    { x: 0,               z: -colH/2 + cover, dirX: 0,  dirZ: -1 }, // 上中
    { x: 0,               z: colH/2 - cover,  dirX: 0,  dirZ: 1 },  // 下中
    { x: -colB/2 + cover, z: 0,               dirX: -1, dirZ: 0 },  // 左中
    { x: colB/2 - cover,  z: 0,               dirX: 1,  dirZ: 0 },  // 右中
  ];

  // 算法：基础内定位箍筋 (至少两道，距底 100mm 一道，基础顶面下一道)
  const stirrupPositions = [
    bottomY + 0.1, // 距底 100mm
    -0.1           // 距基础顶 100mm
  ];

  const handleRebarClick = (e, info) => {
    e.stopPropagation(); 
    onSelect(info);
  };

  const cursorProps = {
    onPointerOver: (e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; },
    onPointerOut: (e) => { document.body.style.cursor = 'auto'; }
  };

  return (
    <group position={[0, foundH/2, 0]}> {/* 整体抬高，让基础顶面位于 Y=0 */}
      
      {/* 1. 浇筑独立基础混凝土 (半透明蓝色) */}
      <mesh position={[0, -foundH/2, 0]}>
        <boxGeometry args={[foundL, foundH, foundB]} />
        <meshStandardMaterial color="#38bdf8" transparent opacity={0.15} depthWrite={false} />
      </mesh>
      
      {/* 2. 浇筑框架柱混凝土 (半透明灰色) */}
      <mesh position={[0, topY/2, 0]}>
        <boxGeometry args={[colB, topY, colH]} />
        <meshStandardMaterial color="#94a3b8" transparent opacity={0.2} depthWrite={false} />
      </mesh>

      {/* 3. 🔴 框架柱纵筋插筋 (带底部弯折) */}
      <group>
        {colRebarPos.map((pos, i) => (
          <group 
            key={`col-rebar-${i}`} 
            onClick={(e) => handleRebarClick(e, {
              name: '柱纵向插筋 (生根构造)', spec: `HRB400 Φ${config.colD}`,
              formula: 'L_bend = max(6d, 150)', calcLabel: `弯折长度 (6×${config.colD})`, calcValue: `${bendLength_mm} mm`,
              desc: '柱纵筋伸至基础底部钢筋网片之上，并向外弯折。', color: 'bg-red-600', uiColor: 'red'
            })}
            {...cursorProps}
          >
            {/* 竖向直段 */}
            <mesh position={[pos.x, rebarCenterY, pos.z]}>
              <cylinderGeometry args={[r, r, rebarLength, 8]} />
              <meshStandardMaterial color="#dc2626" />
            </mesh>
            {/* 底部 90度 弯折段 (向外弯折) */}
            <mesh 
              position={[pos.x + (bendL/2)*pos.dirX, bottomY + r, pos.z + (bendL/2)*pos.dirZ]}
              rotation={[pos.dirZ !== 0 ? Math.PI/2 : 0, 0, pos.dirX !== 0 ? Math.PI/2 : 0]}
            >
              <cylinderGeometry args={[r, r, bendL, 8]} />
              <meshStandardMaterial color="#dc2626" />
            </mesh>
          </group>
        ))}
      </group>

      {/* 4. 🟢 基础内部定位箍筋 */}
      <group>
        {stirrupPositions.map((y, i) => (
          <mesh 
            key={`stirrup-${i}`} position={[0, y, 0]}
            onClick={(e) => handleRebarClick(e, {
              name: '基础内定位箍筋', spec: 'HRB400 Φ10',
              formula: '不少于两道，间距 ≤ 500', calcLabel: '基础内设置要求', calcValue: '必须设置',
              desc: '在独立基础高度范围内，必须设置不少于两道矩形封闭箍筋，以固定柱纵筋位置，防止浇筑混凝土时钢筋位移。', color: 'bg-green-600', uiColor: 'green'
            })}
            {...cursorProps}
          >
            {/* 用 TubeGeometry 画一个方形空心管来模拟箍筋 */}
            <boxGeometry args={[colB - cover*2 + r*2, colD*scale, colH - cover*2 + r*2]} />
            <meshStandardMaterial color="#16a34a" wireframe={true} />
          </mesh>
        ))}
      </group>

    </group>
  );
}

// === 下面是面板组件（注入了弹窗 UI） ===
export default function FoundationViewer({ params: initialParams, isMobile }) {
  const [activeTab, setActiveTab] = useState('column');
  const [selectedRebar, setSelectedRebar] = useState(null);

  const [config, setConfig] = useState({
    foundL: 2000, foundB: 2000, foundH: 600,
    foundD: 14, foundSpacing: 200, 
    colB: 500, colH: 500,
    colD: 25, colCount: 8,
    concGrade: 'C30', seismicGrade: '二级', cover: 40
  });

  return (
    <div className="flex flex-col lg:flex-row w-full h-full min-h-[80vh] bg-slate-50 relative">
      
      {/* 👑 左侧：3D 核心渲染区 */}
      <div className="flex-1 relative border-r border-slate-200" style={{ minHeight: '500px' }}>
        <div className="absolute top-4 left-4 z-10 bg-indigo-600 text-white px-4 py-2 rounded shadow-md font-bold cursor-pointer hover:bg-indigo-700">
          ✅ 柱生根节点：3D 穿插注入完成！
        </div>

        {/* 专属悬浮信息卡片 */}
        {selectedRebar && (
          <div className="absolute top-16 right-4 z-20 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in slide-in-from-right-4 fade-in duration-300">
            <div className={`${selectedRebar.color} px-4 py-3 flex justify-between items-center text-white`}>
              <h3 className="font-bold text-md flex items-center gap-2"><span>🔍</span> {selectedRebar.name}</h3>
              <button onClick={() => setSelectedRebar(null)} className="hover:bg-black/20 rounded-full w-6 h-6 flex items-center justify-center transition-colors">✕</button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <span className="text-slate-500 text-sm">规格参数</span>
                <span className="font-mono font-bold text-slate-800">{selectedRebar.spec}</span>
              </div>
              {selectedRebar.formula && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-2">
                  <div className="flex justify-between items-center">
                     <span className="text-slate-500 text-xs font-bold">📚 22G101 构造公式</span>
                  </div>
                  <div className={`font-mono font-bold text-center p-2 rounded border ${selectedRebar.uiColor === 'red' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
                    {selectedRebar.formula}
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-200/60 mt-2">
                    <span className="text-slate-500 text-sm">{selectedRebar.calcLabel}</span>
                    <span className={`font-mono font-bold text-lg ${selectedRebar.uiColor === 'red' ? 'text-red-600' : 'text-green-600'}`}>
                      {selectedRebar.calcValue}
                    </span>
                  </div>
                </div>
              )}
              <div>
                <span className="text-slate-500 text-sm block mb-1">说明</span>
                <p className="text-sm text-slate-700 leading-relaxed">{selectedRebar.desc}</p>
              </div>
            </div>
          </div>
        )}
        
        <BeamViewer params={initialParams} isMobile={isMobile}>
           <FoundationInjectionMesh config={config} onSelect={setSelectedRebar} />
        </BeamViewer>
      </div>

      {/* 📚 右侧：专属控制中心 */}
      <div className="w-full lg:w-96 bg-white p-6 overflow-y-auto shadow-inner">
        <div className="mb-6 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 shadow-sm">
           <h3 className="font-bold text-blue-900 mb-4 flex items-center gap-2"><span>🎛️</span> 22G101 参数化控制台</h3>
           <div className="space-y-4">
              <div className="pt-2 border-t border-blue-200/50">
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2">22G101-1 柱插筋生根</p>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-slate-500">柱截面 b (mm)</label>
                    <input type="number" step="50" value={config.colB} onChange={e => { setConfig({...config, colB: Number(e.target.value)}); setSelectedRebar(null); }} className="p-1 border rounded text-sm font-mono focus:ring-1 focus:ring-indigo-400 outline-none" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-slate-500">柱截面 h (mm)</label>
                    <input type="number" step="50" value={config.colH} onChange={e => { setConfig({...config, colH: Number(e.target.value)}); setSelectedRebar(null); }} className="p-1 border rounded text-sm font-mono focus:ring-1 focus:ring-indigo-400 outline-none" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-slate-500">纵筋直径 D (mm)</label>
                    <input type="number" step="2" value={config.colD} onChange={e => { setConfig({...config, colD: Number(e.target.value)}); setSelectedRebar(null); }} className="p-1 border rounded text-sm font-mono focus:ring-1 focus:ring-indigo-400 outline-none" />
                  </div>
                </div>
              </div>
           </div>
        </div>

        <div className="flex gap-2 mb-4">
           <button onClick={() => setActiveTab('foundation')} className={`flex-1 py-2 rounded text-xs font-bold transition-all ${activeTab === 'foundation' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600'}`}>基础构造</button>
           <button onClick={() => setActiveTab('column')} className={`flex-1 py-2 rounded text-xs font-bold transition-all ${activeTab === 'column' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-600'}`}>柱筋生根</button>
        </div>

        {activeTab === 'foundation' && (
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 space-y-3">
            <h4 className="font-bold text-blue-800 text-sm italic">22G101-3 独立基础</h4>
            <p className="text-xs text-slate-600 leading-relaxed">底板双向受力筋算法即将注入，敬请期待...</p>
          </div>
        )}
        {activeTab === 'column' && (
          <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100 space-y-3">
            <h4 className="font-bold text-indigo-800 text-sm italic">柱纵筋在基础中生根</h4>
            <div className="bg-white p-2 rounded border font-mono text-[10px] text-center text-indigo-700 shadow-sm">L_bend = max(6d, 150mm)</div>
            <p className="text-xs text-slate-600 leading-relaxed">💡 提示：在左侧 3D 画布中，点击红色的柱纵筋或绿色的箍筋，查看详细锚固规范！</p>
          </div>
        )}
      </div>
    </div>
  );
}
