/* eslint-disable */
// @ts-nocheck
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';

// 🚀 22G101-1 锚固长度基本值矩阵 (HRB400钢筋)
const LAB_MAP = {
  'C25': 40, 'C30': 35, 'C35': 31, 'C40': 29, 'C45': 26, 'C50': 24
};

// 修正系数 ζae
const ZETA_AE_MAP = {
  '一级': 1.15, '二级': 1.15, '三级': 1.05, '四级': 1.0, '非抗震': 1.0
};

// 样条曲线平滑钢筋组件
function SmoothRebar({ points, radius, color }) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5), [points]);
  return (
    <mesh>
      <tubeGeometry args={[curve, 64, radius, 12, false]} />
      <meshStandardMaterial color={color} roughness={0.3} metalness={0.8} />
    </mesh>
  );
}

// 🚧 独立基础 3D 场景核心
function FoundationScene({ config, onSelect }) {
  const scale = 0.001;
  const { 
    foundL, foundB, foundH, cover, 
    colB, colH, colD, nx, nz,
    foundD, foundSpacing, 
    concGrade, seismicGrade 
  } = config;

  // --- 22G101 核心算量大脑 ---
  const lab_factor = LAB_MAP[concGrade] || 35;
  const zeta_ae = ZETA_AE_MAP[seismicGrade] || 1.0;
  const lae_val = Math.ceil(lab_factor * zeta_ae * colD); // 抗震锚固长度计算
  const bend_mm = Math.max(6 * colD, 150); // 弯折长度构造要求

  const fL = foundL * scale; const fB = foundB * scale; const fH = foundH * scale; const c = cover * scale;
  const cB = colB * scale; const cH = colH * scale; const cD = colD * scale; const rCol = cD / 2;
  const fD = foundD * scale; const rFound = fD / 2; const fS = foundSpacing * scale;

  // 标高基准
  const meshBottomY = -fH + c + rFound;
  const meshTopY = -fH + c + fD + rFound;
  const bottomY = meshTopY + rFound;
  const topY = 1.2;
  const bendR = colD * 2.5 * scale;

  // 1. 底板双向钢筋网排布算法
  const countZ = Math.max(2, Math.floor((foundB - 2 * cover) / foundSpacing) + 1);
  const foundRebarsX = Array.from({ length: countZ }, (_, i) => -fB/2 + c + i * ((foundB - 2 * cover) / (countZ - 1)));
  const countX = Math.max(2, Math.floor((foundL - 2 * cover) / foundSpacing) + 1);
  const foundRebarsZ = Array.from({ length: countX }, (_, i) => -fL/2 + c + i * ((foundL - 2 * cover) / (countX - 1)));

  // 2. 柱纵筋矩阵生成算法 (支持 nx, nz 动态根数)
  const colRebars = useMemo(() => {
    const rebars = [];
    const stepX = (cB - 2 * c) / (nx - 1);
    const stepZ = (cH - 2 * c) / (nz - 1);

    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < nz; j++) {
        // 只布设四周的纵筋
        if (i === 0 || i === nx - 1 || j === 0 || j === nz - 1) {
          const px = -cB/2 + c + i * stepX;
          const pz = -cH/2 + c + j * stepZ;
          const dx = i === 0 ? -1 : (i === nx - 1 ? 1 : 0);
          const dz = j === 0 ? -1 : (j === nz - 1 ? 1 : 0);
          
          const pts = [
            new THREE.Vector3(px, topY, pz),
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
      {/* 混凝土壳体 */}
      <mesh position={[0, -fH/2, 0]}>
        <boxGeometry args={[fL, fH, fB]} />
        <meshStandardMaterial color="#38bdf8" transparent opacity={0.12} depthWrite={false} />
      </mesh>
      <mesh position={[0, topY/2, 0]}>
        <boxGeometry args={[cB, topY, cH]} />
        <meshStandardMaterial color="#94a3b8" transparent opacity={0.15} depthWrite={false} />
      </mesh>

      {/* 🔵 底板双向钢筋网 */}
      <group>
        {foundRebarsX.map((z, i) => (
          <mesh key={`fx-${i}`} position={[0, meshBottomY, z]} rotation={[0, 0, Math.PI/2]}
            onClick={(e) => { e.stopPropagation(); onSelect({
              name: '底板受力筋 (X向)', spec: `Φ${foundD}@${foundSpacing}`,
              formula: `n = (B - 2c) / s + 1`, calcLabel: '当前排布根数', calcValue: `${countZ} 根`,
              desc: '基础底板底层受力钢筋。', color: 'bg-blue-600'
            })}}>
            <cylinderGeometry args={[rFound, rFound, fL - 2*c, 8]} />
            <meshStandardMaterial color="#2563eb" />
          </mesh>
        ))}
        {foundRebarsZ.map((x, i) => (
          <mesh key={`fz-${i}`} position={[x, meshTopY, 0]} rotation={[Math.PI/2, 0, 0]}
            onClick={(e) => { e.stopPropagation(); onSelect({
              name: '底板受力筋 (Z向)', spec: `Φ${foundD}@${foundSpacing}`,
              formula: `n = (L - 2c) / s + 1`, calcLabel: '当前排布根数', calcValue: `${countX} 根`,
              desc: '铺设在底层受力筋之上的交错网片。', color: 'bg-blue-500'
            })}}>
            <cylinderGeometry args={[rFound, rFound, fB - 2*c, 8]} />
            <meshStandardMaterial color="#3b82f6" />
          </mesh>
        ))}
      </group>

      {/* 🔴 柱插筋矩阵：带 22G101 算量卡片 */}
      <group>
        {colRebars.map(rebar => (
          <group key={rebar.id} onClick={(e) => { e.stopPropagation(); onSelect({
            name: '柱纵向插筋', spec: `HRB400 Φ${colD}`,
            formula: `lae = ζae × lab = ${zeta_ae} × ${lab_factor}d`,
            calcLabel: '抗震锚固长度 lae', calcValue: `${lae_val} mm`,
            desc: `22G101-1 规定：${concGrade}混凝土, ${seismicGrade}抗震。弯折取 max(6d, 150)=${bend_mm}mm。`, color: 'bg-red-600'
          })}}>
            <SmoothRebar points={rebar.pts} radius={rCol} color="#dc2626" />
          </group>
        ))}
      </group>
    </group>
  );
}

// === 主组件：包含全功能选项卡 ===
export default function FoundationViewer() {
  const [mounted, setMounted] = useState(false);
  const [selectedRebar, setSelectedRebar] = useState(null);
  const [config, setConfig] = useState({
    foundL: 2000, foundB: 2000, foundH: 600, foundD: 14, foundSpacing: 200,
    colB: 600, colH: 600, colD: 25, nx: 4, nz: 4,
    cover: 40, concGrade: 'C30', seismicGrade: '二级'
  });

  useEffect(() => { setMounted(true); }, []);

  return (
    <div className="flex flex-col lg:flex-row w-full h-screen bg-slate-50 relative overflow-hidden">
      {/* 左侧 3D 画布 */}
      <div className="flex-1 relative bg-[#f1f5f9]">
        {selectedRebar && (
          <div className="absolute top-6 right-6 z-50 w-72 bg-white/95 backdrop-blur rounded-2xl shadow-2xl border border-slate-200 p-5 animate-in slide-in-from-right fade-in">
             <div className="flex justify-between items-center mb-4">
                <h3 className="font-black text-slate-800 tracking-tight">{selectedRebar.name}</h3>
                <button onClick={() => setSelectedRebar(null)} className="text-slate-400 hover:text-slate-600">✕</button>
             </div>
             <div className="space-y-4">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-bold uppercase">Specification</span>
                  <span className="font-mono font-bold text-slate-900">{selectedRebar.spec}</span>
                </div>
                <div className="bg-slate-900 rounded-xl p-4 text-center shadow-lg">
                   <p className="text-[10px] text-slate-500 uppercase mb-1">22G101 Calculation</p>
                   <p className="text-3xl font-black text-white font-mono tracking-tighter">{selectedRebar.calcValue}</p>
                   <p className="text-[11px] text-blue-400 mt-2 font-mono italic">{selectedRebar.formula}</p>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed bg-slate-50 p-2 rounded-lg border-l-4 border-slate-300">{selectedRebar.desc}</p>
             </div>
          </div>
        )}
        <div className="w-full h-full">
          {mounted && (
            <Canvas camera={{ position: [3, 2, 4], fov: 35 }}>
              <ambientLight intensity={0.7} /><pointLight position={[10, 10, 10]} intensity={1.5} />
              <FoundationScene config={config} onSelect={setSelectedRebar} />
              <Grid args={[12, 12]} position={[0, -0.01, 0]} cellColor="#cbd5e1" sectionColor="#94a3b8" fadeDistance={20} />
              <OrbitControls makeDefault />
            </Canvas>
          )}
        </div>
      </div>

      {/* 右侧：全功能选项卡控制台 */}
      <div className="w-full lg:w-96 bg-white p-8 shadow-2xl border-l overflow-y-auto">
        <h2 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-3 italic">
          <span className="bg-indigo-600 text-white p-2 rounded-xl not-italic shadow-lg shadow-indigo-100">DJ</span>
          22G101 算量实验室
        </h2>

        <div className="space-y-8">
          {/* 材料强度选项卡 */}
          <section className="space-y-4">
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded inline-block">1. 材料与环境</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 ml-1">混凝土等级</label>
                <select value={config.concGrade} onChange={e => setConfig({...config, concGrade: e.target.value})} className="w-full p-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none">
                  {Object.keys(LAB_MAP).map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 ml-1">抗震等级</label>
                <select value={config.seismicGrade} onChange={e => setConfig({...config, seismicGrade: e.target.value})} className="w-full p-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none">
                  {Object.keys(ZETA_AE_MAP).map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* 柱纵筋排布选项卡 */}
          <section className="space-y-4 pt-4 border-t border-slate-100">
            <p className="text-[10px] font-black text-red-600 uppercase tracking-widest bg-red-50 px-2 py-1 rounded inline-block">2. 柱筋排布矩阵</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 ml-1">X 向根数 (nx)</label>
                <div className="flex items-center gap-2">
                   <input type="range" min="2" max="10" step="1" value={config.nx} onChange={e => setConfig({...config, nx: parseInt(e.target.value)})} className="flex-1 accent-red-600" />
                   <span className="font-mono font-bold text-red-600 w-6 text-sm">{config.nx}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 ml-1">Z 向根数 (nz)</label>
                <div className="flex items-center gap-2">
                   <input type="range" min="2" max="10" step="1" value={config.nz} onChange={e => setConfig({...config, nz: parseInt(e.target.value)})} className="flex-1 accent-red-600" />
                   <span className="font-mono font-bold text-red-600 w-6 text-sm">{config.nz}</span>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 ml-1">柱纵筋直径 D (mm)</label>
                <input type="number" value={config.colD} onChange={e => setConfig({...config, colD: Number(e.target.value)})} className="w-full p-2.5 bg-slate-50 border-none rounded-xl text-sm font-mono font-bold" />
            </div>
          </section>

          {/* 基础配筋选项卡 */}
          <section className="space-y-4 pt-4 border-t border-slate-100">
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-1 rounded inline-block">3. 基础底板配筋</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 ml-1">底筋直径 d</label>
                <input type="number" value={config.foundD} onChange={e => setConfig({...config, foundD: Number(e.target.value)})} className="w-full p-2.5 bg-slate-50 border-none rounded-xl text-sm font-mono font-bold" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 ml-1">底筋间距 S</label>
                <input type="number" value={config.foundSpacing} onChange={e => setConfig({...config, foundSpacing: Number(e.target.value)})} className="w-full p-2.5 bg-slate-50 border-none rounded-xl text-sm font-mono font-bold" />
              </div>
            </div>
          </section>
        </div>

        <div className="mt-12 p-5 bg-slate-900 rounded-3xl text-white shadow-2xl shadow-slate-300">
           <div className="flex items-center gap-2 mb-3">
             <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
             <p className="text-[10px] font-black uppercase tracking-tighter text-slate-400">Live Calculation Engine</p>
           </div>
           <div className="space-y-2">
             <div className="flex justify-between text-xs font-mono"><span className="text-slate-500">锚固环境:</span><span>{config.concGrade}/{config.seismicGrade}</span></div>
             <div className="flex justify-between text-xs font-mono"><span className="text-slate-500">计算 lae:</span><span className="text-yellow-400 font-bold">{lae_val} mm</span></div>
           </div>
        </div>
      </div>
    </div>
  );
}
