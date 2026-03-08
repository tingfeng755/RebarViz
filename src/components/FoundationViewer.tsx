/* eslint-disable */
// @ts-nocheck
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';

// 22G101 锚固参数矩阵
const LAB_MAP = { 'C25': 40, 'C30': 35, 'C35': 31, 'C40': 29, 'C45': 26, 'C50': 24 };
const ZETA_AE_MAP = { '一级': 1.15, '二级': 1.15, '三级': 1.05, '四级': 1.0, '非抗震': 1.0 };

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
  const { foundL, foundB, foundH, cover, colB, colH, colD, nx, nz, foundD, foundSpacing, hasTopRebar, topD, topSpacing, concGrade, seismicGrade } = config;

  // 22G101 计算核心
  const lab_factor = LAB_MAP[concGrade] || 35;
  const zeta_ae = ZETA_AE_MAP[seismicGrade] || 1.0;
  const lae_val = Math.ceil(lab_factor * zeta_ae * colD); 
  const bend_mm = Math.max(6 * colD, 150);

  const fL = foundL * scale; const fB = foundB * scale; const fH = foundH * scale; const c = cover * scale;
  const cB = colB * scale; const cH = colH * scale; const cD = colD * scale;
  const fD = (foundD || 14) * scale;
  const rFound = fD / 2;

  // 标高修正
  const meshBottomY = -fH + c + rFound;
  const meshTopY = meshBottomY + fD;
  const bottomY = meshTopY + rFound;
  const bendR = colD * 2.5 * scale;

  // 🚀 核心修正：底筋双向网格逻辑 (确保 X & Z 交叉)
  const gridX = useMemo(() => {
    const count = Math.max(2, Math.floor((foundB - 2 * cover) / foundSpacing) + 1);
    return Array.from({ length: count }, (_, i) => -fB/2 + c + i * ((foundB - 2 * cover) / (count - 1)));
  }, [foundB, cover, foundSpacing]);

  const gridZ = useMemo(() => {
    const count = Math.max(2, Math.floor((foundL - 2 * cover) / foundSpacing) + 1);
    return Array.from({ length: count }, (_, i) => -fL/2 + c + i * ((foundL - 2 * cover) / (count - 1)));
  }, [foundL, cover, foundSpacing]);

  // 柱筋矩阵生成
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
      <mesh position={[0, -fH/2, 0]}>
        <boxGeometry args={[fL, fH, fB]} />
        <meshStandardMaterial color="#38bdf8" transparent opacity={0.12} depthWrite={false} />
      </mesh>

      {/* 🔵 修正：底筋双向交错网片 */}
      <group>
        {/* X 向底筋 */}
        {gridX.map((z, i) => (
          <mesh key={`bx-${i}`} position={[0, meshBottomY, z]} rotation={[0, 0, Math.PI/2]}>
            <cylinderGeometry args={[rFound, rFound, fL - 2*c, 8]} />
            <meshStandardMaterial color="#2563eb" />
          </mesh>
        ))}
        {/* Z 向底筋 (铺在 X 向上面) */}
        {gridZ.map((x, i) => (
          <mesh key={`bz-${i}`} position={[x, meshTopY, 0]} rotation={[Math.PI/2, 0, 0]}>
            <cylinderGeometry args={[rFound, rFound, fB - 2*c, 8]} />
            <meshStandardMaterial color="#3b82f6" />
          </mesh>
        ))}
      </group>

      {/* 🔴 柱插筋带 22G101 锚固信息 */}
      {colRebars.map(rb => (
        <group key={rb.id} onClick={() => onSelect({ 
          name: '柱纵向插筋', spec: `Φ${colD}`, 
          formula: `${zeta_ae} × ${lab_factor}d`, calcValue: `${lae_val}mm`,
          desc: `弯折构造要求: max(6d, 150)=${bend_mm}mm。`
        })}>
          <SmoothRebar points={rb.pts} radius={(colD * scale)/2} color="#dc2626" />
        </group>
      ))}
    </group>
  );
}

export default function FoundationViewer() {
  const [mounted, setMounted] = useState(false);
  const [selected, setSelected] = useState(null);
  const [config, setConfig] = useState({ foundL: 2000, foundB: 2000, foundH: 600, foundD: 14, foundSpacing: 200, colB: 600, colH: 600, colD: 25, nx: 4, nz: 4, cover: 40, concGrade: 'C30', seismicGrade: '二级' });

  useEffect(() => { setMounted(true); }, []);

  return (
    <div className="flex flex-col lg:flex-row w-full h-screen bg-white overflow-hidden">
      <div className="flex-1 relative bg-slate-50">
        <div className="absolute top-6 left-6 z-10"><h1 className="text-xl font-black text-slate-800 italic tracking-tighter">22G101 基础算量实验室</h1></div>
        
        {selected && (
          <div className="absolute top-6 right-6 z-50 w-72 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 p-6">
             <div className="flex justify-between items-center mb-5 font-black text-slate-800"><span>{selected.name}</span><button onClick={() => setSelected(null)}>✕</button></div>
             <div className="bg-slate-900 rounded-2xl p-5 text-center text-white">
                <p className="text-[10px] text-slate-500 uppercase mb-1">22G101 锚固计算 (lae)</p>
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
        <div className="space-y-6">
          <section className="space-y-1.5"><label className="text-[11px] font-bold text-slate-400">混凝土强度</label><select value={config.concGrade} onChange={e => setConfig({...config, concGrade: e.target.value})} className="w-full p-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold">{Object.keys(LAB_MAP).map(g => <option key={g} value={g}>{g}</option>)}</select></section>
          <section className="space-y-4 pt-4 border-t">
            <p className="text-[10px] font-black text-red-600 uppercase tracking-widest bg-red-50 px-2 py-1 rounded inline-block">柱筋配置</p>
            <div className="space-y-1.5"><label className="text-[11px] font-bold text-slate-400">柱纵筋 Φ (mm)</label><input type="number" value={config.colD} onChange={e => setConfig({...config, colD: Number(e.target.value)})} className="w-full p-2.5 bg-slate-50 border-none rounded-xl text-sm font-mono font-bold" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-[11px] text-slate-400 font-bold">X 向根数</label><input type="range" min="2" max="10" value={config.nx} onChange={e => setConfig({...config, nx: parseInt(e.target.value)})} className="w-full accent-red-600" /><div className="text-right text-[10px] font-bold text-red-600">{config.nx} 根</div></div>
              <div><label className="text-[11px] text-slate-400 font-bold">Z 向根数</label><input type="range" min="2" max="10" value={config.nz} onChange={e => setConfig({...config, nz: parseInt(e.target.value)})} className="w-full accent-red-600" /><div className="text-right text-[10px] font-bold text-red-600">{config.nz} 根</div></div>
            </div>
          </section>
          <section className="space-y-4 pt-4 border-t">
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-1 rounded inline-block">基础底筋</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><label className="text-[11px] font-bold text-slate-400">底筋直径 d (mm)</label><input type="number" value={config.foundD} onChange={e => setConfig({...config, foundD: Number(e.target.value)})} className="w-full p-2.5 bg-slate-50 border-none rounded-xl text-sm font-mono font-bold" /></div>
              <div className="space-y-1.5"><label className="text-[11px] font-bold text-slate-400">底筋间距 S (mm)</label><input type="number" value={config.foundSpacing} onChange={e => setConfig({...config, foundSpacing: Number(e.target.value)})} className="w-full p-2.5 bg-slate-50 border-none rounded-xl text-sm font-mono font-bold" /></div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
