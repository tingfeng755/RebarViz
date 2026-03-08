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
  // 🛡️ 强制兜底逻辑，防止 NaN 导致白屏
  const L = Number(config.foundL) || 2000;
  const B = Number(config.foundB) || 2000;
  const H = Number(config.foundH) || 600;
  const cb = Number(config.colB) || 600;
  const ch = Number(config.colH) || 600;
  const c = Number(config.cover) || 40;
  const colD = Number(config.colD) || 25;
  const nx = Math.max(2, Number(config.nx) || 4);
  const nz = Math.max(2, Number(config.nz) || 4);
  const fD = Number(config.foundD) || 14;
  const fS = Math.max(50, Number(config.foundS) || 200);

  const lae = Math.ceil((LAB_MAP[config.conc]||35) * (Z_MAP[config.seismic]||1.0) * colD);
  const bend = Math.max(6 * colD, 150);

  const bY = -H*s + c*s + (fD*s)/2;
  const tY = bY + fD*s;
  const bottomY = tY + (fD*s)/2;
  const bendR = Math.max(colD * 2.5 * s, 0.01);

  // 🔵 双向底筋网格
  const gridX = useMemo(() => {
    const span = Math.max(0, B - 2*c);
    const n = Math.max(2, Math.floor(span / fS) + 1);
    return Array.from({length:n}, (_,i) => -B*s/2 + c*s + i*(span*s/(n-1)));
  }, [B, c, fS]);

  const gridZ = useMemo(() => {
    const span = Math.max(0, L - 2*c);
    const n = Math.max(2, Math.floor(span / fS) + 1);
    return Array.from({length:n}, (_,i) => -L*s/2 + c*s + i*(span*s/(n-1)));
  }, [L, c, fS]);

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
  }, [cb, ch, nx, nz, c, bottomY, bend, bendR]);

  return (
    <group position={[0, H*s/2, 0]}>
      <mesh position={[0, -H*s/2, 0]}><boxGeometry args={[L*s, H*s, B*s]} /><meshStandardMaterial color="#38bdf8" transparent opacity={0.12} /></mesh>
      <mesh position={[0, 0.6, 0]}><boxGeometry args={[cb*s, 1.2, ch*s]} /><meshStandardMaterial color="#94a3b8" transparent opacity={0.15} /></mesh>
      <group>
        {gridX.map((z, i) => (<mesh key={`bx-${i}`} position={[0, bY, z]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[fD*s/2, fD*s/2, L*s-2*c*s, 8]} /><meshStandardMaterial color="#2563eb" /></mesh>))}
        {gridZ.map((x, i) => (<mesh key={`bz-${x}`} position={[x, tY, 0]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[fD*s/2, fD*s/2, B*s-2*c*s, 8]} /><meshStandardMaterial color="#3b82f6" /></mesh>))}
      </group>
      {colRebars.map(rb => (
        <group key={rb.id} onClick={() => onSelect({ name:'柱插筋', spec:`Φ${colD}`, val:`${lae}mm`, formula:`${lae/colD}d`, desc:`弯折max(6d,150)=${bend}mm` })}>
          <SmoothBar points={rb.pts} radius={colD*s/2} color="#dc2626" />
        </group>
      ))}
    </group>
  );
}

export default function FoundationViewer() {
  const [mounted, setMounted] = useState(false);
  const [sel, setSel] = useState(null);
  const [cfg, setCfg] = useState({ foundL:2000, foundB:2000, foundH:600, foundD:14, foundS:200, colB:600, colH:600, colD:25, nx:4, nz:4, cover:40, conc:'C30', seismic:'二级' });
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return (
    <div className="flex flex-col lg:flex-row w-full h-screen bg-white">
      <div className="flex-1 relative bg-slate-50">
        <div className="absolute top-6 left-6 z-10 font-black italic text-slate-800 tracking-tighter text-xl">22G101 独立基础 DJ 实验室</div>
        {sel && (
          <div className="absolute top-6 right-6 z-50 w-72 bg-white rounded-3xl shadow-2xl border p-6">
             <div className="flex justify-between mb-4 font-bold text-slate-800"><span>{sel.name}</span><button onClick={()=>setSel(null)}>✕</button></div>
             <div className="bg-slate-900 rounded-2xl p-5 text-center text-white shadow-xl">
                <p className="text-4xl font-black font-mono tracking-tighter">{sel.val}</p>
                <p className="text-[11px] text-blue-400 mt-2 font-mono italic">{sel.formula}</p>
             </div>
             <p className="text-[11px] text-slate-500 mt-4 italic border-l-2 border-red-500 pl-3">{sel.desc}</p>
          </div>
        )}
        <Canvas camera={{position:[4,3,4], fov:35}}>
          <ambientLight intensity={0.8} /><pointLight position={[10, 10, 10]} intensity={1.5} />
          <Scene config={cfg} onSelect={setSel} />
          <Grid args={[12,12]} cellColor="#cbd5e1" sectionColor="#94a3b8" /><OrbitControls makeDefault />
        </Canvas>
      </div>
      <div className="w-full lg:w-96 bg-white p-8 border-l overflow-y-auto shadow-2xl">
        <h3 className="font-black text-slate-800 mb-8 border-b pb-4 italic underline decoration-blue-500 decoration-4">参数控制中心</h3>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3">
             <div className="space-y-1"><label className="text-[11px] font-bold text-slate-400">基础长 L</label><input type="number" value={cfg.foundL} onChange={e=>setCfg({...cfg,foundL:Number(e.target.value)})} className="w-full p-2 bg-slate-50 rounded-xl text-xs font-mono" /></div>
             <div className="space-y-1"><label className="text-[11px] font-bold text-slate-400">基础宽 B</label><input type="number" value={cfg.foundB} onChange={e=>setCfg({...cfg,foundB:Number(e.target.value)})} className="w-full p-2 bg-slate-50 rounded-xl text-xs font-mono" /></div>
             <div className="space-y-1"><label className="text-[11px] font-bold text-blue-600">底筋 Φ</label><input type="number" value={cfg.foundD} onChange={e=>setCfg({...cfg,foundD:Number(e.target.value)})} className="w-full p-2 bg-blue-50 border border-blue-100 rounded-xl text-xs font-mono" /></div>
             <div className="space-y-1"><label className="text-[11px] font-bold text-blue-600">底筋间距 S</label><input type="number" value={cfg.foundS} onChange={e=>setCfg({...cfg,foundS:Number(e.target.value)})} className="w-full p-2 bg-blue-50 border border-blue-100 rounded-xl text-xs font-mono" /></div>
          </div>
          <div className="space-y-1 pt-4 border-t"><label className="text-[11px] font-bold text-red-600">柱纵筋 Φ</label><input type="number" value={cfg.colD} onChange={e=>setCfg({...cfg,colD:Number(e.target.value)})} className="w-full p-2 bg-red-50 border border-red-100 rounded-xl text-xs font-mono" /></div>
        </div>
      </div>
    </div>
  );
}
