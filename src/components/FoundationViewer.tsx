/* eslint-disable */
// @ts-nocheck
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Float } from '@react-three/drei';
import * as THREE from 'three';

// 🚀 22G101-1 专业参数矩阵
const CONC_GRADES = ['C25', 'C30', 'C35', 'C40', 'C45', 'C50'];
const SEISMIC_GRADES = ['一级', '二级', '三级', '四级', '非抗震'];
const LAB_MAP = { 'C25': 40, 'C30': 35, 'C35': 31, 'C40': 29, 'C45': 26, 'C50': 24 };

// 🌟 丝滑动画组件：平滑过渡钢筋位置
function AnimatedTube({ points, radius, color }) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5), [points]);
  return (
    <mesh>
      <tubeGeometry args={[curve, 64, radius, 12, false]} />
      <meshStandardMaterial color={color} roughness={0.3} metalness={0.8} />
    </mesh>
  );
}

// 🚧 3D 核心逻辑
function FoundationScene({ config, onSelect }) {
  const scale = 0.001;
  const { 
    foundL, foundB, foundH, cover, 
    colB, colH, colD, 
    nx, nz, // 🚀 新增：X向和Z向的柱筋根数
    foundD, foundSpacing, 
    concGrade, seismicGrade 
  } = config;

  // 1. 自动计算 22G101 锚固
  const lab_factor = LAB_MAP[concGrade] || 35;
  const zeta_ae = (seismicGrade === '一级' || seismicGrade === '二级') ? 1.15 : (seismicGrade === '三级' ? 1.05 : 1.0);
  const lae_val = Math.ceil(lab_factor * zeta_ae * colD);
  const bend_mm = Math.max(6 * colD, 150);

  const fL = foundL * scale; const fB = foundB * scale; const fH = foundH * scale; const c = cover * scale;
  const cB = colB * scale; const cH = colH * scale; const cD = colD * scale; 
  const rCol = cD / 2; const fD = foundD * scale; const rFound = fD / 2;

  const meshTopY = -fH + c + fD + rFound; 
  const bottomY = meshTopY + rFound;
  const bendR = colD * 2.5 * scale;

  // 2. 🚀 动态矩阵布筋算法：根据 nx, nz 自动排布柱筋
  const colRebars = useMemo(() => {
    const rebars = [];
    const spacingX = (cB - 2 * c) / (nx - 1);
    const spacingZ = (cH - 2 * c) / (nz - 1);

    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < nz; j++) {
        // 仅排布四周的钢筋
        if (i === 0 || i === nx - 1 || j === 0 || j === nz - 1) {
          const posX = -cB/2 + c + i * spacingX;
          const posZ = -cH/2 + c + j * spacingZ;
          
          // 计算弯折方向 (向外)
          const dx = i === 0 ? -1 : (i === nx - 1 ? 1 : 0);
          const dz = j === 0 ? -1 : (j === nz - 1 ? 1 : 0);
          
          const pts = [
            new THREE.Vector3(posX, 1.2, posZ),
            new THREE.Vector3(posX, bottomY + bendR, posZ),
            new THREE.Vector3(posX + bendR * 0.5 * dx, bottomY + bendR * 0.2, posZ + bendR * 0.5 * dz),
            new THREE.Vector3(posX + bend_mm * scale * dx, bottomY, posZ + bend_mm * scale * dz)
          ];
          rebars.push({ pts, id: `rebar-${i}-${j}` });
        }
      }
    }
    return rebars;
  }, [cB, cH, nx, nz, c, bend_mm, bottomY]);

  return (
    <group position={[0, fH/2, 0]}>
      {/* 基础外壳 */}
      <mesh position={[0, -fH/2, 0]}>
        <boxGeometry args={[fL, fH, fB]} />
        <meshStandardMaterial color="#38bdf8" transparent opacity={0.1} />
      </mesh>

      {/* 🚀 动态生成的柱筋矩阵 */}
      {colRebars.map(rebar => (
        <group key={rebar.id} onClick={() => onSelect({
          name: '柱纵向受力筋', spec: `Φ${colD}`, 
          formula: `${zeta_ae} × ${lab_factor}d`, calcLabel: 'lae', calcValue: `${lae_val}mm`,
          desc: `依据 22G101-1，${concGrade}混凝土在${seismicGrade}条件下的锚固。`, color: 'bg-red-600'
        })}>
          <AnimatedTube points={rebar.pts} radius={rCol} color="#dc2626" />
        </group>
      ))}

      {/* 底部网片 */}
      <Grid args={[10, 10]} cellColor="#cbd5e1" sectionColor="#94a3b8" />
    </group>
  );
}

export default function FoundationViewer() {
  const [mounted, setMounted] = useState(false);
  const [selectedRebar, setSelectedRebar] = useState(null);
  const [config, setConfig] = useState({
    foundL: 2000, foundB: 2000, foundH: 600, foundD: 14, foundSpacing: 200,
    colB: 600, colH: 600, colD: 25, 
    nx: 4, nz: 4, // 🚀 默认每边 4 根筋
    cover: 40, concGrade: 'C30', seismicGrade: '二级'
  });

  useEffect(() => { setMounted(true); }, []);

  return (
    <div className="flex flex-col lg:flex-row w-full h-screen bg-white">
      <div className="flex-1 relative bg-slate-50">
        <div className="absolute top-6 left-6 z-10">
          <h1 className="text-xl font-black text-slate-800 tracking-tighter">独立基础 DJ <span className="text-blue-600">3D 实验室</span></h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase">Building Code: 22G101-1/3</p>
        </div>

        {selectedRebar && (
          <div className="absolute top-6 right-6 z-50 w-72 bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 p-5 animate-in slide-in-from-top-4">
             <div className="flex justify-between items-start mb-4">
                <div>
                   <h2 className="font-black text-lg text-slate-800">{selectedRebar.name}</h2>
                   <span className="bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded-full font-bold">{selectedRebar.spec}</span>
                </div>
                <button onClick={() => setSelectedRebar(null)} className="text-slate-300 hover:text-slate-600">✕</button>
             </div>
             <div className="space-y-4">
                <div className="bg-slate-900 rounded-xl p-4 text-center">
                   <p className="text-[10px] text-slate-500 mb-1 uppercase tracking-widest">Anchorage Length (lae)</p>
                   <p className="text-3xl font-black text-white font-mono">{selectedRebar.calcValue}</p>
                   <p className="text-[11px] text-blue-400 mt-2 font-mono">{selectedRebar.formula}</p>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed italic border-l-2 border-red-500 pl-3">{selectedRebar.desc}</p>
             </div>
          </div>
        )}

        <div className="w-full h-full">
          {mounted && (
            <Canvas camera={{ position: [4, 3, 4], fov: 35 }}>
              <ambientLight intensity={0.8} />
              <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
              <FoundationScene config={config} onSelect={setSelectedRebar} />
              <OrbitControls makeDefault minDistance={2} maxDistance={10} />
            </Canvas>
          )}
        </div>
      </div>

      <div className="w-full lg:w-96 bg-white border-l border-slate-100 p-8 overflow-y-auto">
        <div className="flex items-center gap-3 mb-8">
           <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">📐</div>
           <h3 className="font-black text-slate-800 text-xl tracking-tight">控制台</h3>
        </div>

        <div className="space-y-8">
          <section>
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4">1. 核心材料等级</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 ml-1">混凝土等级</label>
                <select value={config.concGrade} onChange={e => setConfig({...config, concGrade: e.target.value})} className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all">
                  {CONC_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 ml-1">抗震等级</label>
                <select value={config.seismicGrade} onChange={e => setConfig({...config, seismicGrade: e.target.value})} className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all">
                  {SEISMIC_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>
          </section>

          <section>
            <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-4">2. 柱纵筋排布 (根数)</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 ml-1">X 向根数</label>
                <input type="range" min="2" max="10" step="1" value={config.nx} onChange={e => setConfig({...config, nx: parseInt(e.target.value)})} className="w-full accent-red-600" />
                <div className="text-right font-mono font-bold text-red-600 text-xs">{config.nx} 根</div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 ml-1">Z 向根数</label>
                <input type="range" min="2" max="10" step="1" value={config.nz} onChange={e => setConfig({...config, nz: parseInt(e.target.value)})} className="w-full accent-red-600" />
                <div className="text-right font-mono font-bold text-red-600 text-xs">{config.nz} 根</div>
              </div>
            </div>
          </section>

          <section>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">3. 几何参数 (mm)</p>
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 ml-1">柱截面 b</label>
                  <input type="number" value={config.colB} onChange={e => setConfig({...config, colB: Number(e.target.value)})} className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-bold" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 ml-1">柱截面 h</label>
                  <input type="number" value={config.colH} onChange={e => setConfig({...config, colH: Number(e.target.value)})} className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-bold" />
                </div>
             </div>
          </section>
        </div>
      </div>
    </div>
  );
}
