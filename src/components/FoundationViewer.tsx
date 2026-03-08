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
    foundL:L, foundB:B, foundH:H, foundD, foundS,
    colB:cb, colH:ch, colD, nx, nz, 
    cover:c, conc, seismic 
  } = config;
  
  const lae = Math.ceil((LAB_MAP[conc]||35) * (Z_MAP[seismic]||1.0) * colD);
  const bend = Math.max(6 * colD, 150);

  const fD = (foundD || 14) * s;
  const bY = -H*s + c*s + fD/2;
  const tY = bY + fD;
  const bottomY = tY + fD/2;
  const bendR = colD * 2.5 * s;

  // 🚀 底筋双向网格逻辑
  const gridX = useMemo(() => {
    const n = Math.max(2, Math.floor((B - 2*c) / foundS) + 1);
    return Array.from({length:n}, (_,i) => -B*s/2 + c*s + i*((B-2*c)*s/(n-1)));
  }, [B, c, foundS]);

  const gridZ = useMemo(() => {
    const n = Math.max(2, Math.floor((L - 2*c) / foundS) + 1);
    return Array.from({length:n}, (_,i) => -L*s/2 + c*s + i*((L-2*c)*s/(n-1)));
  }, [L, c, foundS]);

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
      <mesh position={[0, -H*s/2, 0]}><boxGeometry args={[L*s, H*s, B*s]} /><meshStandardMaterial color="#38bdf8" transparent opacity={0.1} depthWrite={false} /></mesh>
      <mesh position={[0, 0.6, 0]}><boxGeometry args={[cb*s, 1.2, ch*s]} /><meshStandardMaterial color="#94a3b8" transparent opacity={0.15} depthWrite={false} /></mesh>
      <group>
        {gridX.map((z, i) => (<mesh key={`bx-${i}`} position={[0, bY, z]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[fD/2, fD/2, L*s-2*c*s, 8]} /><meshStandardMaterial color="#2563eb" /></mesh>))}
        {gridZ.map((x, i) => (<mesh key={`bz-${x}`} position={[x, tY, 0]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[fD/2, fD/2, B*s-2*c*s, 8]} /><meshStandardMaterial color="#3b82f6" /></mesh>))}
      </group>
      {colRebars.map(rb => (
        <group key={rb.id} onClick={(e) => { e.stopPropagation(); onSelect({ name:'柱纵向插筋', spec:`Φ${colD}`, val:`${lae}mm`, formula:`lae = ζae × lab = ${(lae/colD).toFixed(1)}d`, desc:`弯折取max(6d,150)=${bend}mm` }); }}>
          <SmoothBar points={rb.pts} radius={colD*s/2} color="#dc2626" />
        </group>
      ))}
    </group>
  );
}

export default function FoundationViewer() {
  const [m, setM] = useState(false);
  const [sel, setSel] = useState(null);
  const [cfg, setCfg] = useState({ foundL:2000, foundB:2000, foundH:600, foundD:14, foundS:200, colB:600, colH:600, colD:25, nx:4, nz:4, c:40, conc:'C30', seismic:'二级' });
  useEffect(() => setM(true), []);
  return (
    <div className="flex flex-col lg:flex-row w-full h-screen bg-white overflow-hidden text-slate-900">
      <div className="flex-1 relative bg-slate-50">
        <div className="absolute top-6 left-6 z-10 font-black italic text-slate-800">22G101 独立基础 DJ 实验室</div>
        {sel && (
          <div className="absolute top-6 right-6 z-50 w-72 bg-white/95 backdrop-blur rounded-3xl shadow-2xl border p-6 animate-in slide-in-from-right">
             <div className="flex justify-between items-center mb-5 font-bold"><span>{sel.name}</span><button onClick={()=>setSel(null)}>✕</button></div>
             <div className="bg-slate-900 rounded-2xl p-5 text-center text-white"><p className="text-4xl font-black font-mono">{sel.val}</p><p className="text-[11px] text-blue-400 mt-2 font-mono italic">{sel.formula}</p></div>
             <p className="text-[11px] text-slate-500 mt-4 border-l-2 border-red-500 pl-3 italic">{sel.desc}</p>
          </div>
        )}
        <div className="w-full h-full">{m && <Canvas camera={{position:[3,2,4], fov:35}}><ambientLight intensity={0.8} /><pointLight position={[10,10,10]} intensity={1} /><Scene config={cfg} onSelect={setSel} /><Grid args={[12,12]} cellColor="#cbd5e1" sectionColor="#94a3b8" /><OrbitControls makeDefault /></Canvas>}</div>
      </div>
      <div className="w-full lg:w-96 bg-white p-8 shadow-2xl border-l overflow-y-auto">
        <h3 className="font-black text-slate-800 mb-8 border-b pb-4 italic tracking-tighter text-lg underline decoration-blue-500 decoration-4 underline-offset-8">3D 实验室控制台</h3>
        <div className="space-y-8">
          <section className="space-y-4">
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded inline-block">1. 基础几何尺寸 (mm)</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><label className="text-[11px] font-bold text-slate-400 tracking-tighter">基础长 L</label><input type="number" value={cfg.foundL} onChange={e=>setCfg({...cfg,foundL:Number(e.target.value)})} className="w-full p-2 bg-slate-50 rounded-xl text-xs font-mono font-bold" /></div>
              <div className="space-y-1"><label className="text-[11px] font-bold text-slate-400 tracking-tighter">基础宽 B</label><input type="number" value={cfg.foundB} onChange={e=>setCfg({...cfg,foundB:Number(e.target.value)})} className="w-full p-2 bg-slate-50 rounded-xl text-xs font-mono font-bold" /></div>
              <div className="space-y-1"><label className="text-[11px] font-bold text-slate-400 tracking-tighter">基础高 H</label><input type="number" value={cfg.foundH} onChange={e=>setCfg({...cfg,foundH:Number(e.target.value)})} className="w-full p-2 bg-slate-50 rounded-xl text-xs font-mono font-bold" /></div>
              <div className="space-y-1"><label className="text-[11px] font-bold text-blue-600 tracking-tighter underline">底筋 Φ</label><input type="number" value={cfg.foundD} onChange={e=>setCfg({...cfg,foundD:Number(e.target.value)})} className="w-full p-2 bg-blue-50 border border-blue-100 rounded-xl text-xs font-mono font-bold text-blue-600" /></div>
            </div>
          </section>
          <section className="space-y-4 pt-4 border-t">
            <p className="text-[10px] font-black text-red-600 uppercase tracking-widest bg-red-50 px-2 py-1 rounded inline-block">2. 柱子与排筋</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><label className="text-[11px] font-bold text-slate-400">柱宽 b</label><input type="number" value={cfg.colB} onChange={e=>setCfg({...cfg,colB:Number(e.target.value)})} className="w-full p-2 bg-slate-50 rounded-xl text-xs font-mono font-bold" /></div>
              <div className="space-y-1"><label className="text-[11px] font-bold text-slate-400">柱高 h</label><input type="number" value={cfg.colH} onChange={e=>setCfg({...cfg,colH:Number(e.target.value)})} className="w-full p-2 bg-slate-50 rounded-xl text-xs font-mono font-bold" /></div>
              <div className="space-y-1"><label className="text-[11px] font-bold text-red-600 tracking-tighter">纵筋 Φ</label><input type="number" value={cfg.colD} onChange={e=>setCfg({...cfg,colD:Number(e.target.value)})} className="w-full p-2 bg-red-50 border border-red-100 rounded-xl text-xs font-mono font-bold text-red-600" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[11px] text-slate-400 font-bold tracking-tighter">X 向根数</label><input type="range" min="2" max="10" value={cfg.nx} onChange={e=>setCfg({...cfg,nx:parseInt(e.target.value)})} className="w-full accent-red-600" /><div className="text-right text-[10px] font-bold text-red-600">{cfg.nx} 根</div></div>
              <div><label className="text-[11px] text-slate-400 font-bold tracking-tighter">Z 向根数</label><input type="range" min="2" max="10" value={cfg.nz} onChange={e=>setCfg({...cfg,nz:parseInt(e.target.value)})} className="w-full accent-red-600" /><div className="text-right text-[10px] font-bold text-red-600">{cfg.nz} 根</div></div>
            </div>
          </section>
          <section className="space-y-4 pt-4 border-t">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">3. 材料环境</p>
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
