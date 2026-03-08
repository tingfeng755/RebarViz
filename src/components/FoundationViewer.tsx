/* eslint-disable */
// @ts-nocheck
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';

// 🚀 22G101-1 锚固系数矩阵
const LAB_MAP = { 'C25': 40, 'C30': 35, 'C35': 31, 'C40': 29, 'C45': 26, 'C50': 24 };
const ZETA_AE_MAP = { '一级': 1.15, '二级': 1.15, '三级': 1.05, '四级': 1.0, '非抗震': 1.0 };

// 平滑弯折钢筋组件
function SmoothRebar({ points, radius, color }) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5), [points]);
  return (
    <mesh>
      <tubeGeometry args={[curve, 64, radius, 12, false]} />
      <meshStandardMaterial color={color} roughness={0.3} metalness={0.8} />
    </mesh>
  );
}

function FoundationScene({ config, onSelect }) {
  const scale = 0.001;
  const { 
    foundL, foundB, foundH, cover, 
    colB, colH, colD, nx, nz,
    foundD, foundSpacing, hasTopRebar, topD, topSpacing,
    concGrade, seismicGrade 
  } = config;

  // --- 22G101 算量引擎 ---
  const lab_factor = LAB_MAP[concGrade] || 35;
  const zeta_ae = ZETA_AE_MAP[seismicGrade] || 1.0;
  const lae_val = Math.ceil(lab_factor * zeta_ae * colD); 
  const bend_mm = Math.max(6 * colD, 150);

  const fL = foundL * scale; const fB = foundB * scale; const fH = foundH * scale; const c = cover * scale;
  const cB = colB * scale; const cH = colH * scale; const cD = colD * scale;
  const fD = foundD * scale; const tD = topD * scale;

  // 标高计算
  const meshBottomY = -fH + c + fD/2;
  const meshTopY = meshBottomY + fD;
  const topMeshY = -c - tD/2;
  const bottomY = meshTopY + fD/2;
  const bendR = colD * 2.5 * scale;

  // 1. 🚀 修正：底板双向网格算法
  const bottomX = useMemo(() => {
    const count = Math.max(2, Math.floor((foundB - 2 * cover) / foundSpacing) + 1);
    return Array.from({ length: count }, (_, i) => -fB/2 + c + i * ((foundB - 2 * cover) / (count - 1)));
  }, [foundB, cover, foundSpacing]);

  const bottomZ = useMemo(() => {
    const count = Math.max(2, Math.floor((foundL - 2 * cover) / foundSpacing) + 1);
    return Array.from({ length: count }, (_, i) => -fL/2 + c + i * ((foundL - 2 * cover) / (count - 1)));
  }, [foundL, cover, foundSpacing]);

  // 2. 柱纵筋 $n \times m$ 矩阵生成
  const colRebars = useMemo(() => {
    const rebars = [];
    const stepX = (cB - 2 * c) / (nx - 1);
    const stepZ = (cH - 2 * c) / (nz - 1);
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < nz; j++) {
        if (i === 0 || i === nx - 1 || j === 0 || j === nz - 1) {
          const px = -cB/2 + c + i * stepX;
          const pz = -cH/2 + c + j * stepZ;
          const dx = i === 0 ? -1 : (i === nx - 1 ? 1 : 0);
          const dz = j === 0 ? -1 : (j === nz - 1 ? 1 : 0);
          const pts = [
            new THREE.Vector3(px, 1.2, pz),
            new THREE.Vector3(px, bottomY + bendR, pz),
            new THREE.Vector3(px + bendR * 0.4 * dx, bottomY + bendR * 0.2, pz + bendR * 0.4 * dz),
            new THREE.Vector3(px + bend_mm * scale * dx, bottomY, pz + bend_mm * scale * dz)
          ];
          rebars.push({ pts, id: `c-${i}-${j}` });
        }
      }
    }
    return rebars;
  }, [cB, cH, nx, nz, c, bottomY, bend_mm, colD]);

  return (
    <group position={[0, fH/2, 0]}>
      {/* 基础外壳 */}
      <mesh position={[0, -fH/2, 0]}><boxGeometry args={[fL, fH, fB]} /><meshStandardMaterial color="#38bdf8" transparent opacity={0.12} depthWrite={false} /></mesh>

      {/* 🔵 修正后的底筋双向网格 */}
      <group>
        {bottomX.map((z, i) => (
          <mesh key={`fbx-${i}`} position={[0, meshBottomY, z]} rotation={[0, 0, Math.PI/2]}>
            <cylinderGeometry args={[fD/2, fD/2, fL - 2*c, 8]} /><meshStandardMaterial color="#2563eb" />
          </mesh>
        ))}
        {bottomZ.map((x, i) => (
          <mesh key={`fbz-${i}`} position={[x, meshTopY, 0]} rotation={[Math.PI/2, 0, 0]}>
            <cylinderGeometry args={[fD/2, fD/2, fB - 2*c, 8]} /><meshStandardMaterial color="#3b82f6" />
          </mesh>
        ))}
      </group>

      {/* 🟣 面筋双向网格 */}
      {hasTopRebar && (
        <group>
          {Array.from({ length: Math.floor((foundB - 2 * cover) / topSpacing) + 1 }).map((_, i) => (
            <mesh key={`tx-${i}`} position={[0, topMeshY, -fB/2 + c + i * (topSpacing*scale)]} rotation={[0, 0, Math.PI/2]}>
              <cylinderGeometry args={[tD/2, tD/2, fL - 2*c, 8]} /><meshStandardMaterial color="#a855f7" />
            </mesh>
          ))}
          {Array.from({ length: Math.floor((foundL - 2 * cover) / topSpacing) + 1 }).map((_, i) => (
            <mesh key={`tz-${i}`} position={[-fL/2 + c + i * (topSpacing*scale), topMeshY - tD, 0]} rotation={[Math.PI/2, 0, 0]}>
              <cylinderGeometry args={[tD/2, tD/2, fB - 2*c, 8]} /><meshStandardMaterial color="#c084fc" />
            </mesh>
          ))}
        </group>
      )}

      {/* 🔴 柱插筋 */}
      <group>
        {colRebars.map(rb => (
          <group key={rb.id} onClick={(e) => { e.stopPropagation(); onSelect({
            name: '柱纵向插筋', spec: `Φ${colD}`, 
            formula: `lae = ζae × lab = ${zeta_ae} × ${lab_factor}d`, 
            calcValue: `${lae_val}mm`, desc: `22G101规定弯折取max(6d,150)=${bend_mm}mm`, color: 'bg-red-600'
          })}}>
            <SmoothRebar points={rb.pts} radius={cD/2} color="#dc2626" />
          </group>
        ))}
      </group>
    </group>
  );
}

export default function FoundationViewer() {
  const [mounted, setMounted] = useState(false);
  const [selected, setSelected] = useState(null);
  const [config, setConfig] = useState({
    foundL: 2000, foundB: 2000, foundH: 600, foundD: 14, foundSpacing: 200,
    colB: 600, colH: 600, colD: 25, nx: 4, nz: 4, cover: 40,
    concGrade: 'C30', seismicGrade: '二级', hasTopRebar: false, topD: 12, topSpacing: 200
  });

  useEffect(() => { setMounted(true); }, []);

  return (
    <div className="flex flex-col lg:flex-row w-full h-screen bg-white overflow-hidden">
      <div className="flex-1 relative bg-slate-50">
        <div className="absolute top-6 left-6 z-10"><h1 className="text-xl font-black text-slate-800 italic">22G101 独立基础 DJ 实验室</h1></div>
        
        {selected && (
          <div className="absolute top-6 right-6 z-50 w-72 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200 p-6 animate-in slide-in-from-right">
             <div className="flex justify-between items-center mb-5 font-black text-slate-800"><span>{selected.name}</span><button onClick={() => setSelected(null)}>✕</button></div>
             <div className="bg-slate-900 rounded-2xl p-5 text-center text-white">
                <p className="text-[10px] text-slate-500 uppercase mb-1 font-bold">22G101 锚固长度 lae</p>
                <p className="text-4xl font-black font-mono tracking-tighter">{selected.calcValue}</p>
                <p className="text-[11px] text-blue-400 mt-2 font-mono italic">{selected.formula}</p>
             </div>
             <p className="text-[11px] text-slate-500 mt-4 border-l-2 border-red-500 pl-3 italic">{selected.desc}</p>
          </div>
        )}

        <div className="w-full h-full">
          {mounted && (
            <Canvas camera={{ position: [3, 2, 4], fov: 35 }}>
              <ambientLight intensity={0.8} /><pointLight position={[10, 10, 10]} intensity={1.5} />
              <FoundationScene config={config} onSelect={setSelected} />
              <Grid args={[12, 12]} cellColor="#cbd5e1" sectionColor="#94a3b8" />
              <OrbitControls makeDefault />
            </Canvas>
          )}
        </div>
      </div>

      <div className="w-full lg:w-96 bg-white p-8 shadow-2xl border-l overflow-y-auto">
        <h3 className="font-black text-slate-800 mb-8 border-b pb-4 italic">📐 参数化控制中心</h3>
        <div className="space-y-8">
          {/* 选项卡 1: 材料与抗震 */}
          <section className="space-y-4">
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded inline-block">1. 材料环境</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><label className="text-[11px] font-bold text-slate-400">混凝土强度</label>
                <select value={config.concGrade} onChange={e => setConfig({...config, concGrade: e.target.value})} className="w-full p-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold shadow-sm outline-none focus:ring-2 focus:ring-indigo-500">
                  {Object.keys(LAB_MAP).map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="space-y-1"><label className="text-[11px] font-bold text-slate-400">抗震等级</label>
                <select value={config.seismicGrade} onChange={e => setConfig({...config, seismicGrade: e.target.value})} className="w-full p-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold shadow-sm outline-none focus:ring-2 focus:ring-indigo-500">
                  {Object.keys(ZETA_AE_MAP).map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* 选项卡 2: 柱筋矩阵 */}
          <section className="space-y-4 pt-4 border-t border-slate-100">
            <p className="text-[10px] font-black text-red-600 uppercase tracking-widest bg-red-50 px-2 py-1 rounded inline-block">2. 柱筋排布 (nx × nz)</p>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-[11px] text-slate-400">X 向根数</label><input type="range" min="2" max="10" value={config.nx} onChange={e => setConfig({...config, nx: parseInt(e.target.value)})} className="w-full accent-red-600" /><div className="text-right text-[10px] font-bold text-red-600 font-mono">{config.nx} 根</div></div>
              <div><label className="text-[11px] text-slate-400">Z 向根数</label><input type="range" min="2" max="10" value={config.nz} onChange={e => setConfig({...config, nz: parseInt(e.target.value)})} className="w-full accent-red-600" /><div className="text-right text-[10px] font-bold text-red-600 font-mono">{config.nz} 根</div></div>
            </div>
            <div className="space-y-1"><label className="text-[11px] text-slate-400 font-bold">柱纵筋直径 Φ (mm)</label><input type="number" value={config.colD} onChange={e => setConfig({...config, colD: Number(e.target.value)})} className="w-full p-2.5 bg-slate-50 border-none rounded-xl text-sm font-mono font-bold" /></div>
          </section>

          {/* 选项卡 3: 基础配筋 */}
          <section className="space-y-4 pt-4 border-t border-slate-100">
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-1 rounded inline-block">3. 基础双向网片</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><label className="text-[11px] text-slate-400">底筋直径 d (mm)</label><input type="number" value={config.foundD} onChange={e => setConfig({...config, foundD: Number(e.target.value)})} className="w-full p-2.5 bg-slate-50 border-none rounded-xl text-sm font-mono font-bold" /></div>
              <div className="space-y-1"><label className="text-[11px] text-slate-400">底筋间距 S (mm)</label><input type="number" value={config.foundSpacing} onChange={e => setConfig({...config, foundSpacing: Number(e.target.value)})} className="w-full p-2.5 bg-slate-50 border-none rounded-xl text-sm font-mono font-bold" /></div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t mt-2">
               <label className="text-[11px] font-bold text-purple-600 uppercase tracking-widest">开启顶部双向面筋</label>
               <input type="checkbox" checked={config.hasTopRebar} onChange={e => setConfig({...config, hasTopRebar: e.target.checked})} className="w-4 h-4 accent-purple-600" />
            </div>
            {config.hasTopRebar && (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in">
                <div className="space-y-1"><label className="text-[11px] text-slate-400">面筋直径 d'</label><input type="number" value={config.topD} onChange={e => setConfig({...config, topD: Number(e.target.value)})} className="w-full p-2 bg-purple-50 rounded-lg text-sm" /></div>
                <div className="space-y-1"><label className="text-[11px] text-slate-400">面筋间距</label><input type="number" value={config.topSpacing} onChange={e => setConfig({...config, topSpacing: Number(e.target.value)})} className="w-full p-2 bg-purple-50 rounded-lg text-sm" /></div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
