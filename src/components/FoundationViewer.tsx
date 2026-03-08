/* eslint-disable */
// @ts-nocheck
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';

const LAB_MAP = { 'C25': 40, 'C30': 35, 'C35': 31, 'C40': 29, 'C45': 26, 'C50': 24 };
const Z_MAP = { '一级': 1.15, '二级': 1.15, '三级': 1.05, '四级': 1.0, '非抗震': 1.0 };

function SmoothBar({ points, radius, color }) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5), [points]);
  return (
    <mesh>
      <tubeGeometry args={[curve, 64, radius, 12, false]} />
      <meshStandardMaterial color={color} roughness={0.3} metalness={0.8} />
    </mesh>
  );
}

function Scene({ config, onSelect }) {
  const s = 0.001;
  const { foundL:L, foundB:B, foundH:H, cover:c, colB:cb, colH:ch, colD, nx, nz, foundD, foundSpacing:fs, hasTop, topD, topS, conc, seismic } = config;
  
  const lab = LAB_MAP[conc] || 35;
  const zeta = Z_MAP[seismic] || 1.0;
  const lae = Math.ceil(lab * zeta * colD);
  const bend_mm = Math.max(6 * colD, 150);

  // 标高计算
  const bY = -H*s + c*s + (foundD*s)/2;
  const tY = bY + foundD*s;
  const topY = -c*s - (topD*s)/2;
  const bottomY = tY + (foundD*s)/2;

  // 🚀 底筋双向逻辑
  const bGridX = useMemo(() => {
    const n = Math.max(2, Math.floor((B - 2*c) / fs) + 1);
    return Array.from({length:n}, (_,i) => -B*s/2 + c*s + i*((B-2*c)*s/(n-1)));
  }, [B, c, fs]);
  const bGridZ = useMemo(() => {
    const n = Math.max(2, Math.floor((L - 2*c) / fs) + 1);
    return Array.from({length:n}, (_,i) => -L*s/2 + c*s + i*((L-2*c)*s/(n-1)));
  }, [L, c, fs]);

  // 🔴 柱纵筋矩阵
  const colRebars = useMemo(() => {
    const rb = [];
    const sx = (cb - 2*c)/(nx-1); const sz = (ch - 2*c)/(nz-1);
    for(let i=0; i<nx; i++) {
      for(let j=0; j<nz; j++) {
        if(i===0||i===nx-1||j===0||j===nz-1) {
          const px = -cb*s/2 + c*s + i*sx*s; const pz = -ch*s/2 + c*s + j*sz*s;
          const dx = i===0?-1:(i===nx-1?1:0); const dz = j===0?-1:(j===nz-1?1:0);
          const pts = [
            new THREE.Vector3(px, 1.2, pz),
            new THREE.Vector3(px, bottomY + colD*2.5*s, pz),
            new THREE.Vector3(px + colD*scale*dx, bottomY + colD*s, pz + colD*scale*dz), // 略过比例缩放
            new THREE.Vector3(px + bend_mm*s*dx, bottomY, pz + bend_mm*s*dz)
          ];
          rb.push({pts, id:`c-${i}-${j}`});
        }
      }
    }
    return rb;
  }, [cb, ch, nx, nz, c, bottomY, bend_mm, colD]);

  return (
    <group position={[0, H*s/2, 0]}>
      <mesh position={[0, -H*s/2, 0]}><boxGeometry args={[L*s, H*s, B*s]} /><meshStandardMaterial color="#38bdf8" transparent opacity={0.12} depthWrite={false} /></mesh>
      {/* 🔵 底筋网格 */}
      {bGridX.map((z, i) => (<mesh key={`bx-${i}`} position={[0, bY, z]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[foundD*s/2, foundD*s/2, L*s-2*c*s, 8]} /><meshStandardMaterial color="#2563eb" /></mesh>))}
      {bGridZ.map((x, i) => (<mesh key={`bz-${i}`} position={[x, tY, 0]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[foundD*s/2, foundD*s/2, B*s-2*c*s, 8]} /><meshStandardMaterial color="#3b82f6" /></mesh>))}
      {/* 🟣 面筋网格 */}
      {hasTop && (
        <group>
          {Array.from({length:Math.floor((B-2*c)/topS)+1}).map((_,i)=>(<mesh key={`tx-${i}`} position={[0, topY, -B*s/2+c*s+i*topS*s]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[topD*s/2, topD*s/2, L*s-2*c*s, 8]} /><meshStandardMaterial color="#a855f7" /></mesh>))}
          {Array.from({length:Math.floor((L-2*c)/topS)+1}).map((_,i)=>(<mesh key={`tz-${i}`} position={[-L*s/2+c*s+i*topS*s, topY-topD*s, 0]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[topD*s/2, topD*s/2, B*s-2*c*s, 8]} /><meshStandardMaterial color="#c084fc" /></mesh>))}
        </group>
      )}
      {/* 🔴 柱插筋 */}
      {colRebars.map(rb => (
        <group key={rb.id} onClick={(e) => { e.stopPropagation(); onSelect({ name:'柱插筋', spec:`Φ${colD}`, formula:`lae = ${zeta}×${lab}d`, val:`${lae}mm`, desc:`弯折 max(6d,150)=${bend_mm}mm` }); }}>
          <SmoothBar points={rb.pts} radius={colD*s/2} color="#dc2626" />
        </group>
      ))}
    </group>
  );
}

export default function FoundationViewer() {
  const [mounted, setMounted] = useState(false);
  const [sel, setSel] = useState(null);
  const [config, setConfig] = useState({ foundL:2000, foundB:2000, foundH:600, foundD:14, foundSpacing:200, colB:600, colH:600, colD:25, nx:4, nz:4, cover:40, conc:'C30', seismic:'二级', hasTop:false, topD:12, topS:200 });
  useEffect(() => setMounted(true), []);
  return (
    <div className="flex flex-col lg:flex-row w-full h-screen bg-white overflow-hidden">
      <div className="flex-1 relative bg-slate-50">
        <div className="absolute top-4 left-4 z-10 font-black text-slate-800 italic">22G101 独立基础 DJ 实验室</div>
        {sel && (
          <div className="absolute top-4 right-4 z-50 w-72 bg-white rounded-3xl shadow-2xl border p-6 animate-in slide-in-from-right">
             <div className="flex justify-between mb-4"><b>{sel.name}</b><button onClick={()=>setSel(null)}>✕</button></div>
             <div className="bg-slate-900 rounded-2xl p-5 text-center text-white">
                <p className="text-4xl font-black font-mono">{sel.val}</p>
                <p className="text-[11px] text-blue-400 mt-2">{sel.formula}</p>
             </div>
             <p className="text-[10px] text-slate-500 mt-4 italic">{sel.desc}</p>
          </div>
        )}
        <div className="w-full h-full">{mounted && <Canvas camera={{position:[3,2,4], fov:35}}><ambientLight intensity={0.8} /><pointLight position={[10,10,10]} intensity={1.5} /><Scene config={config} onSelect={setSel} /><Grid args={[12,12]} cellColor="#cbd5e1" sectionColor="#94a3b8" /><OrbitControls makeDefault /></Canvas>}</div>
      </div>
      <div className="w-full lg:w-96 bg-white p-8 shadow-2xl border-l overflow-y-auto">
        <h3 className="font-black text-slate-800 mb-8 border-b pb-4">📐 控制中心</h3>
        <div className="space-y-6">
          <section className="space-y-4">
            <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">1. 材料环境</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><label className="text-[11px] font-bold text-slate-400">强度</label><select value={config.conc} onChange={e=>setConfig({...config,conc:e.target.value})} className="w-full p-2 bg-slate-50 rounded-xl text-sm font-bold">{Object.keys(LAB_MAP).map(g=><option key={g} value={g}>{g}</option>)}</select></div>
              <div className="space-y-1"><label className="text-[11px] font-bold text-slate-400">抗震</label><select value={config.seismic} onChange={e=>setConfig({...config,seismic:e.target.value})} className="w-full p-2 bg-slate-50 rounded-xl text-sm font-bold">{Object.keys(Z_MAP).map(g=><option key={g} value={g}>{g}</option>)}</select></div>
            </div>
          </section>
          <section className="space-y-4 pt-4 border-t">
            <p className="text-[10px] font-bold text-red-600 uppercase">2. 柱筋配置</p>
            <div className="space-y-1"><label className="text-[11px] text-slate-400 font-bold">直径 Φ (mm)</label><input type="number" value={config.colD} onChange={e=>setConfig({...config,colD:Number(e.target.value)})} className="w-full p-2 bg-slate-50 rounded-xl text-sm" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-[11px] text-slate-400">X 向根数</label><input type="range" min="2" max="10" value={config.nx} onChange={e=>setConfig({...config,nx:parseInt(e.target.value)})} className="w-full accent-red-600" /></div>
              <div><label className="text-[11px] text-slate-400">Z 向根数</label><input type="range" min="2" max="10" value={config.nz} onChange={e=>setConfig({...config,nz:parseInt(e.target.value)})} className="w-full accent-red-600" /></div>
            </div>
          </section>
          <section className="space-y-4 pt-4 border-t">
            <p className="text-[10px] font-bold text-blue-600 uppercase">3. 基础底筋</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><label className="text-[11px] text-slate-400">直径 (mm)</label><input type="number" value={config.foundD} onChange={e=>setConfig({...config,foundD:Number(e.target.value)})} className="w-full p-2 bg-slate-50 rounded-xl text-sm" /></div>
              <div className="space-y-1"><label className="text-[11px] text-slate-400">间距 (mm)</label><input type="number" value={config.foundSpacing} onChange={e=>setConfig({...config,foundSpacing:Number(e.target.value)})} className="w-full p-2 bg-slate-50 rounded-xl text-sm" /></div>
            </div>
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-xl">
               <span className="text-[11px] font-bold text-purple-600">开启顶部双向面筋</span>
               <input type="checkbox" checked={config.hasTop} onChange={e=>setConfig({...config,hasTop:e.target.checked})} className="accent-purple-600" />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
