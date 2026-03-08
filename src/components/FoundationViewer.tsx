/* eslint-disable */
// @ts-nocheck
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';

// 🚀 22G101 终极算量矩阵 (涵盖所有主流钢筋牌号的 lab 锚固系数)
const LAB_MAP = {
  'HPB300': { 'C25': 39, 'C30': 34, 'C35': 30, 'C40': 27, 'C45': 25, 'C50': 24 },
  'HRB400': { 'C25': 40, 'C30': 35, 'C35': 31, 'C40': 29, 'C45': 26, 'C50': 24 },
  'HRBF400': { 'C25': 40, 'C30': 35, 'C35': 31, 'C40': 29, 'C45': 26, 'C50': 24 },
  'RRB400': { 'C25': 40, 'C30': 35, 'C35': 31, 'C40': 29, 'C45': 26, 'C50': 24 },
  'HRB500': { 'C25': 49, 'C30': 43, 'C35': 38, 'C40': 34, 'C45': 31, 'C50': 29 },
  'HRBF500': { 'C25': 49, 'C30': 43, 'C35': 38, 'C40': 34, 'C45': 31, 'C50': 29 }
};
const REBAR_GRADES = Object.keys(LAB_MAP);

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

  // 🛡️ 参数防崩溃校验兜底
  const L = Number(config.foundL) || 2000;
  const B = Number(config.foundB) || 2000;
  const H = Number(config.foundH) || 600;
  const fD = Number(config.foundD) || 14;
  const fS = Math.max(50, Number(config.foundS) || 200);
  
  const hasTop = Boolean(config.hasTop);
  const tD = Number(config.topD) || 12;
  const tS = Math.max(50, Number(config.topS) || 200);

  const cb = Number(config.colB) || 600;
  const ch = Number(config.colH) || 600;
  const colD = Number(config.colD) || 25;
  const nx = Math.max(2, Number(config.nx) || 4);
  const nz = Math.max(2, Number(config.nz) || 4);
  const c = Number(config.cover) || 40;

  const conc = config.conc || 'C30';
  const seismic = config.seismic || '二级';
  const colGrade = config.colRebarGrade || 'HRB400';

  // 📐 22G101 核心计算
  const lab_factor = LAB_MAP[colGrade]?.[conc] || 35;
  const zeta_ae = Z_MAP[seismic] || 1.0;
  const lae = Math.ceil(lab_factor * zeta_ae * colD);
  
  // 弯折长度计算 max(6d, 150)
  const bend_mm = Math.max(6 * colD, 150);

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
          const bendL = Math.max(bend_mm*s, 0.01);
          
          const pts = [
            new THREE.Vector3(px, 1.5, pz),
            new THREE.Vector3(px, bottomY + bendR, pz),
            new THREE.Vector3(px + bendR*0.5*dx, bottomY + bendR*0.2, pz + bendR*0.5*dz),
            new THREE.Vector3(px + bendL*dx, bottomY, pz + bendL*dz)
          ];
          rb.push({pts, id:`c-${i}-${j}`});
        }
      }
    }
    return rb;
  }, [cb, ch, nx, nz, c, bottomY, bend_mm, bendR]);

  return (
    <group position={[0, H*s/2, 0]}>
      {/* 混凝土保护壳 */}
      <mesh position={[0, -H*s/2, 0]}><boxGeometry args={[L*s, H*s, B*s]} /><meshStandardMaterial color="#38bdf8" transparent opacity={0.12} depthWrite={false} /></mesh>
      <mesh position={[0, 0.75, 0]}><boxGeometry args={[cb*s, 1.5, ch*s]} /><meshStandardMaterial color="#94a3b8" transparent opacity={0.15} depthWrite={false} /></mesh>

      {/* 🔵 底筋网格 */}
      <group>
        {gridX.map((z, i) => (<mesh key={`bx-${i}`} position={[0, bY, z]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[fD*s/2, fD*s/2, L*s-2*c*s, 8]} /><meshStandardMaterial color="#2563eb" /></mesh>))}
        {gridZ.map((x, i) => (<mesh key={`bz-${x}`} position={[x, tY, 0]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[fD*s/2, fD*s/2, B*s-2*c*s, 8]} /><meshStandardMaterial color="#3b82f6" /></mesh>))}
      </group>

      {/* 🟣 面筋网格 */}
      {hasTop && (
        <group>
          {Array.from({length:Math.max(2, Math.floor((B-2*c)/tS)+1)}).map((_,i)=>(<mesh key={`tx-${i}`} position={[0, topMeshY, -B*s/2+c*s+i*tS*s]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[tD*s/2, tD*s/2, L*s-2*c*s, 8]} /><meshStandardMaterial color="#a855f7" /></mesh>))}
          {Array.from({length:Math.max(2, Math.floor((L-2*c)/tS)+1)}).map((_,i)=>(<mesh key={`tz-${i}`} position={[-L*s/2+c*s+i*tS*s, topMeshY-tD*s, 0]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[tD*s/2, tD*s/2, B*s-2*c*s, 8]} /><meshStandardMaterial color="#c084fc" /></mesh>))}
        </group>
      )}

      {/* 🔴 柱插筋 */}
      {colRebars.map(rb => (
        <group key={rb.id} onClick={(e) => { 
          e.stopPropagation(); 
          onSelect({ 
            name: '柱纵筋基础弯折', 
            spec: `${colGrade} Φ${colD}`, 
            val: `${bend_mm}mm`, 
            formula: `弯折公式: max(6d, 150) = max(${6*colD}, 150)`, 
            desc: `22G101规定：柱插筋伸至基础底部，其弯折长度取 6d 与 150mm 的较大值。当前锚固总长 lae = ${lae}mm。` 
          }); 
        }}>
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
    conc:'C30', seismic:'二级', cover: 40,
    foundL:2000, foundB:2000, foundH:600, foundRebarGrade: 'HRB400', foundD:14, foundS:200, 
    hasTop:false, topRebarGrade: 'HRB400', topD:12, topS:200,
    colB:600, colH:600, colRebarGrade: 'HRB400', colD:25, nx:4, nz:4 
  });

  useEffect(() => { setM(true); }, []);

  const handleChange = (key, value) => {
    setCfg(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="flex flex-col lg:flex-row w-full h-screen bg-slate-100 overflow-hidden text-slate-900">
      {/* ================= 左侧 3D 画布区域 ================= */}
      <div className="flex-1 relative">
        <div className="absolute top-6 left-6 z-10"><h1 className="text-2xl font-black italic tracking-tighter text-slate-800 drop-shadow-sm">独立基础 <span className="text-blue-600">DJ</span></h1><p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">22G101-3 识图实验室</p></div>
        
        {/* 🚀 左侧弹窗：柱钢筋弯折明细 */}
        {sel && (
          <div className="absolute top-24 left-6 z-50 w-80 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 p-6 animate-in slide-in-from-left">
             <div className="flex justify-between items-center mb-4">
               <span className="font-black text-slate-800 flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded-full"></div>{sel.name}</span>
               <button onClick={()=>setSel(null)} className="text-slate-400 hover:text-red-500 transition-colors">✕</button>
             </div>
             <div className="bg-slate-900 rounded-xl p-5 text-center text-white shadow-inner">
                <p className="text-[10px] text-slate-400 uppercase mb-2 tracking-widest border-b border-slate-700 pb-2">{sel.spec}</p>
                <p className="text-5xl font-black font-mono text-yellow-400 tracking-tighter drop-shadow-md">{sel.val}</p>
                <p className="text-[11px] text-emerald-400 mt-3 font-mono bg-emerald-400/10 py-1 rounded">{sel.formula}</p>
             </div>
             <p className="text-xs text-slate-600 mt-4 leading-relaxed border-l-4 border-red-500 pl-3 bg-red-50/50 py-2 rounded-r-lg">{sel.desc}</p>
          </div>
        )}

        <div className="w-full h-full">
          {m && (
            <Canvas camera={{position:[4.5, 3.5, 4.5], fov:35}}>
              <ambientLight intensity={0.8} />
              <pointLight position={[10, 10, 10]} intensity={1.5} />
              <Scene config={cfg} onSelect={setSel} />
              <Grid args={[12, 12]} cellColor="#cbd5e1" sectionColor="#94a3b8" />
              <OrbitControls makeDefault />
            </Canvas>
          )}
        </div>
      </div>

      {/* ================= 右侧 三分区 控制台 ================= */}
      <div className="w-full lg:w-[420px] bg-white border-l border-slate-200 shadow-2xl overflow-y-auto flex flex-col">
        <div className="p-6 bg-slate-900 text-white sticky top-0 z-20 shadow-md">
          <h3 className="font-black italic tracking-wider text-lg flex items-center gap-2">📐 参数控制面板</h3>
        </div>

        <div className="p-6 space-y-8">
          
          {/* ============ 1. 外部条件 ============ */}
          <section className="space-y-4">
             <div className="flex items-center gap-2 border-b-2 border-indigo-100 pb-2">
               <div className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded flex items-center justify-center font-black text-xs">1</div>
               <h4 className="font-bold text-slate-800">外部条件</h4>
             </div>
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1.5"><label className="text-xs font-bold text-slate-500">混凝土强度</label><select value={cfg.conc} onChange={e=>handleChange('conc', e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-indigo-500 transition-colors">{Object.keys(LAB_MAP['HRB400']).map(g=><option key={g} value={g}>{g}</option>)}</select></div>
               <div className="space-y-1.5"><label className="text-xs font-bold text-slate-500">抗震等级</label><select value={cfg.seismic} onChange={e=>handleChange('seismic', e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-indigo-500 transition-colors">{Object.keys(Z_MAP).map(g=><option key={g} value={g}>{g}</option>)}</select></div>
             </div>
          </section>

          {/* ============ 2. 独立基础 ============ */}
          <section className="space-y-4">
             <div className="flex items-center gap-2 border-b-2 border-blue-100 pb-2">
               <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded flex items-center justify-center font-black text-xs">2</div>
               <h4 className="font-bold text-slate-800">独立基础 (DJ)</h4>
             </div>
             
             {/* 基础尺寸 */}
             <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-3">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">基础尺寸 (mm)</p>
               <div className="grid grid-cols-3 gap-2">
                 <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500">长 L</label><input type="number" value={cfg.foundL} onChange={e=>handleChange('foundL', e.target.value)} className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold outline-none focus:border-blue-500" /></div>
                 <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500">宽 B</label><input type="number" value={cfg.foundB} onChange={e=>handleChange('foundB', e.target.value)} className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold outline-none focus:border-blue-500" /></div>
                 <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500">高 H</label><input type="number" value={cfg.foundH} onChange={e=>handleChange('foundH', e.target.value)} className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold outline-none focus:border-blue-500" /></div>
               </div>
             </div>

             {/* 底筋排布 */}
             <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 space-y-3">
               <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">底筋排布</p>
               <div className="grid grid-cols-3 gap-2">
                 <div className="space-y-1">
                   <label className="text-[10px] font-bold text-blue-600">强度</label>
                   <select value={cfg.foundRebarGrade} onChange={e=>handleChange('foundRebarGrade', e.target.value)} className="w-full p-2 bg-white border border-blue-200 rounded-lg text-xs font-bold outline-none focus:border-blue-500">
                     {REBAR_GRADES.map(g=><option key={g} value={g}>{g}</option>)}
                   </select>
                 </div>
                 <div className="space-y-1"><label className="text-[10px] font-bold text-blue-600">直径 Φ</label><input type="number" value={cfg.foundD} onChange={e=>handleChange('foundD', e.target.value)} className="w-full p-2 bg-white border border-blue-200 rounded-lg text-xs font-mono font-bold outline-none focus:border-blue-500" /></div>
                 <div className="space-y-1"><label className="text-[10px] font-bold text-blue-600">间距 S</label><input type="number" value={cfg.foundS} onChange={e=>handleChange('foundS', e.target.value)} className="w-full p-2 bg-white border border-blue-200 rounded-lg text-xs font-mono font-bold outline-none focus:border-blue-500" /></div>
               </div>
             </div>

             {/* 面筋排布 */}
             <div className="bg-purple-50/50 p-3 rounded-xl border border-purple-100 space-y-3 transition-all">
               <div className="flex justify-between items-center">
                 <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest">面筋排布 (可选)</p>
                 <input type="checkbox" checked={cfg.hasTop} onChange={e=>handleChange('hasTop', e.target.checked)} className="w-4 h-4 accent-purple-600 cursor-pointer" />
               </div>
               {cfg.hasTop && (
                 <div className="grid grid-cols-3 gap-2 animate-in fade-in zoom-in duration-300">
                   <div className="space-y-1">
                     <label className="text-[10px] font-bold text-purple-600">强度</label>
                     <select value={cfg.topRebarGrade} onChange={e=>handleChange('topRebarGrade', e.target.value)} className="w-full p-2 bg-white border border-purple-200 rounded-lg text-xs font-bold outline-none focus:border-purple-500">
                       {REBAR_GRADES.map(g=><option key={g} value={g}>{g}</option>)}
                     </select>
                   </div>
                   <div className="space-y-1"><label className="text-[10px] font-bold text-purple-600">直径 Φ</label><input type="number" value={cfg.topD} onChange={e=>handleChange('topD', e.target.value)} className="w-full p-2 bg-white border border-purple-200 rounded-lg text-xs font-mono font-bold outline-none focus:border-purple-500" /></div>
                   <div className="space-y-1"><label className="text-[10px] font-bold text-purple-600">间距 S</label><input type="number" value={cfg.topS} onChange={e=>handleChange('topS', e.target.value)} className="w-full p-2 bg-white border border-purple-200 rounded-lg text-xs font-mono font-bold outline-none focus:border-purple-500" /></div>
                 </div>
               )}
             </div>
          </section>

          {/* ============ 3. 框架柱 ============ */}
          <section className="space-y-4 pb-12">
             <div className="flex items-center gap-2 border-b-2 border-red-100 pb-2">
               <div className="w-6 h-6 bg-red-100 text-red-600 rounded flex items-center justify-center font-black text-xs">3</div>
               <h4 className="font-bold text-slate-800">框架柱 (KZ)</h4>
             </div>

             <div className="bg-red-50/30 p-3 rounded-xl border border-red-100 space-y-4">
               <div className="grid grid-cols-2 gap-3">
                 <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500">柱宽 b (mm)</label><input type="number" value={cfg.colB} onChange={e=>handleChange('colB', e.target.value)} className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold outline-none focus:border-red-400" /></div>
                 <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500">柱高 h (mm)</label><input type="number" value={cfg.colH} onChange={e=>handleChange('colH', e.target.value)} className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold outline-none focus:border-red-400" /></div>
               </div>

               <div className="grid grid-cols-2 gap-3">
                 <div className="space-y-1">
                   <label className="text-[10px] font-bold text-red-600">纵筋强度</label>
                   <select value={cfg.colRebarGrade} onChange={e=>handleChange('colRebarGrade', e.target.value)} className="w-full p-2 bg-white border border-red-200 rounded-lg text-xs font-bold outline-none focus:border-red-500">
                     {REBAR_GRADES.map(g=><option key={g} value={g}>{g}</option>)}
                   </select>
                 </div>
                 <div className="space-y-1"><label className="text-[10px] font-bold text-red-600">纵筋直径 Φ</label><input type="number" value={cfg.colD} onChange={e=>handleChange('colD', e.target.value)} className="w-full p-2 bg-white border border-red-200 rounded-lg text-xs font-mono font-bold outline-none focus:border-red-500" /></div>
               </div>

               <div className="pt-2 border-t border-red-100 grid grid-cols-2 gap-4">
                 <div>
                   <label className="text-[10px] font-bold text-slate-500 flex justify-between"><span>X向根数</span><span className="text-red-500">{cfg.nx} 根</span></label>
                   <input type="range" min="2" max="10" value={cfg.nx} onChange={e=>handleChange('nx', parseInt(e.target.value))} className="w-full accent-red-600 mt-1" />
                 </div>
                 <div>
                   <label className="text-[10px] font-bold text-slate-500 flex justify-between"><span>Z向根数</span><span className="text-red-500">{cfg.nz} 根</span></label>
                   <input type="range" min="2" max="10" value={cfg.nz} onChange={e=>handleChange('nz', parseInt(e.target.value))} className="w-full accent-red-600 mt-1" />
                 </div>
               </div>
             </div>
          </section>

        </div>
      </div>
    </div>
  );
}
