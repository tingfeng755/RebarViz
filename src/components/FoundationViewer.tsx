/* eslint-disable */
// @ts-nocheck
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';

// 🚀 22G101-1 锚固长度基本值矩阵 (HRB400钢筋)
const LAB_MAP = { 'C25': 40, 'C30': 35, 'C35': 31, 'C40': 29, 'C45': 26, 'C50': 24 };
const ZETA_AE_MAP = { '一级': 1.15, '二级': 1.15, '三级': 1.05, '四级': 1.0, '非抗震': 1.0 };

// 🌟 样条曲线平滑钢筋组件
function SmoothRebar({ points, radius, color }) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5), [points]);
  return (
    <mesh>
      <tubeGeometry args={[curve, 64, radius, 12, false]} />
      <meshStandardMaterial color={color} roughness={0.3} metalness={0.8} />
    </mesh>
  );
}

// 🚧 独立基础 3D 仿真场景
function FoundationScene({ config, onSelect }) {
  const scale = 0.001;
  const { 
    foundL, foundB, foundH, cover, 
    colB, colH, colD, nx, nz,
    foundD, foundSpacing, hasTopRebar, topD, topSpacing,
    concGrade, seismicGrade 
  } = config;

  // --- 22G101 核心大脑 ---
  const lab_factor = LAB_MAP[concGrade] || 35;
  const zeta_ae = ZETA_AE_MAP[seismicGrade] || 1.0;
  const lae_val = Math.ceil(lab_factor * zeta_ae * colD); 
  const bend_mm = Math.max(6 * colD, 150);

  const fL = foundL * scale; const fB = foundB * scale; const fH = foundH * scale; const c = cover * scale;
  const cB = colB * scale; const cH = colH * scale; const cD = colD * scale; const rCol = cD / 2;
  const fD = foundD * scale; const rFound = fD / 2; const fS = foundSpacing * scale;
  const tD = topD * scale; const rTop = tD / 2; const tS = topSpacing * scale;

  // 标高基准
  const meshBottomY = -fH + c + rFound;
  const meshTopY = -fH + c + fD + rFound;
  const topMeshY = -c - rTop;
  const bottomY = meshTopY + rFound;
  const bendR = colD * 2.5 * scale;

  // 1. 底板双向网格生成
  const countZ = Math.max(2, Math.floor((foundB - 2 * cover) / foundSpacing) + 1);
  const foundRebarsX = Array.from({ length: countZ }, (_, i) => -fB/2 + c + i * ((foundB - 2 * cover) / (countZ - 1)));
  const countX = Math.max(2, Math.floor((foundL - 2 * cover) / foundSpacing) + 1);
  const foundRebarsZ = Array.from({ length: countX }, (_, i) => -fL/2 + c + i * ((foundL - 2 * cover) / (countX - 1)));

  // 2. 柱纵筋矩阵生成 (nx * nz)
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
      <mesh position={[0, -fH/2, 0]}><boxGeometry args={[fL, fH, fB]} /><meshStandardMaterial color="#38bdf8" transparent opacity={0.12} depthWrite={false} /></mesh>
      
      {/* 🔵 底板钢筋网 */}
      <group>
        {foundRebarsX.map((z, i) => (
          <mesh key={`fx-${i}`} position={[0, meshBottomY, z]} rotation={[0, 0, Math.PI/2]}
            onClick={(e) => { e.stopPropagation(); onSelect({ name: '底板底层筋', spec: `Φ${foundD}@${foundSpacing}`, formula: 'n = (B-2c)/s + 1', calcValue: `${countZ}根`, color: 'bg-blue-600' }); }}>
            <cylinderGeometry args={[rFound, rFound, fL - 2*c, 8]} /><meshStandardMaterial color="#2563eb" />
          </mesh>
        ))}
        {foundRebarsZ.map((x, i) => (
          <mesh key={`fz-${i}`} position={[x, meshTopY, 0]} rotation={[Math.PI/2, 0, 0]}
            onClick={(e) => { e.stopPropagation(); onSelect({ name: '底板上层筋', spec: `Φ${foundD}@${foundSpacing}`, formula: 'n = (L-2c)/s + 1', calcValue: `${countX}根`, color: 'bg-blue-500' }); }}>
            <cylinderGeometry args={[rFound, rFound, fB - 2*c, 8]} /><meshStandardMaterial color="#3b82f6" />
          </mesh>
        ))}
      </group>

      {/* 🟣 顶部面筋网 (开关控制) */}
      {hasTopRebar && (
        <group>
          {Array.from({ length: Math.floor((foundB - 2 * cover) / topSpacing) + 1 }).map((_, i) => (
            <mesh key={`tx-${i}`} position={[0, topMeshY, -fB/2 + c + i * tS]} rotation={[0, 0, Math.PI/2]}>
              <cylinderGeometry args={[rTop, rTop, fL - 2*c, 8]} /><meshStandardMaterial color="#a855f7" />
            </mesh>
          ))}
        </group>
      )}

      {/* 🔴 柱纵筋 */}
      <group>
        {colRebars.map(rb => (
          <group key={rb.id} onClick={(e) => { e.stopPropagation(); onSelect({
            name: '柱纵向插筋', spec: `Φ${colD}`, formula: `lae = ζae × lab = ${zeta_ae} × ${lab_factor}d`, calcValue: `${lae_val}mm`,
            desc: `22G101-1：${concGrade}混凝土, ${seismicGrade}抗震。弯折取 max(6d, 150)=${bend_mm}mm。`, color: 'bg-red-600'
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
    colB: 600, colH: 600, colD: 25, nx: 4, nz: 4,
    cover: 40, concGrade: 'C30', seismicGrade: '二级', hasTopRebar: false, topD: 12, topSpacing: 200
  });

  useEffect(() => { setMounted(true); }, []);

  return (
    <div className="flex flex-col lg:flex-row w-full h-screen bg-white overflow-hidden">
      <div className="flex-1 relative bg-slate-50">
        <div className="absolute top-6 left-6 z-10"><h1 className="text-xl font-black text-slate-800">独立基础 <span className="text-blue-600 italic">DJ</span> 3D 实验室</h1></div>
        
        {selected && (
          <div className="absolute top-6 right-6 z-50 w-72 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 p-5">
             <div className="flex justify-between items-center mb-4"><h3 className="font-black text-slate-800 tracking-tight">{selected.name}</h3><button onClick={() => setSelected(null)} className="text-slate-400">✕</button></div>
             <div className="space-y-4">
                <div className="bg-slate-900 rounded-xl p-4 text-center">
                   <p className="text-[10px] text-slate-500 uppercase mb-1 tracking-widest">22G101 Calculation</p>
                   <p className="text-3xl font-black text-white font-mono">{selected.calcValue}</p>
                   <p className="text-[11px] text-blue-400 mt-2 font-mono italic">{selected.formula}</p>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed italic border-l-2 border-red-500 pl-3">{selected.desc || '底板配筋按图集构造排布。'}</p>
             </div>
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
        <div className="flex items-center gap-3 mb-8"><div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200 text-lg">📐</div><h3 className="font-black text-slate-800 text-xl tracking-tight">实验室控制台</h3></div>

        <div className="space-y-8">
          <section className="space-y-4">
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded inline-block">1. 材料环境选项卡</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><label className="text-[11px] font-bold text-slate-400 ml-1">混凝土等级</label>
                <select value={config.concGrade} onChange={e => setConfig({...config, concGrade: e.target.value})} className="w-full p-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
                  {Object.keys(LAB_MAP).map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="space-y-1.5"><label className="text-[11px] font-bold text-slate-400 ml-1">抗震等级</label>
                <select value={config.seismicGrade} onChange={e => setConfig({...config, seismicGrade: e.target.value})} className="w-full p-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
                  {Object.keys(ZETA_AE_MAP).map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>
          </section>

          <section className="space-y-4 pt-4 border-t border-slate-100">
            <p className="text-[10px] font-black text-red-600 uppercase tracking-widest bg-red-50 px-2 py-1 rounded inline-block">2. 柱筋排布选项卡</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><label className="text-[11px] font-bold text-slate-400 ml-1">X 向根数</label>
                <input type="range" min="2" max="10" step="1" value={config.nx} onChange={e => setConfig({...config, nx: parseInt(e.target.value)})} className="w-full accent-red-600" />
                <div className="text-right font-mono font-bold text-red-600 text-xs">{config.nx} 根</div>
              </div>
              <div className="space-y-1.5"><label className="text-[11px] font-bold text-slate-400 ml-1">Z 向根数</label>
                <input type="range" min="2" max="10" step="1" value={config.nz} onChange={e => setConfig({...config, nz: parseInt(e.target.value)})} className="w-full accent-red-600" />
                <div className="text-right font-mono font-bold text-red-600 text-xs">{config.nz} 根</div>
              </div>
            </div>
          </section>

          <section className="space-y-4 pt-4 border-t border-slate-100">
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-1 rounded inline-block">3. 基础钢筋选项卡</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><label className="text-[11px] font-bold text-slate-400 ml-1">底筋间距 (mm)</label>
                <input type="number" value={config.foundSpacing} onChange={e => setConfig({...config, foundSpacing: Number(e.target.value)})} className="w-full p-2.5 bg-slate-50 border-none rounded-xl text-sm font-mono font-bold" />
              </div>
              <div className="space-y-1.5"><label className="text-[11px] font-bold text-slate-400 ml-1">底筋直径</label>
                <input type="number" value={config.foundD} onChange={e => setConfig({...config, foundD: Number(e.target.value)})} className="w-full p-2.5 bg-slate-50 border-none rounded-xl text-sm font-mono font-bold" />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <label className="text-[11px] font-bold text-purple-600 uppercase tracking-widest ml-1">开启顶部面筋网</label>
              <input type="checkbox" checked={config.hasTopRebar} onChange={e => setConfig({...config, hasTopRebar: e.target.checked})} className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500" />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
