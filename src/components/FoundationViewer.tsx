// @ts-nocheck
/* eslint-disable */
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';

// 🚀 听风专属：CNC 级精密柔性曲线管道（真·无缝钢筋）
function TubePath({ points, radius, color }) {
  // 使用 centripetal 类型防止曲线打结，点数给够就能完美圆滑
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5), [points]);
  return (
    <mesh>
      {/* 提升了管壁圆滑度，参数为 [曲线, 管道分段数, 半径, 圆周分段数, 是否闭合] */}
      <tubeGeometry args={[curve, 64, radius, 12, false]} />
      <meshStandardMaterial color={color} roughness={0.4} metalness={0.6} />
    </mesh>
  );
}

// 🚧 柱-基础 原生 3D 节点生成引擎
function FoundationScene({ config, onSelect }) {
  const scale = 0.001; 

  const foundH = config.foundH * scale;
  const foundL = config.foundL * scale;
  const foundB = config.foundB * scale;
  const cover = config.cover * scale;
  
  const colB = config.colB * scale;
  const colH = config.colH * scale;
  const colD = config.colD * scale;
  const r = colD / 2;
  
  // 底部坐标与弯折长度
  const bottomY = -foundH + cover + (config.foundD * 2 * scale);
  const topY = 1.2; 
  const bendLength_mm = Math.max(6 * config.colD, 150);
  const bendL = bendLength_mm * scale;

  // 弯曲圆弧半径（通常取 2.5d）
  const bendR = config.colD * 2.5 * scale;

  const colRebarPos = [
    { x: -colB/2 + cover, z: -colH/2 + cover, dirX: -1, dirZ: -1 }, 
    { x: colB/2 - cover,  z: -colH/2 + cover, dirX: 1,  dirZ: -1 }, 
    { x: -colB/2 + cover, z: colH/2 - cover,  dirX: -1, dirZ: 1 },  
    { x: colB/2 - cover,  z: colH/2 - cover,  dirX: 1,  dirZ: 1 },  
    { x: 0,               z: -colH/2 + cover, dirX: 0,  dirZ: -1 }, 
    { x: 0,               z: colH/2 - cover,  dirX: 0,  dirZ: 1 },  
    { x: -colB/2 + cover, z: 0,               dirX: -1, dirZ: 0 },  
    { x: colB/2 - cover,  z: 0,               dirX: 1,  dirZ: 0 },  
  ];

  const stirrupPositions = [bottomY + 0.1, -0.1];

  const handleRebarClick = (e, info) => {
    e.stopPropagation(); 
    onSelect(info);
  };

  const cursorProps = {
    onPointerOver: (e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; },
    onPointerOut: (e) => { document.body.style.cursor = 'auto'; }
  };

  return (
    <group position={[0, foundH/2, 0]}> 
      <mesh position={[0, -foundH/2, 0]}>
        <boxGeometry args={[foundL, foundH, foundB]} />
        <meshStandardMaterial color="#38bdf8" transparent opacity={0.15} depthWrite={false} />
      </mesh>
      
      <mesh position={[0, topY/2, 0]}>
        <boxGeometry args={[colB, topY, colH]} />
        <meshStandardMaterial color="#94a3b8" transparent opacity={0.2} depthWrite={false} />
      </mesh>

      <group>
        {colRebarPos.map((pos, i) => {
          const mag = Math.hypot(pos.dirX, pos.dirZ) || 1;
          const dx = pos.dirX / mag;
          const dz = pos.dirZ / mag;
          
          const pts = [];
          
          // 1. 直段顶部最高点
          pts.push(new THREE.Vector3(pos.x, topY, pos.z));
          
          // 2. 🔴 核心修复：用三角函数切分 15 个点，强制画出完美的四分之一圆弧
          const arcSegments = 15;
          const cx = pos.x + bendR * dx;
          const cy = bottomY + bendR;
          const cz = pos.z + bendR * dz;
          
          for (let j = 0; j <= arcSegments; j++) {
            const theta = (j / arcSegments) * (Math.PI / 2);
            const px = cx - bendR * dx * Math.cos(theta);
            const py = cy - bendR * Math.sin(theta);
            const pz = cz - bendR * dz * Math.cos(theta);
            pts.push(new THREE.Vector3(px, py, pz));
          }
          
          // 3. 底部向外延伸的锚固终点
          pts.push(new THREE.Vector3(pos.x + bendL * dx, bottomY, pos.z + bendL * dz));

          return (
            <group 
              key={`col-rebar-${i}`} 
              onClick={(e) => handleRebarClick(e, {
                name: '柱纵向插筋 (生根构造)', spec: `HRB400 Φ${config.colD}`,
                formula: 'L_bend = max(6d, 150)', calcLabel: `弯折长度 (6×${config.colD})`, calcValue: `${bendLength_mm} mm`,
                desc: '柱纵筋伸至基础底部钢筋网片之上，并向外平滑弯折。', color: 'bg-red-600', uiColor: 'red'
              })}
              {...cursorProps}
            >
              <TubePath points={pts} radius={r} color="#dc2626" />
            </group>
          );
        })}
      </group>

      <group>
        {stirrupPositions.map((y, i) => (
          <mesh 
            key={`stirrup-${i}`} position={[0, y, 0]}
            onClick={(e) => handleRebarClick(e, {
              name: '基础内定位箍筋', spec: 'HRB400 Φ10',
              formula: '不少于两道，间距 ≤ 500', calcLabel: '基础内设置要求', calcValue: '必须设置',
              desc: '在独立基础高度范围内，必须设置不少于两道矩形封闭箍筋，以固定柱纵筋位置。', color: 'bg-green-600', uiColor: 'green'
            })}
            {...cursorProps}
          >
            <boxGeometry args={[colB - cover*2 + r*2, colD*scale, colH - cover*2 + r*2]} />
            <meshStandardMaterial color="#16a34a" wireframe={true} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// === 控制面板与 UI ===
export default function FoundationViewer() {
  const [activeTab, setActiveTab] = useState('column');
  const [selectedRebar, setSelectedRebar] = useState(null);
  
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [config, setConfig] = useState({
    foundL: 2000, foundB: 2000, foundH: 600,
    foundD: 14, foundSpacing: 200, 
    colB: 500, colH: 500,
    colD: 25, colCount: 8,
    concGrade: 'C30', seismicGrade: '二级', cover: 40
  });

  return (
    <div className="flex flex-col lg:flex-row w-full h-full min-h-[80vh] bg-slate-50 relative">
      <div className="flex-1 relative border-r border-slate-200" style={{ minHeight: '600px' }}>
        <div className="absolute top-4 left-4 z-10 bg-indigo-600 text-white px-4 py-2 rounded shadow-md font-bold cursor-pointer hover:bg-indigo-700">
          ✅ 独立基础：完美圆弧 CNC 算法已激活！
        </div>

        {selectedRebar && (
          <div className="absolute top-16 right-4 z-20 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in slide-in-from-right-4 fade-in duration-300 z-50">
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
        
        <div className="w-full h-full bg-[#f8fafc]">
          {mounted ? (
            <Canvas camera={{ position: [3, 2, 4], fov: 45 }}>
              <ambientLight intensity={0.6} />
              <directionalLight position={[5, 8, 5]} intensity={0.8} castShadow />
              <FoundationScene config={config} onSelect={setSelectedRebar} />
              <Grid args={[10, 10]} position={[0, -0.01, 0]} cellColor="#E2E8F0" sectionColor="#E2E8F0" fadeDistance={15} />
              <axesHelper args={[1.5]} />
              <OrbitControls target={[0, 0.5, 0]} enableDamping dampingFactor={0.1} />
            </Canvas>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">
              🚀 3D 引擎预热中...
            </div>
          )}
          
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-800/80 text-white text-[11px] px-4 py-1.5 rounded-full backdrop-blur-sm pointer-events-none shadow-lg">
            左键旋转 · 右键平移 · 滚轮缩放 · <span className="text-indigo-300 font-bold">点击钢筋查看规范</span>
          </div>
        </div>
      </div>

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
            <p className="text-xs text-slate-600 mt-2">💡 提示：在左侧 3D 画布中，点击红色的柱纵筋或绿色的箍筋，查看详细锚固规范！</p>
          </div>
        )}
      </div>
    </div>
  );
}
