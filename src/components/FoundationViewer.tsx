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

  // 🛡️ 钛合金防弹衣：拦截所有 NaN 和 0
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
  
  const hasTop = Boolean(config.hasTop);
  const tD = Number(config.topD) || 12;
  const tS = Math.max(50, Number(config.topS) || 200);

  const conc = config.conc || 'C30';
  const seismic = config.seismic || '二级';

  // 22G101 计算
  const lae = Math.ceil((LAB_MAP[conc]||35) * (Z_MAP[seismic]||1.0) * colD);
  const bend = Math.max(6 * colD, 150);

  // 标高基准
  const bY = -H*s + c*s + (fD*s)/2;
  const tY = bY + fD*s;
  const topMeshY = -c*s - (tD*s)/2;
  const bottomY = tY + (fD*s)/2;
  const bendR = Math.max(colD * 2.5 * s, 0.01);

  // 🔵 底筋网格
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

  // 🔴 柱筋矩阵生成
  const colRebars = useMemo(() => {
    const rb = [];
    const sx = Math.max(0, cb - 2*c)/(nx-1); 
    const sz = Math.max(0, ch - 2*c)/(nz-1);
    
    for(let i=0; i<nx; i++) {
      for(let j=0; j<nz; j++) {
        if(i===0||i===nx-1||j===0||j===nz-1) {
          const px = -cb*s/2 + c*s + i*sx*s; 
          const pz = -ch*s/2 + c*s + j*sz*s;
          const dx = i===0?-1:(i===nx-1?1:0); 
          const dz = j===0?-1:(j===nz-1?1:0);
          const bendL = Math.max(bend*s, 0.01);
          
          const pts = [
            new THREE.Vector3(px, 1.2, pz),
            new THREE.Vector3(px, bottomY + bendR, pz),
            new THREE.Vector3(px + bendR*0.5*dx, bottomY + bendR*0.2, pz + bendR*0.5*dz),
            new THREE.Vector3(px + bendL*dx, bottomY, pz + bendL*dz)
          ];
          rb.push({pts, id:`c-${i}-${j}`});
        }
      }
    }
    return rb;
  }, [cb, ch, nx, nz, c, bottomY, bend, bendR]);

  return (
    <group position={[0, H*s/2, 0]}>
      {/* 混凝土保护壳 */}
      <mesh position={[0, -H*s/2, 0]}><boxGeometry args={[L*s, H*s, B*s]} /><meshStandardMaterial color="#38bdf8" transparent opacity={0.12} depthWrite={false} /></mesh>
      <mesh position={[0, 0.6, 0]}><boxGeometry args={[cb*s, 1.2, ch*s]} /><meshStandardMaterial color="#94a3b8" transparent opacity={0.15} depthWrite={false} /></mesh>

      {/* 🔵 底筋网格 */}
      <group>
        {gridX.map((z, i) => (<mesh key={`bx-${i}`} position={[0, bY, z]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[fD*s/2, fD*s/2, L*s-2*c*s, 8]} /><meshStandardMaterial color="#2563eb" /></mesh>))}
        {gridZ.map((x, i) => (<mesh key={`bz-${x}`} position={[x, tY, 0]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[fD*s/2, fD*s/2, B*s-2*c*s, 8]} /><meshStandardMaterial color="#3b82f6" /></mesh>))}
      </group>

      {/* 🟣 面筋网格 (独立控制间距和直径) */}
      {hasTop && (
        <group>
          {Array.from({length:Math.max(2, Math.floor((B-2*c)/tS)+1)}).map((_,i)=>(<mesh key={`tx-${i}`} position={[0, topMeshY, -B*s/2+c*s+i*tS*s]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[tD*s/2, tD*s/2, L*s-2*c*s, 8]} /><meshStandardMaterial color="#a855f7" /></mesh>))}
          {Array.from({length:Math.max(2, Math.floor((L-2*c)/tS)+1)}).map((_,i)=>(<mesh key={`tz-${i}`} position={[-L*s/2+c*s+i*tS*s, topMeshY-tD*s, 0]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[tD*s/2, tD*s/2, B*s-2*c*s, 8]} /><meshStandardMaterial color="#c084fc" /></mesh>))}
        </group>
      )}

      {/* 🔴 柱插筋 */}
      {colRebars.map(rb => (
        <group key={rb.id} onClick={(e) => { e.stopPropagation(); onSelect({ name:'柱纵向插筋', spec:`Φ${colD}`, val:`${lae}mm`, formula:`lae = ζae × lab = ${(lae/colD).toFixed(1)}d`, desc:`22G101构造: max(6d,150)=${bend}mm` }); }}>
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
    colB:600, colH:600, colD:25, nx:4, nz:4, cover:40, 
    conc:'C30', seismic:'二级', hasTop:false, topD:12, topS:200 
  });

  useEffect(() => { setM(true); }, []);

  const handleChange = (key, value) => {
    setCfg(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="flex flex-col lg:flex-row w-full h-screen bg-white overflow-hidden text-slate-900">
      <div className="flex-1 relative bg-slate-50">
        <div className="absolute top-6 left-6 z-10"><h1 className="text-xl font-black italic tracking-tighter">独立基础 DJ <span className="text-blue-600">22G101 实验室</span></h1></div>
        
        {sel && (
          <div className="absolute top-6 right-6 z-50 w-72 bg-white/95 backdrop-blur rounded-3xl shadow-2xl border p-6 animate-in slide-in-from-right">
             <div className="flex justify-between items-center mb-5 font-bold"><span>{sel.name}</span><button onClick={()=>setSel(null)} className="text-slate-400 hover:text-slate-800">✕</button></div>
             <div className="bg-slate-900 rounded-2xl p-5 text-center text-white shadow-xl">
                <p className="text-[10px] text-slate-400 uppercase mb-1 tracking-widest">锚固计算明细</p>
                <p className="text-4xl font-black font-mono text-yellow-400">{sel.val}</p>
                <p className="text-[11px] text-blue-400 mt-2 font-mono italic">{sel.formula}</p>
             </div>
             <p className="text-[11px] text-slate-500 mt-4 border-l-2 border-red-500 pl-3 italic leading-relaxed">{sel.desc}</p>
          </div>
        )}

        <div className="w-full h-full">
          {m && (
            <Canvas camera={{position:[3.5, 2.5, 3.5], fov:35}}>
              <ambientLight intensity={0.8} />
              <pointLight position={[10, 10, 10]} intensity={1.5} />
              <Scene config={cfg} onSelect={setSel} />
              <Grid args={[12, 12]} cellColor="#cbd5e1" sectionColor="#94a3b8" />
              <OrbitControls makeDefault />
            </Canvas>
          )}
        </div>
      </div>

      <div className="w-full lg:w-96 bg-white p-8 shadow-2xl border-l overflow-y-auto">
        <h3 className="font-black text-slate-800 mb-8 border-b pb-4 italic tracking-tighter text-lg">📐 工业级参数面板</h3>
        <div className="space-y-8">
          
          {/* === 1. 基础几何与钢筋网 === */}
          <section className="space-y-4">
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded inline-block">1. 基础几何与底筋 (mm)</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><label className="text-[11px] font-bold text-slate-400">基础长 L</label><input type="number" value={cfg.foundL} onChange={e=>handleChange('foundL', e.target.value)} className="w-full p-2 bg-slate-50 rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all" /></div>
              <div className="space-y-1"><label className="text-[11px] font-bold text-slate-400">基础宽 B</label><input type="number" value={cfg.foundB} onChange={e=>handleChange('foundB', e.target.value)} className="w-full p-2 bg-slate-50 rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-indigo-500" /></div>
              <div className="space-y-1"><label className="text-[11px] font-bold text-slate-400">基础高 H</label><input type="number" value={cfg.foundH} onChange={e=>handleChange('foundH', e.target.value)} className="w-full p-2 bg-slate-50 rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-indigo-500" /></div>
              <div className="col-span-1"></div> {/* 占位符保证排版美观 */}
              
              <div className="space-y-1"><label className="text-[11px] font-bold text-blue-600">底筋直径 d</label><input type="number" value={cfg.foundD} onChange={e=>handleChange('foundD', e.target.value)} className="w-full p-2 bg-blue-50 border border-blue-100 rounded-xl text-xs font-mono font-bold text-blue-600 outline-none" /></div>
              <div className="space-y-1"><label className="text-[11px] font-bold text-blue-600">底筋间距 S</label><input type="number" value={cfg.foundS} onChange={e=>handleChange('foundS', e.target.value)} className="w-full p-2 bg-blue-50 border border-blue-100 rounded-xl text-xs font-mono font-bold text-blue-600 outline-none" /></div>
            </div>

            {/* 🚀 新增：面筋专属控制区 */}
            <div className="pt-2 mt-4 border-t border-slate-100">
               <div className="flex items-center justify-between p-3 bg-purple-50 rounded-xl">
                  <span className="text-[11px] font-bold text-purple-600 uppercase tracking-widest">配置顶部面筋</span>
                  <input type="checkbox" checked={cfg.hasTop} onChange={e=>handleChange('hasTop', e.target.checked)} className="w-4 h-4 accent-purple-600 cursor-pointer" />
               </div>
               
               {cfg.hasTop && (
                  <div className="grid grid-cols-2 gap-3 mt-3 animate-in fade-in zoom-in duration-300">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-purple-500">面筋直径 d'</label>
                      <input type="number" value={cfg.topD} onChange={e=>handleChange('topD', e.target.value)} className="w-full p-2 bg-purple-50 border border-purple-100 rounded-xl text-xs font-mono font-bold text-purple-600 outline-none focus:ring-2 focus:ring-purple-400 transition-all" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-purple-500">面筋间距 S'</label>
                      <input type="number" value={cfg.topS} onChange={e=>handleChange('topS', e.target.value)} className="w-full p-2 bg-purple-50 border border-purple-100 rounded-xl text-xs font-mono font-bold text-purple-600 outline-none focus:ring-2 focus:ring-purple-400 transition-all" />
                    </div>
                  </div>
               )}
            </div>
          </section>

          {/* === 2. 柱构件及排布 === */}
          <section className="space-y-4 pt-4 border-t">
            <p className="text-[10px] font-black text-red-600 uppercase tracking-widest bg-red-50 px-2 py-1 rounded inline-block">2. 柱构件及排布 (mm)</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><label className="text-[11px] font-bold text-slate-400">柱宽 b</label><input type="number" value={cfg.colB} onChange={e=>handleChange('colB', e.target.value)} className="w-full p-2 bg-slate-50 rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-red-400" /></div>
              <div className="space-y-1"><label className="text-[11px] font-bold text-slate-400">柱高 h</label><input type="number" value={cfg.colH} onChange={e=>handleChange('colH', e.target.value)} className="w-full p-2 bg-slate-50 rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-red-400" /></div>
              <div className="space-y-1 col-span-2"><label className="text-[11px] font-bold text-red-600">纵筋 Φ</label><input type="number" value={cfg.colD} onChange={e=>handleChange('colD', e.target.value)} className="w-full p-2 bg-red-50 border border-red-100 rounded-xl text-xs font-mono font-bold text-red-600 outline-none" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div>
                <label className="text-[11px] text-slate-400 font-bold flex justify-between"><span>X向根数</span><span className="text-red-500">{cfg.nx} 根</span></label>
                <input type="range" min="2" max="10" value={cfg.nx} onChange={e=>handleChange('nx', parseInt(e.target.value))} className="w-full accent-red-600 mt-1" />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 font-bold flex justify-between"><span>Z向根数</span><span className="text-red-500">{cfg.nz} 根</span></label>
                <input type="range" min="2" max="10" value={cfg.nz} onChange={e=>handleChange('nz', parseInt(e.target.value))} className="w-full accent-red-600 mt-1" />
              </div>
            </div>
          </section>

          {/* === 3. 材料环境 === */}
          <section className="space-y-4 pt-4 border-t">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">3. 规范算量环境</p>
             <div className="grid grid-cols-2 gap-3">
               <select value={cfg.conc} onChange={e=>handleChange('conc', e.target.value)} className="p-2.5 bg-slate-50 border-none rounded-xl text-xs font-bold outline-none shadow-sm">{Object.keys(LAB_MAP).map(g=><option key={g} value={g}>{g}</option>)}</select>
               <select value={cfg.seismic} onChange={e=>handleChange('seismic', e.target.value)} className="p-2.5 bg-slate-50 border-none rounded-xl text-xs font-bold outline-none shadow-sm">{Object.keys(Z_MAP).map(g=><option key={g} value={g}>{g}</option>)}</select>
             </div>
          </section>
        </div>
      </div>
    </div>
  );
}
