/* eslint-disable */
// @ts-nocheck
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';

// 🚀 CNC 平滑弯折引擎：利用样条曲线生成高精度圆弧
function SmoothRebar({ points, radius, color }) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.2), [points]);
  return (
    <mesh>
      <tubeGeometry args={[curve, 64, radius, 12, false]} />
      <meshStandardMaterial color={color} roughness={0.3} metalness={0.7} />
    </mesh>
  );
}

function FoundationScene({ config, onSelect }) {
  const scale = 0.001;
  const { foundL, foundB, foundH, cover, colB, colH, colD, foundD, foundSpacing, hasTopRebar, topD, topSpacing, concGrade, seismicGrade } = config;

  const fL = foundL * scale; const fB = foundB * scale; const fH = foundH * scale; const c = cover * scale;
  const cB = colB * scale; const cH = colH * scale; const cD = colD * scale; const rCol = cD / 2;
  const fD = foundD * scale; const rFound = fD / 2; const fS = foundSpacing * scale;
  const tD = topD * scale; const rTop = tD / 2; const tS = topSpacing * scale;

  // 标高计算
  const meshBottomY = -fH + c + rFound;
  const meshTopY = -fH + c + fD + rFound;
  const topMeshY = -rTop - c;
  const bottomY = meshTopY + rFound;

  // 1. 底筋网格生成逻辑
  const countZ = Math.max(2, Math.floor((foundB - 2 * cover) / foundSpacing) + 1);
  const foundRebarsX = Array.from({ length: countZ }, (_, i) => -fB/2 + c + i * ((foundB - 2 * cover) / (countZ - 1)));
  const countX = Math.max(2, Math.floor((foundL - 2 * cover) / foundSpacing) + 1);
  const foundRebarsZ = Array.from({ length: countX }, (_, i) => -fL/2 + c + i * ((foundL - 2 * cover) / (countX - 1)));

  // 2. 柱纵筋位置与平滑弯折逻辑
  const bend_mm = Math.max(6 * colD, 150);
  const bendL = bend_mm * scale;
  const bendR = colD * 2.5 * scale; // 弯曲半径

  const colRebarPos = [
    { x: -cB/2 + c, z: -cH/2 + c, dx: -1, dz: -1 }, { x: cB/2 - c, z: -cH/2 + c, dx: 1, dz: -1 },
    { x: -cB/2 + c, z: cH/2 - c, dx: -1, dz: 1 }, { x: cB/2 - c, z: cH/2 - c, dx: 1, dz: 1 },
    { x: 0, z: -cH/2 + c, dx: 0, dz: -1 }, { x: 0, z: cH/2 - c, dx: 0, dz: 1 },
    { x: -cB/2 + c, z: 0, dx: -1, dz: 0 }, { x: cB/2 - c, z: 0, dx: 1, dz: 0 },
  ];

  return (
    <group position={[0, fH/2, 0]}>
      {/* 基础混凝土外观 */}
      <mesh position={[0, -fH/2, 0]}>
        <boxGeometry args={[fL, fH, fB]} />
        <meshStandardMaterial color="#38bdf8" transparent opacity={0.12} depthWrite={false} />
      </mesh>

      {/* 柱混凝土外观 */}
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[cB, 1.2, cH]} />
        <meshStandardMaterial color="#94a3b8" transparent opacity={0.15} depthWrite={false} />
      </mesh>

      {/* 🔵 底板双向钢筋网 */}
      <group>
        {foundRebarsX.map((z, i) => (
          <mesh key={`fx-${i}`} position={[0, meshBottomY, z]} rotation={[0, 0, Math.PI/2]}>
            <cylinderGeometry args={[rFound, rFound, fL - 2*c, 8]} />
            <meshStandardMaterial color="#2563eb" metalness={0.6} roughness={0.4} />
          </mesh>
        ))}
        {foundRebarsZ.map((x, i) => (
          <mesh key={`fz-${i}`} position={[x, meshTopY, 0]} rotation={[Math.PI/2, 0, 0]}>
            <cylinderGeometry args={[rFound, rFound, fB - 2*c, 8]} />
            <meshStandardMaterial color="#3b82f6" metalness={0.6} roughness={0.4} />
          </mesh>
        ))}
      </group>

      {/* 🟣 顶部面筋网 (开关控制) */}
      {hasTopRebar && (
        <group>
          {Array.from({ length: Math.floor((foundB - 2 * cover) / topSpacing) + 1 }).map((_, i) => (
            <mesh key={`tx-${i}`} position={[0, topMeshY, -fB/2 + c + i * tS]} rotation={[0, 0, Math.PI/2]}>
              <cylinderGeometry args={[rTop, rTop, fL - 2*c, 8]} />
              <meshStandardMaterial color="#a855f7" />
            </mesh>
          ))}
        </group>
      )}

      {/* 🔴 柱纵筋：CNC 圆滑弯折系统 */}
      <group>
        {colRebarPos.map((pos, i) => {
          const pts = [
            new THREE.Vector3(pos.x, 1.2, pos.z), // 顶部起点
            new THREE.Vector3(pos.x, bottomY + bendR, pos.z), // 弯折过渡起点
            new THREE.Vector3(pos.x + bendR * 0.5 * pos.dx, bottomY + bendR * 0.2, pos.z + bendR * 0.5 * pos.dz), // 曲线中点
            new THREE.Vector3(pos.x + bendL * pos.dx, bottomY, pos.z + bendL * pos.dz), // 锚固终点
          ];
          return (
            <group key={`c-${i}`} onClick={() => onSelect({ 
              name: '柱纵向插筋', spec: `Φ${colD}`, 
              desc: `22G101 规定：弯折长度取 max(6d, 150mm)=${bend_mm}mm。`, color: 'bg-red-600'
            })}>
              <SmoothRebar points={pts} radius={rCol} color="#dc2626" />
            </group>
          );
        })}
      </group>
    </group>
  );
}

export default function FoundationViewer() {
  const [mounted, setMounted] = useState(false);
  const [selectedRebar, setSelectedRebar] = useState(null);
  const [config, setConfig] = useState({
    foundL: 2000, foundB: 2000, foundH: 600, foundD: 14, foundSpacing: 200,
    colB: 500, colH: 500, colD: 25, cover: 40,
    concGrade: 'C30', seismicGrade: '二级', hasTopRebar: false, topD: 12, topSpacing: 200
  });

  useEffect(() => { setMounted(true); }, []);

  return (
    <div className="flex flex-col lg:flex-row w-full h-screen bg-slate-50 relative overflow-hidden">
      <div className="flex-1 relative bg-[#f1f5f9]">
        <div className="absolute top-4 left-4 z-10 bg-white/80 backdrop-blur px-3 py-1 rounded-full text-[10px] font-bold text-slate-500 shadow-sm border border-slate-200">
          22G101-3 独立基础 3D 仿真实验室
        </div>
        
        {selectedRebar && (
          <div className="absolute top-4 right-4 z-50 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in slide-in-from-right duration-300">
            <div className={`${selectedRebar.color} px-4 py-2 text-white flex justify-between items-center`}>
              <span className="font-bold text-sm">{selectedRebar.name}</span>
              <button onClick={() => setSelectedRebar(null)} className="hover:bg-black/10 rounded-full w-5 h-5 flex items-center justify-center">✕</button>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-medium">规格参数</span>
                <span className="font-mono font-bold text-slate-800">{selectedRebar.spec}</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed border-t pt-2">{selectedRebar.desc}</p>
            </div>
          </div>
        )}

        <div className="w-full h-full">
          {mounted && (
            <Canvas camera={{ position: [3, 2, 4], fov: 40 }}>
              <ambientLight intensity={0.8} />
              <pointLight position={[10, 10, 10]} intensity={1} />
              <FoundationScene config={config} onSelect={setSelectedRebar} />
              <Grid args={[12, 12]} position={[0, -0.01, 0]} cellColor="#cbd5e1" sectionColor="#94a3b8" fadeDistance={20} />
              <OrbitControls makeDefault />
            </Canvas>
          )}
        </div>
      </div>

      <div className="w-full lg:w-85 bg-white p-6 shadow-2xl border-l border-slate-200 overflow-y-auto">
        <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2 text-lg italic">
          <span className="bg-blue-600 text-white p-1 rounded italic">3D</span> 参数化控制台
        </h3>
        
        <div className="space-y-6">
          <div className="space-y-4">
            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest bg-blue-50 px-2 py-1 rounded inline-block">基础底板构造</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 font-bold ml-1">基础 L×B (mm)</label>
                <div className="flex gap-1">
                  <input type="number" value={config.foundL} onChange={e => setConfig({...config, foundL: Number(e.target.value)})} className="w-full p-2 border rounded-lg text-xs font-mono bg-slate-50 focus:ring-2 focus:ring-blue-400 outline-none" />
                  <input type="number" value={config.foundB} onChange={e => setConfig({...config, foundB: Number(e.target.value)})} className="w-full p-2 border rounded-lg text-xs font-mono bg-slate-50 focus:ring-2 focus:ring-blue-400 outline-none" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 font-bold ml-1">基础高度 h</label>
                <input type="number" value={config.foundH} onChange={e => setConfig({...config, foundH: Number(e.target.value)})} className="w-full p-2 border rounded-lg text-xs font-mono bg-slate-50 focus:ring-2 focus:ring-blue-400 outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
               <div className="space-y-1">
                <label className="text-[11px] text-slate-500 font-bold ml-1">底筋 Φ / 间距</label>
                <div className="flex gap-1">
                  <input type="number" value={config.foundD} onChange={e => setConfig({...config, foundD: Number(e.target.value)})} className="w-full p-2 border rounded-lg text-xs font-mono bg-slate-50" />
                  <input type="number" value={config.foundSpacing} onChange={e => setConfig({...config, foundSpacing: Number(e.target.value)})} className="w-full p-2 border rounded-lg text-xs font-mono bg-slate-50" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 font-bold ml-1">保护层厚度</label>
                <input type="number" value={config.cover} onChange={e => setConfig({...config, cover: Number(e.target.value)})} className="w-full p-2 border rounded-lg text-xs font-mono bg-slate-50" />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest bg-purple-50 px-2 py-1 rounded inline-block">顶部面筋配置</p>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={config.hasTopRebar} onChange={e => setConfig({...config, hasTopRebar: e.target.checked})} />
                <div className="w-7 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>
            {config.hasTopRebar && (
              <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-300">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-500 font-bold ml-1">面筋 Φ</label>
                  <input type="number" value={config.topD} onChange={e => setConfig({...config, topD: Number(e.target.value)})} className="w-full p-2 border border-purple-100 rounded-lg text-xs font-mono bg-purple-50/30" />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-500 font-bold ml-1">面筋间距</label>
                  <input type="number" value={config.topSpacing} onChange={e => setConfig({...config, topSpacing: Number(e.target.value)})} className="w-full p-2 border border-purple-100 rounded-lg text-xs font-mono bg-purple-50/30" />
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t space-y-4">
            <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest bg-red-50 px-2 py-1 rounded inline-block">柱插筋构造</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 font-bold ml-1">柱截面 b×h</label>
                <div className="flex gap-1">
                  <input type="number" value={config.colB} onChange={e => setConfig({...config, colB: Number(e.target.value)})} className="w-full p-2 border rounded-lg text-xs font-mono bg-slate-50" />
                  <input type="number" value={config.colH} onChange={e => setConfig({...config, colH: Number(e.target.value)})} className="w-full p-2 border rounded-lg text-xs font-mono bg-slate-50" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 font-bold ml-1">柱纵筋 Φ</label>
                <input type="number" value={config.colD} onChange={e => setConfig({...config, colD: Number(e.target.value)})} className="w-full p-2 border border-red-100 rounded-lg text-sm font-mono bg-red-50/20 text-red-600 font-bold" />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 p-4 bg-slate-900 rounded-xl text-white">
           <div className="flex items-center gap-2 mb-2">
             <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
             <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">22G101 构造审查</p>
           </div>
           <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">弯折长度需求</span>
                <span className="font-mono text-yellow-400">{Math.max(6 * config.colD, 150)} mm</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">锚固环境系数</span>
                <span className="font-mono text-blue-300">{config.concGrade} / {config.seismicGrade}</span>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
