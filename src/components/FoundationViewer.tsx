/* eslint-disable */
// @ts-nocheck
'use client';

import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';

// 🚀 22G101 计算表
const LAB_TABLE = { 'C25': 40, 'C30': 35, 'C35': 31, 'C40': 29, 'C45': 26, 'C50': 24 };

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
  const { foundL, foundB, foundH, cover, colB, colH, colD, foundD, foundSpacing, concGrade, seismicGrade } = config;
  
  // 计算 lae
  const lab_factor = LAB_TABLE[concGrade] || 35;
  const zeta_ae = (seismicGrade === '一级' || seismicGrade === '二级') ? 1.15 : (seismicGrade === '三级' ? 1.05 : 1.0);
  const lae_val = Math.ceil(lab_factor * zeta_ae * colD);
  const bend_mm = Math.max(6 * colD, 150);

  const fL = foundL * scale; const fB = foundB * scale; const fH = foundH * scale; const c = cover * scale;
  const cB = colB * scale; const cH = colH * scale; const cD = colD * scale; const rCol = cD / 2;
  const fD = foundD * scale; const rFound = fD / 2;
  const bottomY = -fH + c + fD + rFound + rCol;

  const countZ = Math.max(2, Math.floor((foundB - 2 * cover) / foundSpacing) + 1);
  const foundRebarsX = Array.from({ length: countZ }, (_, i) => -fB/2 + c + i * ((foundB - 2 * cover) / (countZ - 1)));
  
  const colRebarPos = [
    { x: -cB/2 + c, z: -cH/2 + c, dx: -1, dz: -1 }, { x: cB/2 - c, z: -cH/2 + c, dx: 1, dz: -1 },
    { x: -cB/2 + c, z: cH/2 - c, dx: -1, dz: 1 }, { x: cB/2 - c, z: cH/2 - c, dx: 1, dz: 1 },
    { x: 0, z: -cH/2 + c, dx: 0, dz: -1 }, { x: 0, z: cH/2 - c, dx: 0, dz: 1 },
    { x: -cB/2 + c, z: 0, dx: -1, dz: 0 }, { x: cB/2 - c, z: 0, dx: 1, dz: 0 },
  ];

  return (
    <group position={[0, fH/2, 0]}>
      <mesh position={[0, -fH/2, 0]}><boxGeometry args={[fL, fH, fB]} /><meshStandardMaterial color="#38bdf8" transparent opacity={0.15} depthWrite={false} /></mesh>
      <mesh position={[0, 0.6, 0]}><boxGeometry args={[cB, 1.2, cH]} /><meshStandardMaterial color="#94a3b8" transparent opacity={0.2} depthWrite={false} /></mesh>
      {foundRebarsX.map((z, i) => (
        <mesh key={`fx-${i}`} position={[0, -fH + c + rFound, z]} rotation={[0, 0, Math.PI/2]}>
          <cylinderGeometry args={[rFound, rFound, fL - 2*c, 8]} /><meshStandardMaterial color="#2563eb" />
        </mesh>
      ))}
      {colRebarPos.map((pos, i) => {
        const pts = []; pts.push(new THREE.Vector3(pos.x, 1.2, pos.z));
        const arcS = 10; const bR = cD*2.5*scale; const cx = pos.x + bR * pos.dx; const cy = bottomY + bR; const cz = pos.z + bR * pos.dz;
        for (let j = 0; j <= arcS; j++) {
          const t = (j / arcS) * (Math.PI / 2);
          pts.push(new THREE.Vector3(cx - bR * pos.dx * Math.cos(t), cy - bR * Math.sin(t), cz - bR * pos.dz * Math.cos(t)));
        }
        pts.push(new THREE.Vector3(pos.x + bend_mm*scale * pos.dx, bottomY, pos.z + bend_mm*scale * pos.dz));
        return (
          <group key={`c-${i}`} onClick={() => onSelect({ name: '柱纵向插筋', spec: `Φ${colD}`, formula: `${zeta_ae}×${lab_factor}d`, calcLabel: 'lae', calcValue: `${lae_val}mm`, color: 'bg-red-600' })}>
            <TubePath points={pts} radius={rCol} color="#dc2626" />
          </group>
        );
      })}
    </group>
  );
}

export default function FoundationViewer() {
  const [mounted, setMounted] = useState(false);
  const [selectedRebar, setSelectedRebar] = useState(null);
  const [config, setConfig] = useState({ foundL: 2000, foundB: 2000, foundH: 600, foundD: 14, foundSpacing: 200, colB: 500, colH: 500, colD: 25, cover: 40, concGrade: 'C30', seismicGrade: '二级' });
  useEffect(() => { setMounted(true); }, []);
  return (
    <div className="flex flex-col lg:flex-row w-full h-screen bg-slate-50 relative overflow-hidden">
      <div className="flex-1 relative bg-slate-100">
        {selectedRebar && (
          <div className="absolute top-4 right-4 z-50 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className={`${selectedRebar.color} px-4 py-2 text-white flex justify-between`}><b>{selectedRebar.name}</b><button onClick={() => setSelectedRebar(null)}>✕</button></div>
            <div className="p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span>规格</span><b>{selectedRebar.spec}</b></div>
              <div className="bg-slate-50 p-2 rounded border text-center font-mono">
                <div className="text-[10px] text-slate-400 underline decoration-dotted">22G101 算式</div>
                <div className="text-blue-700">{selectedRebar.formula}</div>
                <div className="mt-2 pt-2 border-t flex justify-between"><span>{selectedRebar.calcLabel}</span><b className="text-red-600">{selectedRebar.calcValue}</b></div>
              </div>
            </div>
          </div>
        )}
        {mounted && <Canvas camera={{ position: [3, 2, 4] }}><ambientLight intensity={0.8} /><directionalLight position={[5, 5, 5]} /><FoundationScene config={config} onSelect={setSelectedRebar} /><Grid args={[10, 10]} cellColor="#cbd5e1" /><OrbitControls /></Canvas>}
      </div>
      <div className="w-80 bg-white p-6 shadow-inner overflow-y-auto">
        <h3 className="font-bold border-b pb-2 mb-4">📐 算量实验室</h3>
        <div className="space-y-4">
          <div className="flex flex-col gap-1"><label className="text-xs text-slate-500">混凝土等级</label><select value={config.concGrade} onChange={e => setConfig({...config, concGrade: e.target.value})} className="p-2 border rounded bg-slate-50 text-sm">{['C25','C30','C35','C40'].map(g => <option key={g} value={g}>{g}</option>)}</select></div>
          <div className="flex flex-col gap-1"><label className="text-xs text-slate-500">抗震等级</label><select value={config.seismicGrade} onChange={e => setConfig({...config, seismicGrade: e.target.value})} className="p-2 border rounded bg-slate-50 text-sm">{['一级','二级','三级','四级'].map(g => <option key={g} value={g}>{g}</option>)}</select></div>
          <div className="flex flex-col gap-1"><label className="text-xs text-slate-500">纵筋直径 Φ</label><input type="number" value={config.colD} onChange={e => setConfig({...config, colD: Number(e.target.value)})} className="p-2 border rounded text-sm" /></div>
          <div className="flex flex-col gap-1"><label className="text-xs text-slate-500">基础高度 H</label><input type="number" value={config.foundH} onChange={e => setConfig({...config, foundH: Number(e.target.value)})} className="p-2 border rounded text-sm" /></div>
        </div>
      </div>
    </div>
  );
}
