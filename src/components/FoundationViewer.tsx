/* eslint-disable */
// @ts-nocheck
'use client';

import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';

// 🚀 22G101-1 锚固长度查询表 (简化版：HRB400, 普通钢筋, 不考虑修正)
const LAB_TABLE = {
  'C25': 40, 'C30': 35, 'C35': 31, 'C40': 29, 'C45': 26, 'C50': 24
};

function TubePath({ points, radius, color }) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5);
  return (
    <mesh>
      <tubeGeometry args={[curve, 64, radius, 12, false]} />
      <meshStandardMaterial color={color} roughness={0.4} metalness={0.6} />
    </mesh>
  );
}

function FoundationScene({ config, onSelect }) {
  const scale = 0.001; 
  const { foundL, foundB, foundH, cover, colB, colH, colD, foundD, foundSpacing, hasTopRebar, topD, topSpacing, concGrade, seismicGrade } = config;

  const fL = foundL * scale; const fB = foundB * scale; const fH = foundH * scale; const c = cover * scale;
  const cB = colB * scale; const cH = colH * scale; const cD = colD * scale; const rCol = cD / 2;
  const fD = foundD * scale; const rFound = fD / 2; const fS = foundSpacing * scale;

  // --- 22G101 计算逻辑 ---
  const lab_factor = LAB_TABLE[concGrade] || 35;
  const zeta_ae = seismicGrade === '一级' || seismicGrade === '二级' ? 1.15 : (seismicGrade === '三级' ? 1.05 : 1.0);
  const lae_val = Math.ceil(lab_factor * zeta_ae * colD);
  const bend_mm = Math.max(6 * colD, 150);

  // 标高计算
  const meshBottomY = -fH + c + rFound;
  const meshTopY = -fH + c + fD + rFound;
  const bottomY = meshTopY + rFound;
  const topY = 1.2; 
  const bendL = bend_mm * scale;
  const bendR = colD * 2.5 * scale;

  // 渲染逻辑 (复用之前的平滑圆弧和网片)
  const countZ = Math.max(2, Math.floor((foundB - 2 * cover) / foundSpacing) + 1);
  const foundRebarsX = Array.from({ length: countZ }, (_, i) => -fB/2 + c + i * ((foundB - 2 * cover) / (countZ - 1)));
  const countX = Math.max(2, Math.floor((foundL - 2 * cover) / foundSpacing) + 1);
  const foundRebarsZ = Array.from({ length: countX }, (_, i) => -fL/2 + c + i * ((foundL - 2 * cover) / (countX - 1)));

  const colRebarPos = [
    { x: -cB/2 + c, z: -cH/2 + c, dirX: -1, dirZ: -1 }, { x: cB/2 - c, z: -cH/2 + c, dirX: 1, dirZ: -1 },
    { x: -cB/2 + c, z: cH/2 - c, dirX: -1, dirZ: 1 }, { x: cB/2 - c, z: cH/2 - c, dirX: 1, dirZ: 1 },
    { x: 0, z: -cH/2 + c, dirX: 0, dirZ: -1 }, { x: 0, z: cH/2 - c, dirX: 0, dirZ: 1 },
    { x: -cB/2 + c, z: 0, dirX: -1, dirZ: 0 }, { x: cB/2 - c, z: 0, dirX: 1, dirZ: 0 },
  ];

  return (
    <group position={[0, fH/2, 0]}>
      <mesh position={[0, -fH/2, 0]}><boxGeometry args={[fL, fH, fB]} /><meshStandardMaterial color="#38bdf8" transparent opacity={0.15} depthWrite={false} /></mesh>
      <mesh position={[0, topY/2, 0]}><boxGeometry args={[cB, topY, cH]} /><meshStandardMaterial color="#94a3b8" transparent opacity={0.2} depthWrite={false} /></mesh>

      {/* 蓝色底筋网 */}
      <group>
        {foundRebarsX.map((z, i) => (
          <mesh key={`fx-${i}`} position={[0, meshBottomY, z]} rotation={[0, 0, Math.PI/2]} 
            onClick={(e) => { e.stopPropagation(); onSelect({ name: '底板受力筋', spec: `Φ${foundD}@${foundSpacing}`, formula: '根数 = (B-2c)/s + 1', calcLabel: '排布根数', calcValue: `${countZ} 根`, color: 'bg-blue-600', uiColor: 'blue' }); }}>
            <cylinderGeometry args={[rFound, rFound, fL - 2*c, 8]} /><meshStandardMaterial color="#2563eb" />
          </mesh>
        ))}
      </group>

      {/* 🔴 柱插筋：带 22G101 动态卡片 */}
      <group>
        {colRebarPos.map((pos, i) => {
          const dx = pos.dirX; const dz = pos.dirZ;
          const pts = []; pts.push(new THREE.Vector3(pos.x, topY, pos.z));
          const arcSegments = 10; const cx = pos.x + bendR * dx; const cy = bottomY + bendR; const cz = pos.z + bendR * dz;
          for (let j = 0; j <= arcSegments; j++) {
            const t = (j / arcSegments) * (Math.PI / 2);
            pts.push(new THREE.Vector3(cx - bendR * dx * Math.cos(t), cy - bendR * Math.sin(t), cz - bendR * dz * Math.cos(t)));
          }
          pts.push(new THREE.Vector3(pos.x + bendL * dx, bottomY, pos.z + bendL * dz));
          return (
            <group key={`c-${i}`} onClick={(e) => { e.stopPropagation(); onSelect({ 
              name: '柱纵向插筋', spec: `HRB400 Φ${colD}`, 
              formula: `lae = ζae × lab = ${zeta_ae} × ${lab_factor}d`, 
              calcLabel: '抗震锚固长度 lae', calcValue: `${lae_val} mm`, 
              desc: `22G101-1 规范：${concGrade}混凝土, ${seismicGrade}抗震。弯折长度 max(6d, 150)=${bend_mm}mm。`, color: 'bg-red-600', uiColor: 'red' 
            }); }}>
              <TubePath points={pts} radius={rCol} color="#dc2626" />
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
    concGrade: 'C30', seismicGrade: '二级', hasTopRebar: false
  });

  useEffect(() => { setMounted(true); }, []);

  return (
    <div className="flex flex-col lg:flex-row w-full h-full min-h-screen bg-slate-50 relative">
      <div className="flex-1 relative border-r border-slate-200 min-h-[500px]">
        {selectedRebar && (
          <div className="absolute top-4 right-4 z-50 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in slide-in-from-right fade-in">
            <div className={`${selectedRebar.color} px-4 py-2 text-white flex justify-between items-center`}>
              <span className="font-bold">{selectedRebar.name}</span>
              <button onClick={() => setSelectedRebar(null)}>✕</button>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex justify-between text-sm"><span>规格</span><span className="font-mono font-bold">{selectedRebar.spec}</span></div>
              <div className="bg-slate-50 p-2 rounded text-center border">
                <div className="text-[10px] text-slate-400">22G101 公式</div>
                <div className="font-mono text-xs font-bold text-blue-700">{selectedRebar.formula}</div>
                <div className="mt-2 pt-2 border-t flex justify-between items-center">
                  <span className="text-[11px] text-slate-500">{selectedRebar.calcLabel}</span>
                  <span className="text-lg font-mono font-black text-red-600">{selectedRebar.calcValue}</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">{selectedRebar.desc}</p>
            </div>
          </div>
        )}
        <div className="w-full h-full">
          {mounted && (
            <Canvas camera={{ position: [3, 2, 4], fov: 45 }}>
              <ambientLight intensity={0.7} /><directionalLight position={[5, 10, 5]} intensity={1} />
              <FoundationScene config={config} onSelect={setSelectedRebar} />
              <Grid args={[10, 10]} position={[0, -0.01, 0]} cellColor="#cbd5e1" sectionColor="#94a3b8" />
              <OrbitControls target={[0, 0, 0]} />
            </Canvas>
          )}
        </div>
      </div>

      <div className="w-full lg:w-80 bg-white p-6 shadow-inner overflow-y-auto">
        <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2 border-b pb-2"><span>📐</span> 22G101 实验室控制台</h3>
        
        <div className="space-y-6">
          <section>
            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-3">材料与环境配置</p>
            <div className="grid grid-cols-1 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-slate-500 font-bold">混凝土等级</label>
                <select value={config.concGrade} onChange={e => setConfig({...config, concGrade: e.target.value})} className="p-2 border rounded-lg text-sm bg-slate-50">
                  {['C25','C30','C35','C40','C45','C50'].map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-slate-500 font-bold">抗震等级</label>
                <select value={config.seismicGrade} onChange={e => setConfig({...config, seismicGrade: e.target.value})} className="p-2 border rounded-lg text-sm bg-slate-50">
                  {['一级','二级','三级','四级'].map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>
          </section>

          <section className="pt-4 border-t">
            <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-3">柱与基础几何参数</p>
            <div className="space-y-4">
               <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1"><label className="text-[11px] text-slate-400">柱纵筋 Φ</label><input type="number" value={config.colD} onChange={e => setConfig({...config, colD: Number(e.target.value)})} className="p-1.5 border rounded text-sm font-mono" /></div>
                  <div className="flex flex-col gap-1"><label className="text-[11px] text-slate-400">基础高度 H</label><input type="number" value={config.foundH} onChange={e => setConfig({...config, foundH: Number(e.target.value)})} className="p-1.5 border rounded text-sm font-mono" /></div>
               </div>
               <div className="flex flex-col gap-1"><label className="text-[11px] text-slate-400">底板筋间距 S</label><input type="number" value={config.foundSpacing} onChange={e => setConfig({...config, foundSpacing: Number(e.target.value)})} className="p-1.5 border rounded text-sm font-mono" /></div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
