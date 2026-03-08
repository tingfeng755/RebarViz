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
  const { 
    foundL:L, foundB:B, foundH:H, colB:cb, colH:ch, cover:c, 
    colD, nx, nz, foundD, foundS, hasTop, topD, topS, conc, seismic 
  } = config;
  
  const lae = Math.ceil((LAB_MAP[conc]||35) * (Z_MAP[seismic]||1.0) * colD);
  const bend = Math.max(6 * colD, 150);

  // 标高计算
  const bY = -H*s + c*s + (foundD*s)/2;
  const tY = bY + foundD*s;
  const topMeshY = -c*s - (topD*s)/2;
  const bottomY = tY + (foundD*s)/2;
  const bendR = colD * 2.5 * s;

  // 🚀 修正：底筋双向交错网格 (X向和Z向分别生成)
  const gridX = useMemo(() => {
    const n = Math.max(2, Math.floor((B - 2*c) / foundS) + 1);
    return Array.from({length:n}, (_,i) => -B*s/2 + c*s + i*((B-2*c)*s/(n-1)));
  }, [B, c, foundS]);

  const gridZ = useMemo(() => {
    const n = Math.max(2, Math.floor((L - 2*c) / foundS) + 1);
    return Array.from({length:n}, (_,i) => -L*s/2 + c*s + i*((L-2*c)*s/(n-1)));
  }, [L, c, foundS]);

  // 柱筋 nx * nz 矩阵
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
            new THREE.Vector3(px, bottomY + bendR, pz),
            new THREE.Vector3(px + bendR*0.5*dx, bottomY + bendR*0.2, pz + bendR*0.5*dz),
            new THREE.Vector3(px + bend*s*dx, bottomY, pz + bend*s*dz)
          ];
          rb.push({pts, id:`c-${i}-${j}`});
        }
      }
    }
    return rb;
  }, [cb, ch, nx, nz, c, bottomY, bend, colD]);

  return (
    <group position={[0, H*s/2, 0]}>
      {/* 基础混凝土外观 */}
      <mesh position={[0, -H*s/2, 0]}><boxGeometry args={[L*s, H*s, B*s]} /><meshStandardMaterial color="#38bdf8" transparent opacity={0.12} depthWrite={false} /></mesh>
      {/* 柱混凝土外观 */}
      <mesh position={[0, 0.6, 0]}><boxGeometry args={[cb*s, 1.2, ch*s]} /><meshStandardMaterial color="#94a3b8" transparent opacity={0.15} depthWrite={false} /></mesh>

      {/* 🔵 修正：蓝色双向底筋网 */}
      <group>
        {gridX.map((z, i) => (
          <mesh key={`bx-${i}`} position={[0, bY, z]} rotation={[0,0,Math.PI/2]}>
            <cylinderGeometry args={[foundD*s/2, foundD*s/2, L*s-2*c*s, 8]} /><meshStandardMaterial color="#2563eb" />
          </mesh>
        ))}
        {gridZ.map((x, i) => (
          <mesh key={`bz-${x}`} position={[x, tY, 0]} rotation={[Math.PI/2,0,0]}>
            <cylinderGeometry args={[foundD*s/2, foundD*s/2, B*s-2*c*s, 8]} /><meshStandardMaterial color="#3b82f6" />
          </mesh>
        ))}
      </group>

      {/* 🟣 紫色双向面筋网 (可选) */}
      {hasTop && (
        <group>
          {Array.from({length:Math.floor((B-2*c)/topS)+1}).map((_,i)=>(<mesh key={`tx-${i}`} position={[0, topMeshY, -B*s/2+c*s+i*topS*s]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[topD*s/2, topD*s/2, L*s-2*c*s, 8]} /><meshStandardMaterial color="#a855f7" /></mesh>))}
          {Array.from({length:Math.floor((L-2*c)/topS)+1}).map((_,i)=>(<mesh key={`tz-${i}`} position={[-L*s/2+c*s+i*topS*s, topMeshY-topD*s, 0]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[topD*s/2, topD*s/2, B*s-2*c*s, 8]} /><meshStandardMaterial color="#c084fc" /></mesh>))}
        </group>
      )}

      {/* 🔴 柱插筋 */}
      {colRebars.map(rb => (
        <group key={rb.id} onClick={(e) => { e.stopPropagation(); onSelect({ 
          name:'柱纵向插筋', spec:`Φ${colD}`, val:`${lae}mm`, 
          formula:`lae = ζae × lab = ${(lae/colD).toFixed(1)}d`,
          desc:`22G101规定：弯折取max(6d, 150)=${bend}mm。`
        }); }}>
          <SmoothBar points={rb.pts} radius={colD*s/2} color="#dc2626" />
        </group>
      ))}
    </group>
  );
}

export default function FoundationViewer() {
  const [m, setM] = useState(false);
  const [sel, setSel] = useState(null);
  const [cfg, setCfg] = useState({ 
    foundL:2000, foundB:2000, foundH:600, foundD:14, foundS:200, 
    colB:600, colH:600, colD:25, nx:4, nz:4, c:40, 
    conc:'C30', seismic:'二级', hasTop:false, topD:12, topS:200 
  });

  useEffect(() => setM(true), []);

  return (
    <div className="flex flex-col lg:flex-row w-full h-screen bg-white overflow-hidden text-slate-900">
      <div className="flex-1 relative bg-slate-50">
        <div className="absolute top-6 left-6 z-10"><h1 className="text-xl font-black italic tracking-tighter text-slate-800">DJ 独立基础 3D 实验室</h1></div>
        
        {sel && (
          <div className="absolute top-6 right-6 z-50 w-72 bg-white/95 backdrop-blur rounded-3xl shadow-2xl border p-6 animate-in slide-in-from-right">
             <div className="flex justify-between items-center mb-5 font-bold"><span>{sel.name}</span><button onClick={()=>setSel(null)} className="text-slate-300">✕</button></div>
             <div className="bg-slate-900 rounded-2xl p-5 text-center text-white shadow-xl">
                <p className="text-[10px] text-slate-500 uppercase mb-1">22G101 锚固长度</p>
                <p className="text-4xl font-black font-mono tracking-tighter">{sel.val}</p>
                <p className="text-[11px] text-blue-400 mt-2 font-mono italic">{sel.formula}</p>
             </div>
             <p className="text-[11px] text-slate-500 mt-4 border-l-2 border-red-500 pl-3 italic">{sel.desc}</p>
          </div>
        )}

        <div className="w-full h-full">{m && <Canvas camera={{position:[4,3,4], fov:35}}><ambientLight intensity={0.8} /><pointLight position={[10,10,10]} intensity={1} /><Scene config={cfg} onSelect={setSel} /><Grid args={[12,12]} cellColor="#cbd5e1" sectionColor="#94a3b8" /><OrbitControls makeDefault /></Canvas>}</div>
      </div>

      <div className="w-full lg:w-96 bg-white p-8 shadow-2xl border-l overflow-y-auto">
        <h3 className="font-black text-slate-800 mb-8 border-b pb-4 italic underline decoration-indigo-500 decoration-4">参数控制面板</h3>
        <div className="space-y-8">
          <section className="space-y-4">
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded inline-block">1. 基础几何尺寸 (mm)</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><label className="text-[11px] font-bold text-slate-400">长度 L</label><input type="number" value={cfg.foundL} onChange={e=>setCfg({...cfg,foundL:Number(e.target.value)})} className="w-full p-2 bg-slate-50 rounded-xl text-xs font-mono font-bold" /></div>
              <div className="space-y-1"><label className="text-[11px] font-bold text-slate-400">宽度 B</label><input type="number" value={cfg.foundB} onChange={e=>setCfg({...cfg,foundB:Number(e.target.value)})} className="w-full p-2 bg-slate-50 rounded-xl text-xs font-mono font-bold" /></div>
              <div className="space-y-1"><label className="text-[11px] font-bold text-slate-400">高度 H</label><input type="number" value={cfg.foundH} onChange={e=>setCfg({...cfg,foundH:Number(e.target.value)})} className="w-full p-2 bg-slate-50 rounded-xl text-xs font-mono font-bold" /></div>
              <div className="space-y-1"><label className="text-[11px] font-bold text-slate-400 text-blue-600">底筋 Φ</label><input type="number" value={cfg.foundD} onChange={e=>setCfg({...cfg,foundD:Number(e.target.value)})} className="w-full p-2 bg-blue-50 border border-blue-100 rounded-xl text-xs font-mono font-bold text-blue-600" /></div>
            </div>
          </section>

          <section className="space-y-4 pt-4 border-t">
            <p className="text-[10px] font-black text-red-600 uppercase tracking-widest bg-red-50 px-2 py-1 rounded inline-block">2. 柱构件参数 (mm)</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><label className="text-[11px] font-bold text-slate-400">柱宽 b</label><input type="number" value={cfg.colB} onChange={e=>setCfg({...cfg,colB:Number(e.target.value)})} className="w-full p-2 bg-slate-50 rounded-xl text-xs font-mono font-bold" /></div>
              <div className="space-y-1"><label className="text-[11px] font-bold text-slate-400">柱高 h</label><input type="number" value={cfg.colH} onChange={e=>setCfg({...cfg,colH:Number(e.target.value)})} className="w-full p-2 bg-slate-50 rounded-xl text-xs font-mono font-bold" /></div>
              <div className="space-y-1"><label className="text-[11px] font-bold text-slate-400 text-red-600">纵筋 Φ</label><input type="number" value={cfg.colD} onChange={e=>setCfg({...cfg,colD:Number(e.target.value)})} className="w-full p-2 bg-red-50 border border-red-100 rounded-xl text-xs font-mono font-bold text-red-600" /></div>
            </div>
          </section>

          <section className="space-y-4 pt-4 border-t">
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest px-1">3. 材料环境</p>
            <div className="grid grid-cols-2 gap-3">
              <select value={cfg.conc} onChange={e=>setCfg({...cfg,conc:e.target.value})} className="p-2.5 bg-slate-50 border-none rounded-xl text-xs font-bold">{Object.keys(LAB_MAP).map(g=><option key={g} value={g}>{g}</option>)}</select>
              <select value={cfg.seismic} onChange={e=>setCfg({...cfg,seismic:e.target.value})} className="p-2.5 bg-slate-50 border-none rounded-xl text-xs font-bold">{Object.keys(Z_MAP).map(g=><option key={g} value={g}>{g}</option>)}</select>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
