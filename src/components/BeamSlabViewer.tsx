// @ts-nocheck
'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';

const BeamViewer = dynamic(() => import('@/components/BeamViewer'), { ssr: false });

// 🚧 听风专属：楼板与双向钢筋网 3D 阵列生成器
function SlabInjectionMesh({ params, onSelectSlab }) {
  const scale = 0.001; 
  const h = (params?.h || 600) * scale;      
  const span = (params?.spanLength || params?.span || 4000) * scale; 
  const slabT = 120 * scale; 
  const slabWidth = 2000 * scale; 
  const slabY = (h / 2) - (slabT / 2);
  const cover = 15 * scale; 
  const d = 14 * scale; 
  const bendL = 15 * d;     
  const spacing = 200 * scale; 

  const countZ = Math.floor(slabWidth / spacing);
  const startZ = -slabWidth / 2 + spacing / 2;
  const zPositions = Array.from({ length: countZ }).map((_, i) => startZ + i * spacing);

  const countX = Math.floor(span / spacing);
  const startX = -span / 2 + spacing / 2;
  const xPositions = Array.from({ length: countX }).map((_, i) => startX + i * spacing);

  const handleRebarClick = (e, info) => {
    e.stopPropagation(); 
    onSelectSlab(info);
  };

  const cursorProps = {
    onPointerOver: (e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; },
    onPointerOut: (e) => { document.body.style.cursor = 'auto'; }
  };

  return (
    <group>
      {/* 楼板 */}
      <mesh position={[0, slabY, 0]}>
        <boxGeometry args={[span, slabT, slabWidth]} />
        <meshStandardMaterial color="#38bdf8" transparent opacity={0.15} depthWrite={false} />
      </mesh>
      
      {/* 🔵 板底受力筋网 */}
      <group position={[0, slabY - (slabT/2) + cover + d/2, 0]}>
        {xPositions.map((x, i) => (
          <mesh 
            key={`bottom-x-${i}`} position={[x, 0, 0]} 
            onClick={(e) => handleRebarClick(e, { 
              name: '板底横向受力筋', spec: 'HRB400 Φ14 @200', 
              formula: 'L_bottom ≥ MAX(b/2, 5d)', calcLabel: '端部锚固', calcValue: '直锚入支座',
              desc: '主要承受板底正弯矩，位于最底层', color: 'bg-blue-600', uiColor: 'blue' 
            })}
            {...cursorProps}
          >
            <boxGeometry args={[d, d, slabWidth]} />
            <meshStandardMaterial color="#2563eb" /> 
          </mesh>
        ))}
        {zPositions.map((z, i) => (
          <mesh 
            key={`bottom-z-${i}`} position={[0, d, z]}
            onClick={(e) => handleRebarClick(e, { 
              name: '板底纵向分布筋', spec: 'HRB400 Φ14 @200', 
              formula: 'L_bottom ≥ MAX(b/2, 5d)', calcLabel: '端部锚固', calcValue: '直锚入支座',
              desc: '固定受力筋，形成钢筋网，紧贴受力筋上方', color: 'bg-blue-500', uiColor: 'blue' 
            })}
            {...cursorProps}
          >
            <boxGeometry args={[span, d, d]} />
            <meshStandardMaterial color="#60a5fa" /> 
          </mesh>
        ))}
      </group>

      {/* 🔴 板面负弯矩筋网 */}
      <group position={[0, (h / 2) - cover - d/2, 0]}>
         {xPositions.map((x, i) => (
          <group 
            key={`top-x-${i}`} position={[x, 0, 0]}
            onClick={(e) => handleRebarClick(e, { 
              name: '板面横向负弯矩筋', spec: 'HRB400 Φ14 @200', 
              formula: 'L_bend = 15d', calcLabel: '弯折长度 (15×14)', calcValue: '210 mm',
              desc: '承受支座负弯矩，端部有 15d 下弯锚固，位于最顶层', color: 'bg-pink-600', uiColor: 'pink' 
            })}
            {...cursorProps}
          >
            <mesh><boxGeometry args={[d, d, slabWidth]} /><meshStandardMaterial color="#db2777" /></mesh>
            <mesh position={[0, -bendL/2, -slabWidth/2 + d/2]}><boxGeometry args={[d, bendL, d]} /><meshStandardMaterial color="#db2777" /></mesh>
            <mesh position={[0, -bendL/2, slabWidth/2 - d/2]}><boxGeometry args={[d, bendL, d]} /><meshStandardMaterial color="#db2777" /></mesh>
          </group>
        ))}
        {zPositions.map((z, i) => (
          <group 
            key={`top-z-${i}`} position={[0, -d, z]}
            onClick={(e) => handleRebarClick(e, { 
              name: '板面纵向分布筋', spec: 'HRB400 Φ14 @200', 
              formula: 'L_bend = 15d', calcLabel: '弯折长度 (15×14)', calcValue: '210 mm',
              desc: '固定负弯矩筋，两端构造下弯，位于横向面筋下方', color: 'bg-pink-500', uiColor: 'pink' 
            })}
            {...cursorProps}
          >
            <mesh><boxGeometry args={[span, d, d]} /><meshStandardMaterial color="#f472b6" /></mesh>
            <mesh position={[-span/2 + d/2, -bendL/2, 0]}><boxGeometry args={[d, bendL, d]} /><meshStandardMaterial color="#f472b6" /></mesh>
            <mesh position={[span/2 - d/2, -bendL/2, 0]}><boxGeometry args={[d, bendL, d]} /><meshStandardMaterial color="#f472b6" /></mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

export default function BeamSlabViewer({ params, isMobile }) {
  const [activeTab, setActiveTab] = useState('bottom');
  const [selectedSlabRebar, setSelectedSlabRebar] = useState(null); 

  return (
    <div className="flex flex-col lg:flex-row w-full h-full min-h-[80vh] bg-slate-50 relative">
      
      {/* 👑 左侧：3D 核心渲染区 */}
      <div className="flex-1 relative border-r border-slate-200" style={{ minHeight: '500px' }}>
        <div className="absolute top-4 left-4 z-10 bg-emerald-600 text-white px-4 py-2 rounded shadow-md font-bold cursor-pointer">
          ✅ 梁板节点：真实 3D 穿插注入完成！
        </div>

        {/* 专属悬浮信息卡片（全面升级版） */}
        {selectedSlabRebar && (
          <div className="absolute top-16 right-4 z-20 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in slide-in-from-right-4 fade-in duration-300">
            {/* 卡片头部 */}
            <div className={`${selectedSlabRebar.color} px-4 py-3 flex justify-between items-center text-white`}>
              <h3 className="font-bold text-md flex items-center gap-2">
                <span>🔍</span> {selectedSlabRebar.name}
              </h3>
              <button 
                onClick={() => setSelectedSlabRebar(null)}
                className="hover:bg-black/20 rounded-full w-6 h-6 flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>
            
            {/* 卡片内容区 */}
            <div className="p-4 space-y-4">
              {/* 基础信息 */}
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <span className="text-slate-500 text-sm">规格间距</span>
                <span className="font-mono font-bold text-slate-800">{selectedSlabRebar.spec}</span>
              </div>
              
              {/* 核心亮点：图集公式区块 */}
              {selectedSlabRebar.formula && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-2">
                  <div className="flex justify-between items-center">
                     <span className="text-slate-500 text-xs font-bold">📚 22G101 构造公式</span>
                  </div>
                  <div className={`font-mono font-bold text-center p-2 rounded border ${selectedSlabRebar.uiColor === 'pink' ? 'bg-pink-50 border-pink-200 text-pink-700' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
                    {selectedSlabRebar.formula}
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-200/60 mt-2">
                    <span className="text-slate-500 text-sm">{selectedSlabRebar.calcLabel}</span>
                    <span className={`font-mono font-bold text-lg ${selectedSlabRebar.uiColor === 'pink' ? 'text-pink-600' : 'text-blue-600'}`}>
                      {selectedSlabRebar.calcValue}
                    </span>
                  </div>
                </div>
              )}

              {/* 构造说明 */}
              <div>
                <span className="text-slate-500 text-sm block mb-1">说明</span>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {selectedSlabRebar.desc}
                </p>
              </div>
            </div>
          </div>
        )}
        
        <BeamViewer params={params} isMobile={isMobile}>
           <SlabInjectionMesh params={params} onSelectSlab={setSelectedSlabRebar} />
        </BeamViewer>
      </div>

      {/* 📚 右侧：22G101 图集规范面板 */}
      <div className="w-full lg:w-96 bg-white p-6 overflow-y-auto shadow-inner">
        <h2 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2">22G101 节点构造解析</h2>
        <div className="flex gap-2 mb-6">
           <button onClick={() => setActiveTab('bottom')} className={`px-4 py-2 rounded text-sm font-bold transition-colors ${activeTab === 'bottom' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>板底筋锚固</button>
           <button onClick={() => setActiveTab('top')} className={`px-4 py-2 rounded text-sm font-bold transition-colors ${activeTab === 'top' ? 'bg-pink-600 text-white' : 'bg-slate-100 text-slate-600'}`}>板面筋穿插</button>
        </div>
        {activeTab === 'bottom' && (
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 space-y-3">
            <h3 className="font-bold text-blue-800">下部受力筋伸入端支座</h3>
            <div className="bg-white p-4 rounded border font-mono text-sm flex justify-center shadow-sm">{"L_bottom ≥ MAX( b/2, 5d )"}</div>
            <p className="text-xs text-slate-600 mt-2">💡 提示：在左侧 3D 画布中，点击蓝色的板底钢筋可查看详细排布信息！</p>
          </div>
        )}
        {activeTab === 'top' && (
          <div className="p-4 bg-pink-50 rounded-lg border border-pink-100 space-y-3">
            <h3 className="font-bold text-pink-800">上部负弯矩筋构造</h3>
            <div className="bg-white p-4 rounded border font-mono text-sm flex justify-center shadow-sm">{"L_bend = 15d"}</div>
            <p className="text-xs text-slate-600 mt-2">⚠️ 在左侧画布中，点击粉色的板面钢筋，查看其 15d 弯折及避让梁主筋的构造说明！</p>
          </div>
        )}
      </div>
    </div>
  );
}
