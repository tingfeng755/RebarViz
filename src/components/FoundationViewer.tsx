// @ts-nocheck
/* eslint-disable */
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';

// 🚀 听风专属：CNC 级精密柔性曲线管道（专治弯折打结）
function TubePath({ points, radius, color }) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5), [points]);
  return (
    <mesh>
      <tubeGeometry args={[curve, 64, radius, 12, false]} />
      <meshStandardMaterial color={color} roughness={0.4} metalness={0.6} />
    </mesh>
  );
}

// 🚧 柱-基础 原生 3D 节点生成引擎 (完全体)
function FoundationScene({ config, onSelect }) {
  const scale = 0.001; 

  const foundH = config.foundH * scale;
  const foundL = config.foundL * scale;
  const foundB = config.foundB * scale;
  const cover = config.cover * scale;
  
  const colB = config.colB * scale;
  const colH = config.colH * scale;
  const colD = config.colD * scale;
  const rCol = colD / 2;
  
  const foundD = config.foundD * scale;
  const rFound = foundD / 2;
  const foundSpacing = config.foundSpacing * scale;

  // 标高计算
  // 基础底面标高为 -foundH
  // 底层钢筋网 Y 坐标 (X向)
  const meshBottomY = -foundH + cover + rFound;
  // 上层钢筋网 Y 坐标 (Z向)
  const meshTopY = -foundH + cover + foundD + rFound;
  // 柱插筋弯折段正好搭在上面
  const bottomY = meshTopY + rFound; 
  const topY = 1.2; 
  
  const bendLength_mm = Math.max(6 * config.colD, 150);
  const bendL = bendLength_mm * scale;
  const bendR = config.colD * 2.5 * scale;

  // 1. 算法：生成基础底板 X向 钢筋网 (底层)
  const lenX = foundL - 2 * cover;
  const countZ = Math.max(2, Math.floor((foundB - 2 * cover) / foundSpacing) + 1);
  const actualSpacingZ = (foundB - 2 * cover) / (countZ - 1);
  const foundRebarsX = Array.from({ length: countZ }, (_, i) => -foundB/2 + cover + i * actualSpacingZ);

  // 2. 算法：生成基础底板 Z向 钢筋网 (上层)
  const lenZ = foundB - 2 * cover;
  const countX = Math.max(2, Math.floor((foundL - 2 * cover) / foundSpacing) + 1);
  const actualSpacingX = (foundL - 2 * cover) / (countX - 1);
  const foundRebarsZ = Array.from({ length: countX }, (_, i) => -foundL/2 + cover + i * actualSpacingX);

  // 3. 算法：柱插筋位置
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
      
      {/* 混凝土 */}
      <mesh position={[0, -foundH/2, 0]}>
        <boxGeometry args={[foundL, foundH, foundB]} />
        <meshStandardMaterial color="#38bdf8" transparent opacity={0.15} depthWrite={false} />
      </mesh>
      <mesh position={[0, topY/2, 0]}>
        <boxGeometry args={[colB, topY, colH]} />
        <meshStandardMaterial color="#94a3b8" transparent opacity={0.2} depthWrite={false} />
      </mesh>

      {/* 🔵 基础底板双向钢筋网 */}
      <group>
        {/* X向底层网片 */}
        {foundRebarsX.map((z, i) => (
          <mesh 
            key={`fx-${i}`} position={[0, meshBottomY, z]} rotation={[0, 0, Math.PI/2]}
            onClick={(e) => handleRebarClick(e, {
              name: '基础底板底层受力筋', spec: `HRB400 Φ${config.foundD} @${config.foundSpacing}`,
              formula: '根数 = (B - 2c) / 间距 + 1', calcLabel: `当前方向排布根数`, calcValue: `${countZ} 根`,
              desc: '按 22G101-3 规定，矩形基础短向受力筋应放在最底层。此处模拟底层网片，两端满足保护层要求。', color: 'bg-blue-600', uiColor: 'blue'
            })}
            {...cursorProps}
          >
            <cylinderGeometry args={[rFound, rFound, lenX, 8]} />
            <meshStandardMaterial color="#2563eb" roughness={0.4} metalness={0.6} />
          </mesh>
        ))}

        {/* Z向上层网片 */}
        {foundRebarsZ.map((x, i) => (
          <mesh 
            key={`fz-${i}`} position={[x, meshTopY, 0]} rotation={[Math.PI/2, 0, 0]}
            onClick={(e) => handleRebarClick(e, {
              name: '基础底板上层受力筋', spec: `HRB400 Φ${config.foundD} @${config.foundSpacing}`,
              formula: '根数 = (L - 2c) / 间距 + 1', calcLabel: `当前方向排布根数`, calcValue: `${countX} 根`,
              desc: '铺设在底层网片之上，与底层钢筋绑扎形成正交钢筋网，共同承担地基反力。', color: 'bg-blue-500', uiColor: 'blue'
            })}
            {...cursorProps}
          >
            <cylinderGeometry args={[rFound, rFound, lenZ, 8]} />
            <meshStandardMaterial color="#3b82f6" roughness={0.4} metalness={0.6} />
          </mesh>
        ))}
      </group>

      {/* 🔴 柱插筋 (精密 CNC 圆弧段) */}
      <group>
        {colRebarPos.map((pos, i) => {
          const mag = Math.hypot(pos.dirX, pos.dirZ) || 1;
          const dx = pos.dirX / mag;
          const dz = pos.dirZ / mag;
          const pts = [];
          
          pts.push(new THREE.Vector3(pos.x, topY, pos.z));
          
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
          
          pts.push(new THREE.Vector3(pos.x + bendL * dx, bottomY, pos.z + bendL * dz));

          return (
            <group 
              key={`col-rebar-${i}`} 
              onClick={(e) => handleRebarClick(e, {
                name: '柱纵向插筋 (生根构造)', spec: `HRB400 Φ${config.colD}`,
                formula: 'L_bend = max(6d, 150)', calcLabel: `弯折长度 (6×${config.colD})`, calcValue: `${bendLength_mm} mm`,
                desc: '柱纵筋伸至基础底层钢筋网之上，并向外平滑弯折生根。', color: 'bg-red-600', uiColor: 'red'
              })}
              {...cursorProps}
            >
              <TubePath points={pts} radius={rCol} color="#dc2626" />
            </group>
          );
        })}
      </group>

      {/* 🟢 基础内定位箍筋 */}
      <group>
        {stirrupPositions.map((y, i) => (
          <mesh 
            key={`stirrup-${i}`} position={[0, y, 0]}
            onClick={(e) => handleRebarClick(e, {
              name: '基础内定位箍筋', spec: 'HRB400 Φ10',
              formula: '不少于两道，间距 ≤ 500', calcLabel: '基础内设置要求', calcValue: '必须设置',
              desc: '在独立基础高度范围内，设置矩形封闭箍筋，以固定柱纵筋。', color: 'bg-green-600', uiColor: 'green'
            })}
            {...cursorProps}
          >
            <boxGeometry args={[colB - cover*2 + rCol*2, colD*scale, colH - cover*2 + rCol*2]} />
            <meshStandardMaterial color="#16a34a" wireframe={true} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// === 控制面板与 UI ===
export default function FoundationViewer() {
  const [activeTab, setActiveTab] = useState('foundation');
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
          ✅ 独立基础：全图集 3D 节点构建完成！
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
                  <div className={`font-mono font-bold text-center p-2 rounded border ${selectedRebar.uiColor === 'red' ? 'bg-red-50 border-red-200 text-red-700' : selectedRebar.uiColor === 'blue' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
                    {selectedRebar.formula}
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-200/60 mt-2">
                    <span className="text-slate-500 text-sm">{selectedRebar.calcLabel}</span>
                    <span className={`font-mono font-bold text-lg ${selectedRebar.uiColor === 'red' ? 'text-red-600' : selectedRebar.uiColor === 'blue' ? 'text-blue-600' : 'text-green-600'}`}>
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
              {/* 独立基础部分 */}
              <div className="pt-2 border-t border-blue-200/50">
                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-2">22G101-3 独立基础尺寸与配筋</p>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-slate-500">基础长度 L (mm)</label>
                    <input type="number" step="100" value={config.foundL} onChange={e => { setConfig({...config, foundL: Number(e.target.value)}); setSelectedRebar(null); }} className="p-1 border rounded text-sm font-mono focus:ring-1 focus:ring-blue-400 outline-none" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-slate-500">基础宽度 B (mm)</label>
                    <input type="number" step="100" value={config.foundB} onChange={e => { setConfig({...config, foundB: Number(e.target.value)}); setSelectedRebar(null); }} className="p-1 border rounded text-sm font-mono focus:ring-1 focus:ring-blue-400 outline-none" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-slate-500">基础高度 h (mm)</label>
                    <input type="number" step="50" value={config.foundH} onChange={e => { setConfig({...config, foundH: Number(e.target.value)}); setSelectedRebar(null); }} className="p-1 border rounded text-sm font-mono focus:ring-1 focus:ring-blue-400 outline-none" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-slate-500">底筋直径 d (mm)</label>
                    <input type="number" step="2" value={config.foundD} onChange={e => { setConfig({...config, foundD: Number(e.target.value)}); setSelectedRebar(null); }} className="p-1 border rounded text-sm font-mono focus:ring-1 focus:ring-blue-400 outline-none" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-slate-500">底筋间距 (mm)</label>
                    <input type="number" step="10" value={config.foundSpacing} onChange={e => { setConfig({...config, foundSpacing: Number(e.target.value)}); setSelectedRebar(null); }} className="p-1 border rounded text-sm font-mono focus:ring-1 focus:ring-blue-400 outline-none" />
                  </div>
                </div>
              </div>

              {/* 柱插筋部分 */}
              <div className="pt-4 border-t border-blue-200/50 mt-4">
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
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 space-y-3 animate-in fade-in">
            <h4 className="font-bold text-blue-800 text-sm italic">22G101-3 独立基础底板配筋</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              基础底板采用双向受力筋，执行“短向在底层，长向在上层”原则。在 3D 图中点击蓝色网片，可查看当前设置下对应的钢筋排布根数与规范计算公式。
            </p>
          </div>
        )}
        {activeTab === 'column' && (
          <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100 space-y-3 animate-in fade-in">
            <h4 className="font-bold text-indigo-800 text-sm italic">柱纵筋在基础中生根</h4>
            <div className="bg-white p-2 rounded border font-mono text-[10px] text-center text-indigo-700 shadow-sm">L_bend = max(6d, 150mm)</div>
            <p className="text-xs text-slate-600 mt-2">💡 提示：在左侧 3D 画布中，点击红色的柱纵筋或绿色的箍筋，查看详细锚固规范！</p>
          </div>
        )}
      </div>
    </div>
  );
}
