/* eslint-disable */
// @ts-nocheck
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

/** 🚀 22G101-1 锚固参数矩阵 */
const LAB_MAP = { 'C25': 40, 'C30': 35, 'C35': 31, 'C40': 29, 'C45': 26, 'C50': 24 };
const ZETA_AE_MAP = { '一级': 1.15, '二级': 1.15, '三级': 1.05, '四级': 1.0, '非抗震': 1.0 };

/** 🌟 样条平滑钢筋组件：渲染 22G101 构造弯折 */
function SmoothRebar({ points, radius, color }) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5), [points]);
  return (
    <mesh>
      <tubeGeometry args={[curve, 64, radius, 12, false]} />
      <meshStandardMaterial color={color} roughness={0.3} metalness={0.8} />
    </mesh>
  );
}

/** 🚧 3D 渲染核心 */
function FoundationScene({ config, onSelect }) {
  const scale = 0.001; 
  const { 
    foundL, foundB, foundH, cover, 
    colB, colH, colD, nx, nz,
    foundD, foundSpacing, hasTopRebar, topD, topSpacing,
    concGrade, seismicGrade 
  } = config;

  // --- 22G101 核心大脑计算 ---
  const lab_factor = LAB_MAP[concGrade] || 35;
  const zeta_ae = ZETA_AE_MAP[seismicGrade] || 1.0;
  const lae_val = Math.ceil(lab_factor * zeta_ae * colD); 
  const bend_mm = Math.max(6 * colD, 150);

  const fL = foundL * scale; const fB = foundB * scale; const fH = foundH * scale; const c = cover * scale;
  const cB = colB * scale; const cH = colH * scale; const cD = colD * scale; const rCol = cD / 2;
  const fD = foundD * scale; const rFound = fD / 2;
  
  const meshBottomY = -fH + c + rFound;
  const meshTopY = -fH + c + fD + rFound;
  const topMeshY = -c - (topD * scale) / 2;
  const bottomY = meshTopY + rFound;
  const bendR = colD * 2.5 * scale;

  // 1. 底板双向钢筋网排布 (铺满 L x B)
  const gridX = useMemo(() => {
    const countZ = Math.max(2, Math.floor((foundB - 2 * cover) / foundSpacing) + 1);
    return Array.from({ length: countZ }, (_, i) => -fB/2 + c + i * ((foundB - 2 * cover) / (countZ - 1)));
  }, [foundB, cover, foundSpacing]);

  const gridZ = useMemo(() => {
    const countX = Math.max(2, Math.floor((foundL - 2 * cover) / foundSpacing) + 1);
    return Array.from({ length: countX }, (_, i) => -fL/2 + c + i * ((foundL - 2 * cover) / (countX - 1)));
  }, [foundL, cover, foundSpacing]);

  // 2. 柱纵筋矩阵 (nx * nz)
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
  }, [cB, cH, nx, nz, c, bottomY, bend_mm]);

  return (
    <group position={[0, fH/2, 0]}>
      {/* 基础混凝土模型 */}
      <mesh position={[0, -fH/2, 0]}>
        <boxGeometry args={[fL, fH, fB]} />
        <meshStandardMaterial color="#38bdf8" transparent opacity={0.12} depthWrite={false} />
      </mesh>

      {/* 🔵 底板双向网片 (底层+上层) */}
      <group>
        {gridX.map((z, i) => (
          <mesh key={`bx-${i}`} position={[0, meshBottomY, z]} rotation={[0, 0, Math.PI/2]}>
            <cylinderGeometry args={[rFound, rFound, fL - 2*c, 8]} /><meshStandardMaterial color="#2563eb" />
          </mesh>
        ))}
        {gridZ.map((x, i) => (
          <mesh key={`bz-${i}`} position={[x, meshTopY, 0]} rotation={[Math.PI/2, 0, 0]}>
            <cylinderGeometry args={[rFound, rFound, fB - 2*c, 8]} /><meshStandardMaterial color="#3b82f6" />
          </mesh>
        ))}
      </group>

      {/* 🟣 顶部面筋网 (可选) */}
      {hasTopRebar && (
        <group>
          {Array.from({ length: Math.floor((foundB - 2 * cover) / topSpacing) + 1 }).map((_, i) => (
            <mesh key={`tx-${i}`} position={[0, topMeshY, -fB/2 + c + i * (topSpacing*scale)]} rotation={[0, 0, Math.PI/2]}>
              <cylinderGeometry args={[topD*scale/2, topD*scale/2, fL - 2*c, 8]} /><meshStandardMaterial color="#a855f7" />
            </mesh>
          ))}
          {Array.from({ length: Math.floor((foundL - 2 * cover) / topSpacing) + 1 }).map((_, i) => (
            <mesh key={`tz-${i}`} position={[-fL/2 + c + i * (topSpacing*scale), topMeshY - topD*scale, 0]} rotation={[Math.PI/2, 0, 0]}>
              <cylinderGeometry args={[topD*scale/2, topD*scale/2, fB - 2*c, 8]} /><meshStandardMaterial color="#c084fc" />
            </mesh>
          ))}
        </group>
      )}

      {/* 🔴 柱纵筋插筋 */}
      <group>
        {colRebars.map(rb => (
          <group key={rb.id} onClick={(e) => { e.stopPropagation(); onSelect({
            name: '柱纵向插筋', spec: `Φ${colD}`, 
            formula: `lae = ζae × lab = ${zeta_ae} × ${lab_factor}d`, 
            calcValue: `${lae_val}mm`,
            desc: `22G101 规定：弯折长度 max(6d, 150)=${bend_mm}mm。`, color: 'bg-red-600'
          })}}>
            <SmoothRebar points={rb.pts} radius={rCol} color="#dc2626" />
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
      {/* 左侧画布 */}
      <div className="flex-1 relative bg-slate-50">
        <div className="absolute top-6 left-6 z-10">
          <h1 className="text-xl font-black text-slate-800 italic">Independent Foundation <span className="text-blue-600">DJ</span></h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">22G101 Visual Lab 4.0</p>
        </div>

        {selected && (
          <div className="absolute top-6 right-6 z-50 w-72 bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200 p-6 animate-in slide-in-from-right">
             <div className="flex justify-between items-center mb-5"><h3 className="font-black text-slate-800">{selected.name}</h3><button onClick={() => setSelected(null)} className="text-slate-300">✕</button></div>
             <div className="space-y-4">
                <div className="bg-slate-900 rounded-2xl p-5 text-center shadow-xl">
                   <p className="text-[10px] text-slate-500 uppercase mb-1 font-bold">22G101 Calculation</p>
                   <p className="text-4xl font-black text-white font-mono tracking-tighter">{selected.calcValue}</p>
                   <p className="text-[11px] text-blue-400 mt-2 font-mono italic">{selected.formula}</p>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed border-l-2 border-red-500 pl-3 italic">{selected.desc}</p>
             </div>
          </div>
        )}

        <div className="w-full h-full">
          {mounted && (
            <Canvas camera={{ position: [3, 2, 4], fov: 35 }}>
              <ambientLight intensity={0.8} /><pointLight position={[10, 10, 10]} intensity={1.5} />
              <FoundationScene config={config} onSelect={setSelected} />
              <Grid args={[12, 12]} cellColor="#cbd5e1" sectionColor="#94a3b8" fadeDistance={25} />
              <OrbitControls makeDefault />
            </Canvas>
          )}
        </div>
      </div>

      {/* 右侧控制台 (全参数选项卡) */}
      <div className="w-full lg:w-96 bg-white p-8 shadow-2xl border-l border-slate-100 overflow-y-auto">
        <div className="flex items-center gap-3 mb-8"><div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg text-lg">📐</div><h3 className="font-black text-slate-800 text-xl tracking-tight italic">控制台</h3></div>

        <div className="space-y-8">
          <section className="space-y-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest px-1">1. 材料与抗震环境</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><label className="text-[11px] font-bold text-slate-400 ml-1">混凝土强度</label>
                <select value={config.concGrade} onChange={e => setConfig({...config, concGrade: e.target.value})} className="w-full p-2.5 bg-white border border-slate-100 rounded-xl text-sm font-bold shadow-sm outline-none focus:ring-2 focus:ring-indigo-500">
                  {Object.keys(LAB_MAP).map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="space-y-1.5"><label className="text-[11px] font-bold text-slate-400 ml-1">抗震等级</label>
                <select value={config.seismicGrade} onChange={e => setConfig({...config, seismicGrade: e.target.value})} className="w-full p-2.5 bg-white border border-slate-100 rounded-xl text-sm font-bold shadow-sm outline-none focus:ring-2 focus:ring-indigo-500">
                  {Object.keys(ZETA_AE_MAP).map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <p className="text-[10px] font-black text-red-600 uppercase tracking-widest px-1">2. 柱参数及排布 (nx × nz)</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><label className="text-[11px] font-bold text-slate-400">柱截面 b (mm)</label><input type="number" value={config.colB} onChange={e => setConfig({...config, colB: Number(e.target.value)})} className="w-full p-2.5 bg-slate-50 border-none rounded-xl text-sm font-mono font-bold" /></div>
              <div className="space-y-1.5"><label className="text-[11px] font-bold text-slate-400">柱截面 h (mm)</label><input type="number" value={config.colH} onChange={e => setConfig({...config, colH: Number(e.target.value)})} className="w-full p-2.5 bg-slate-50 border-none rounded-xl text-sm font-mono font-bold" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><label className="text-[11px] font-bold text-slate-400">X 向根数</label><input type="range" min="2" max="10" value={config.nx} onChange={e => setConfig({...config, nx: parseInt(e.target.value)})} className="w-full accent-red-600" /><div className="text-right text-[10px] font-bold text-red-600">{config.nx} 根</div></div>
              <div className="space-y-1.5"><label className="text-[11px] font-bold text-slate-400">Z 向根数</label><input type="range" min="2" max="10" value={config.nz} onChange={e => setConfig({...config, nz: parseInt(e.target.value)})} className="w-full accent-red-600" /><div className="text-right text-[10px] font-bold text-red-600">{config.nz} 根</div></div>
            </div>
          </section>

          <section className="space-y-4 border-t pt-6">
            <div className="flex justify-between items-center"><p className="text-[10px] font-black text-blue-600 uppercase tracking-widest px-1">3. 基础及配筋参数</p></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><label className="text-[11px] font-bold text-slate-400">基础边长 L</label><input type="number" value={config.foundL} onChange={e => setConfig({...config, foundL: Number(e.target.value)})} className="w-full p-2.5 bg-slate-50 border-none rounded-xl text-sm font-mono font-bold" /></div>
              <div className="space-y-1.5"><label className="text-[11px] font-bold text-slate-400">底筋间距 S</label><input type="number" value={config.foundSpacing} onChange={e => setConfig({...config, foundSpacing: Number(e.target.value)})} className="w-full p-2.5 bg-slate-50 border-none rounded-xl text-sm font-mono font-bold" /></div>
            </div>
            <div className="flex items-center justify-between bg-purple-50 p-3 rounded-xl border border-purple-100">
               <label className="text-[11px] font-bold text-purple-600 uppercase tracking-widest">开启顶部双向面筋</label>
               <input type="checkbox" checked={config.hasTopRebar} onChange={e => setConfig({...config, hasTopRebar: e.target.checked})} className="w-4 h-4 rounded accent-purple-600" />
            </div>
            {config.hasTopRebar && (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in">
                <div className="space-y-1.5"><label className="text-[11px] font-bold text-purple-400">面筋 Φ</label><input type="number" value={config.topD} onChange={e => setConfig({...config, topD: Number(e.target.value)})} className="w-full p-2.5 bg-white border border-purple-100 rounded-xl text-sm font-mono" /></div>
                <div className="space-y-1.5"><label className="text-[11px] font-bold text-purple-400">面筋间距</label><input type="number" value={config.topSpacing} onChange={e => setConfig({...config, topSpacing: Number(e.target.value)})} className="w-full p-2.5 bg-white border border-purple-100 rounded-xl text-sm font-mono" /></div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
