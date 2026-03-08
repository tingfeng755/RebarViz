// @ts-nocheck
/* eslint-disable */
'use client';

import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';

// 🚀 纯净版柔性曲线管道
function TubePath({ points, radius, color }) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5);
  return (
    <mesh>
      <tubeGeometry args={[curve, 64, radius, 12, false]} />
      <meshStandardMaterial color={color} roughness={0.4} metalness={0.6} />
    </mesh>
  );
}

// 🚧 柱-基础 3D 节点生成引擎
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

  const meshBottomY = -foundH + cover + rFound;
  const meshTopY = -foundH + cover + foundD + rFound;
  const bottomY = meshTopY + rFound;
  const topY = 1.2;

  const bendLength_mm = Math.max(6 * config.colD, 150);
  const bendL = bendLength_mm * scale;
  const bendR = config.colD * 2.5 * scale;

  const lenX = foundL - 2 * cover;
  const countZ = Math.max(2, Math.floor((foundB - 2 * cover) / foundSpacing) + 1);
  const actualSpacingZ = (foundB - 2 * cover) / (countZ - 1);
  const foundRebarsX = Array.from({ length: countZ }, (_, i) => -foundB/2 + cover + i * actualSpacingZ);

  const lenZ = foundB - 2 * cover;
  const countX = Math.max(2, Math.floor((foundL - 2 * cover) / foundSpacing) + 1);
  const actualSpacingX = (foundL - 2 * cover) / (countX - 1);
  const foundRebarsZ = Array.from({ length: countX }, (_, i) => -foundL/2 + cover + i * actualSpacingX);

  const hasTopRebar = config.hasTopRebar;
  const topD = config.topD * scale;
  const rTop = topD / 2;
  const topSpacing = config.topSpacing * scale;

  const topMeshY1 = 0 - cover - rTop;
  const topMeshY2 = 0 - cover - topD - rTop;

  let topRebarsX = [];
  let topRebarsZ = [];
  let countTopZ = 0;
  let countTopX = 0;

  if (hasTopRebar) {
    countTopZ = Math.max(2, Math.floor((foundB - 2 * cover) / topSpacing) + 1);
    const actualTopSpacingZ = (foundB - 2 * cover) / (countTopZ - 1);
    topRebarsX = Array.from({ length: countTopZ }, (_, i) => -foundB/2 + cover + i * actualTopSpacingZ);

    countTopX = Math.max(2, Math.floor((foundL - 2 * cover) / topSpacing) + 1);
    const actualTopSpacingX = (foundL - 2 * cover) / (countTopX - 1);
    topRebarsZ = Array.from({ length: countTopX }, (_, i) => -foundL/2 + cover + i * actualTopSpacingX);
  }

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

  const handleRebarClick = (e, info) => { e.stopPropagation(); onSelect(info); };
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
        {foundRebarsX.map((z, i) => (
          <mesh key={`fx-${i}`} position={[0, meshBottomY, z]} rotation={[0, 0, Math.PI/2]}
            onClick={(e) => handleRebarClick(e, {
              name: '基础底板底层受力筋', spec: `HRB400 Φ${config.foundD} @${config.foundSpacing}`,
              formula: '根数 = (B - 2c) / 间距 + 1', calcLabel: `排布根数`, calcValue: `${countZ} 根`,
              desc: '短向受力筋，布置在基础最底层。', color: 'bg-blue-600', uiColor: 'blue'
            })} {...cursorProps}>
            <cylinderGeometry args={[rFound, rFound, lenX, 8]} />
            <meshStandardMaterial color="#2563eb" roughness={0.4} metalness={0.6} />
          </mesh>
        ))}
        {foundRebarsZ.map((x, i) => (
          <mesh key={`fz-${i}`} position={[x, meshTopY, 0]} rotation={[Math.PI/2, 0, 0]}
            onClick={(e) => handleRebarClick(e, {
              name: '基础底板上层受力筋', spec: `HRB400 Φ${config.foundD} @${config.foundSpacing}`,
              formula: '根数 = (L - 2c) / 间距 + 1', calcLabel: `排布根数`, calcValue: `${countX} 根`,
              desc: '长向受力筋，铺设在底层网片之上。', color: 'bg-blue-500', uiColor: 'blue'
            })} {...cursorProps}>
            <cylinderGeometry args={[rFound, rFound, lenZ, 8]} />
            <meshStandardMaterial color="#3b82f6" roughness={0.4} metalness={0.6} />
          </mesh>
        ))}
      </group>

      {hasTopRebar && (
        <group>
          {topRebarsX.map((z, i) => (
            <mesh key={`tx-${i}`} position={[0, topMeshY1, z]} rotation={[0, 0, Math.PI/2]}
              onClick={(e) => handleRebarClick(e, {
                name: '基础顶部面筋 (表层)', spec: `HRB400 Φ${config.topD} @${config.topSpacing}`,
                formula: '根数 = (B - 2c) / 间距 + 1', calcLabel: `排布根数`, calcValue: `${countTopZ} 根`,
                desc: '基础面筋，用于大体积防裂或抵抗顶部拉应力。', color: 'bg-purple-600', uiColor: 'purple'
              })} {...cursorProps}>
              <cylinderGeometry args={[rTop, rTop, lenX, 8]} />
              <meshStandardMaterial color="#9333ea" roughness={0.4} metalness={0.6} />
            </mesh>
          ))}
          {topRebarsZ.map((x, i) => (
            <mesh key={`tz-${i}`} position={[x, topMeshY2, 0]} rotation={[Math.PI/2, 0, 0]}
              onClick={(e) => handleRebarClick(e, {
                name: '基础顶部面筋 (内层)', spec: `HRB400 Φ${config.topD} @${config.topSpacing}`,
                formula: '根数 = (L - 2c) / 间距 + 1', calcLabel: `排布根数`, calcValue: `${countTopX} 根`,
                desc: '面筋的双向交错层。', color: 'bg-purple-500', uiColor: 'purple'
              })} {...cursorProps}>
              <cylinderGeometry args={[rTop, rTop, lenZ, 8]} />
              <meshStandardMaterial color="#a855f7" roughness={0.4} metalness={0.6} />
            </mesh>
          ))}
        </group>
      )}

      <group>
        {colRebarPos.map((pos, i) => {
          const mag = Math.hypot(pos.dirX, pos.dirZ) || 1;
          const dx = pos.dirX / mag; const dz = pos.dirZ / mag;
          const pts = [];
          pts.push(new THREE.Vector3(pos.x, topY, pos.z));
          const arcSegments = 15;
          const cx = pos.x + bendR * dx; const cy = bottomY + bendR; const cz = pos.z + bendR * dz;
          for (let j = 0; j <= arcSegments; j++) {
            const theta = (j / arcSegments) * (Math.PI / 2);
            pts.push(new THREE.Vector3(cx - bendR * dx * Math.cos(theta), cy - bendR * Math.sin(theta), cz - bendR * dz * Math.cos(theta)));
          }
          pts.push(new THREE.Vector3(pos.x + bendL * dx, bottomY, pos.z + bendL * dz));
          return (
            <group key={`col-rebar-${i}`} onClick={(e) => handleRebarClick(e, {
                name: '柱纵向插筋', spec: `HRB400 Φ${config.colD}`,
                formula: 'L_bend = max(6d, 150)', calcLabel: `弯折长度`, calcValue: `${bendLength_mm} mm`,
                desc: '插筋生根。', color: 'bg-red-600', uiColor: 'red'
              })} {...cursorProps}>
              <TubePath points={pts} radius={rCol} color="#dc2626" />
            </group>
          );
        })}
      </group>

      <group>
        {stirrupPositions.map((y, i) => (
          <mesh key={`stirrup-${i}`} position={[0, y, 0]} onClick={(e) => handleRebarClick(e, {
              name: '定位箍筋', spec: 'HRB400 Φ10', formula: '不少于两道', calcLabel: '设置', calcValue: '必须', desc: '固定纵筋。', color: 'bg-green-600', uiColor: 'green'
            })} {...cursorProps}>
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
    hasTopRebar: false, topD: 12, topSpacing: 200,
    colB: 500, colH: 500, colD: 25, colCount: 8,
    concGrade: 'C30', seismicGrade: '二级', cover: 40
  });

  return (
    <div className="flex flex-col lg:flex-row w-full h-full min-h-[80vh] bg-slate-50 relative">
      <div className="flex-1 relative border-r border-slate-200" style={{ minHeight: '600px' }}>
        <div className="absolute top-4 left-4 z-10 bg-indigo-600 text-white px-4 py-2 rounded shadow-md font-bold">
          ✅ 独立基础：防闪退纯净版引擎就绪！
        </div>

        {selectedRebar && (
          <div className="absolute top-16 right-4 z-20 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in slide-in-from-right-4 fade-in z-50">
            <div className={`${selectedRebar.color} px-4 py-3 flex justify-between items-center text-white`}>
              <h3 className="font-bold text-md flex items-center gap-2"><span>🔍</span> {selectedRebar.name}</h3>
              <button onClick={() => setSelectedRebar(null)} className="hover:bg-black/20 rounded-full w-6 h-6 flex justify-center items-center">✕</button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <span className="text-slate-500 text-sm">规格</span><span className="font-mono font-bold text-slate-800">{selectedRebar.spec}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-2">
                <span className="text-slate-500 text-xs font-bold">📚 22G101 构造</span>
                <div className={`font-mono font-bold text-center p-2 rounded border ${selectedRebar.uiColor === 'red' ? 'bg-red-50 border-red-200 text-red-700' : selectedRebar.uiColor === 'blue' ? 'bg-blue-50 border-blue-200 text-blue-700' : selectedRebar.uiColor === 'purple' ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
                  {selectedRebar.formula}
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200/60 mt-2">
                  <span className="text-slate-500 text-sm">{selectedRebar.calcLabel}</span>
                  <span className={`font-mono font-bold text-lg ${selectedRebar.uiColor === 'red' ? 'text-red-600' : selectedRebar.uiColor === 'blue' ? 'text-blue-600' : selectedRebar.uiColor === 'purple' ? 'text-purple-600' : 'text-green-600'}`}>{selectedRebar.calcValue}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="w-full h-full bg-[#f8fafc]">
          {mounted && (
            <Canvas camera={{ position: [3, 2, 4], fov: 45 }}>
              <ambientLight intensity={0.6} />
              <directionalLight position={[5, 8, 5]} intensity={0.8} />
              <FoundationScene config={config} onSelect={setSelectedRebar} />
              <Grid args={[10, 10]} position={[0, -0.01, 0]} cellColor="#E2E8F0" />
              <axesHelper args={[1.5]} />
              <OrbitControls target={[0, 0.5, 0]} enableDamping dampingFactor={0.1} />
            </Canvas>
          )}
          {!mounted && (
            <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">
              🚀 3D 引擎预热中...
            </div>
          )}
        </div>
      </div>

      <div className="w-full lg:w-96 bg-white p-6 overflow-y-auto shadow-inner">
        <div className="mb-6 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 shadow-sm">
           <h3 className="font-bold text-blue-900 mb-4 flex items-center gap-2"><span>🎛️</span> 22G101 参数化控制台</h3>
           <div className="space-y-4">
              <div className="pt-2 border-t border-blue-200/50">
                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-2">22G101-3 独立基础底层</p>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-slate-500">基础长度 L (mm)</label>
                    <input type="number" step="100" value={config.foundL} onChange={e => { setConfig({...config, foundL: Number(e.target.value)}); setSelectedRebar(null); }} className="p-1 border rounded text-sm font-mono focus:ring-1 outline-none" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-slate-500">基础宽度 B (mm)</label>
                    <input type="number" step="100" value={config.foundB} onChange={e => { setConfig({...config, foundB: Number(e.target.value)}); setSelectedRebar(null); }} className="p-1 border rounded text-sm font-mono focus:ring-1 outline-none" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-slate-500">基础高度 h (mm)</label>
                    <input type="number" step="50" value={config.foundH} onChange={e => { setConfig({...config, foundH: Number(e.target.value)}); setSelectedRebar(null); }} className="p-1 border rounded text-sm font-mono" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-slate-500">底筋直径 d (mm)</label>
                    <input type="number" step="2" value={config.foundD} onChange={e => { setConfig({...config, foundD: Number(e.target.value)}); setSelectedRebar(null); }} className="p-1 border rounded text-sm font-mono" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-slate-500">底筋间距 (mm)</label>
                    <input type="number" step="10" value={config.foundSpacing} onChange={e => { setConfig({...config, foundSpacing: Number(e.target.value)}); setSelectedRebar(null); }} className="p-1 border rounded text-sm font-mono" />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-purple-200/50 mt-3 bg-purple-50/50 p-2 rounded">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest">顶部面筋网 (附加)</p>
                  <label className="flex items-center cursor-pointer relative">
                    <input type="checkbox" className="sr-only" checked={config.hasTopRebar} onChange={e => { setConfig({...config, hasTopRebar: e.target.checked}); setSelectedRebar(null); }} />
                    <div className={`w-8 h-4 rounded-full transition-colors ${config.hasTopRebar ? 'bg-purple-500' : 'bg-slate-300'}`}></div>
                    <div className={`absolute left-0.5 top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${config.hasTopRebar ? 'translate-x-4' : ''}`}></div>
                  </label>
                </div>
                {config.hasTopRebar && (
                  <div className="grid grid-cols-2 gap-2 animate-in fade-in duration-300">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-slate-500">面筋直径 (mm)</label>
                      <input type="number" step="2" value={config.topD} onChange={e => { setConfig({...config, topD: Number(e.target.value)}); setSelectedRebar(null); }} className="p-1 border border-purple-200 rounded text-sm font-mono focus:ring-1 focus:ring-purple-400 outline-none" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-slate-500">面筋间距 (mm)</label>
                      <input type="number" step="10" value={config.topSpacing} onChange={e => { setConfig({...config, topSpacing: Number(e.target.value)}); setSelectedRebar(null); }} className="p-1 border border-purple-200 rounded text-sm font-mono focus:ring-1 focus:ring-purple-400 outline-none" />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-blue-200/50 mt-3">
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2">22G101-1 柱插筋</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-slate-500">柱截面 b (mm)</label>
                    <input type="number" step="50" value={config.colB} onChange={e => { setConfig({...config, colB: Number(e.target.value)}); setSelectedRebar(null); }} className="p-1 border rounded text-sm font-mono" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-slate-500">柱截面 h (mm)</label>
                    <input type="number" step="50" value={config.colH} onChange={e => { setConfig({...config, colH: Number(e.target.value)}); setSelectedRebar(null); }} className="p-1 border rounded text-sm font-mono" />
                  </div>
                </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
