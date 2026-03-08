// @ts-nocheck
/* eslint-disable */
'use client';

import { useMemo, useState, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import type { JointParams, RebarMeshInfo } from '@/lib/types';
import { parseRebar, parseStirrup, gradeLabel } from '@/lib/rebar';
import { calcLaE, calcBendLength } from '@/lib/anchor';
import { S } from '@/lib/constants';

/* ---- Clickable mesh wrapper ---- */
function Clickable({ info, selected, onSelect, children, ...props }: {
  info: RebarMeshInfo; selected: boolean;
  onSelect: (info: RebarMeshInfo | null) => void;
  children: React.ReactNode;
  [key: string]: unknown;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <group
      {...props}
      onClick={(e) => { e.stopPropagation(); onSelect(selected ? null : info); }}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
    >
      {children}
    </group>
  );
}

/* ---- Tube along a path (for bent bars) ---- */
function TubePath({ points, radius, color }: { points: THREE.Vector3[]; radius: number; color: string }) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.01), [points]);
  return (
    <mesh>
      <tubeGeometry args={[curve, 32, radius, 8, false]} />
      <meshStandardMaterial color={color} roughness={0.4} metalness={0.6} />
    </mesh>
  );
}

/* ---- Stirrup ring (horizontal) ---- */
function HStirrupRing({ y, width, depth, radius, color }: {
  y: number; width: number; depth: number; radius: number; color: string;
}) {
  const curve = useMemo(() => {
    const w2 = width / 2, d2 = depth / 2, r = 0.012;
    const shape = new THREE.Shape();
    shape.moveTo(-w2 + r, -d2);
    shape.lineTo(w2 - r, -d2);
    shape.quadraticCurveTo(w2, -d2, w2, -d2 + r);
    shape.lineTo(w2, d2 - r);
    shape.quadraticCurveTo(w2, d2, w2 - r, d2);
    shape.lineTo(-w2 + r, d2);
    shape.quadraticCurveTo(-w2, d2, -w2, d2 - r);
    shape.lineTo(-w2, -d2 + r);
    shape.quadraticCurveTo(-w2, -d2, -w2 + r, -d2);
    const pts = shape.getPoints(40);
    return new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p.x, 0, p.y)), true);
  }, [width, depth]);

  return (
    <mesh position={[0, y, 0]}>
      <tubeGeometry args={[curve, 48, radius, 8, true]} />
      <meshStandardMaterial color={color} roughness={0.4} metalness={0.6} />
    </mesh>
  );
}

/* ---- Vertical stirrup ring (for beam) ---- */
function VStirrupRing({ x, width, height, yCenter, radius, color }: {
  x: number; width: number; height: number; yCenter: number; radius: number; color: string;
}) {
  const curve = useMemo(() => {
    const w2 = width / 2, h2 = height / 2, r = 0.012;
    const shape = new THREE.Shape();
    shape.moveTo(-w2 + r, -h2);
    shape.lineTo(w2 - r, -h2);
    shape.quadraticCurveTo(w2, -h2, w2, -h2 + r);
    shape.lineTo(w2, h2 - r);
    shape.quadraticCurveTo(w2, h2, w2 - r, h2);
    shape.lineTo(-w2 + r, h2);
    shape.quadraticCurveTo(-w2, h2, -w2, h2 - r);
    shape.lineTo(-w2, -h2 + r);
    shape.quadraticCurveTo(-w2, -h2, -w2 + r, -h2);
    const pts = shape.getPoints(40);
    return new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(0, p.y, p.x)), true);
  }, [width, height]);

  return (
    <mesh position={[x, yCenter, 0]}>
      <tubeGeometry args={[curve, 48, radius, 8, true]} />
      <meshStandardMaterial color={color} roughness={0.4} metalness={0.6} />
    </mesh>
  );
}

/* ---- Main Joint Scene ---- */
function CameraController({ targetPosition }: { targetPosition: [number, number, number] | null }) {
  const { camera } = useThree();
  useEffect(() => {
    if (targetPosition) { camera.position.set(...targetPosition); camera.updateProjectionMatrix(); }
  }, [targetPosition, camera]);
  return null;
}

function JointScene({ params, selected, onSelect, concreteOpacity }: {
  params: JointParams; selected: RebarMeshInfo | null;
  onSelect: (info: RebarMeshInfo | null) => void; concreteOpacity: number;
}) {
  const cB = params.colB * S;
  const cH = params.colH * S;
  const bB = params.beamB * S;
  const bH = params.beamH * S;
  const COVER = (params.cover || 25) * S;

  const colR = parseRebar(params.colMain);
  const colStir = parseStirrup(params.colStirrup);
  const beamTopR = parseRebar(params.beamTop);
  const beamBotR = parseRebar(params.beamBottom);
  const beamStir = parseStirrup(params.beamStirrup);

  const colHeight = 3.0;
  const beamLen = 1.8; 
  const jointBottom = (colHeight - bH) / 2; 
  const jointTop = jointBottom + bH;
  const beamCenterY = colHeight / 2;

  const isMiddle = params.jointType === 'middle';
  const isSide = params.jointType === 'side';

  const laEMm = calcLaE(beamTopR.grade, beamTopR.diameter, params.concreteGrade, params.seismicGrade);
  const laE = laEMm * S;
  const bendLenMm = calcBendLength(beamTopR.diameter);
  const bendLen = bendLenMm * S;

  // ---- Column rebars (vertical, full height) ----
  const colInnerW = cB - 2 * COVER;
  const colInnerH = cH - 2 * COVER;
  const colRebarPos = useMemo(() => {
    const perSide = Math.max(Math.round(colR.count / 4), 2);
    const pts: { x: number; z: number }[] = [];
    for (let i = 0; i < perSide; i++) pts.push({ x: -colInnerW / 2 + (colInnerW * i) / (perSide - 1), z: colInnerH / 2 });
    for (let i = 1; i < perSide; i++) pts.push({ x: colInnerW / 2, z: colInnerH / 2 - (colInnerH * i) / (perSide - 1) });
    for (let i = 1; i < perSide; i++) pts.push({ x: colInnerW / 2 - (colInnerW * i) / (perSide - 1), z: -colInnerH / 2 });
    for (let i = 1; i < perSide - 1; i++) pts.push({ x: -colInnerW / 2, z: -colInnerH / 2 + (colInnerH * i) / (perSide - 1) });
    return pts.slice(0, colR.count);
  }, [colR.count, colInnerW, colInnerH]);

  // ---- Column stirrups ----
  const colStirPositions = useMemo(() => {
    const positions: number[] = [];
    const denseS = colStir.spacingDense * S;
    const normalS = colStir.spacingNormal * S;
    const denseZone = 0.5;
    for (let y = 0.05; y < jointBottom - 0.02; y += (y < denseZone ? denseS : normalS)) positions.push(y);
    for (let y = jointBottom; y <= jointTop; y += denseS) positions.push(y);
    for (let y = jointTop + denseS; y < colHeight - 0.05; y += (y > colHeight - denseZone ? denseS : normalS)) positions.push(y);
    return positions;
  }, [colStir.spacingDense, colStir.spacingNormal, jointBottom, jointTop]);

  // ---- Beam rebar positions ----
  const beamInnerW = bB - 2 * COVER;
  const beamTopBars = useMemo(() => {
    const spacing = beamInnerW / Math.max(beamTopR.count - 1, 1);
    return Array.from({ length: beamTopR.count }, (_, i) => -beamInnerW / 2 + i * spacing);
  }, [beamTopR.count, beamInnerW]);

  const beamBotBars = useMemo(() => {
    const spacing = beamInnerW / Math.max(beamBotR.count - 1, 1);
    return Array.from({ length: beamBotR.count }, (_, i) => -beamInnerW / 2 + i * spacing);
  }, [beamBotR.count, beamInnerW]);

  // ---- Beam stirrup positions ----
  const beamStirPositions = useMemo(() => {
    const positions: number[] = [];
    const denseS = beamStir.spacingDense * S;
    const normalS = beamStir.spacingNormal * S;
    const denseZone = 0.5;
    const start = cB / 2 + 0.03;
    for (let x = start; x < start + beamLen; x += (x < start + denseZone ? denseS : normalS)) positions.push(x);
    if (isMiddle) {
      const lStart = -cB / 2 - 0.03;
      for (let x = lStart; x > lStart - beamLen; x -= (x > lStart - denseZone ? denseS : normalS)) positions.push(x);
    }
    return positions;
  }, [beamStir.spacingDense, beamStir.spacingNormal, cB, isMiddle]);

  // 🚀 听风专属：注入硬核图集参数化卡片数据
  const colMainInfo = { 
    type: 'colMain', 
    name: '柱纵向受力筋', 
    spec: `${colR.count}根 ${gradeLabel(colR.grade)} Φ${colR.diameter}`,
    formula: '核心区纵筋连续', calcLabel: '节点内要求', calcValue: '无断点不截断',
    desc: '柱纵筋作为主要竖向受力构件，在节点核心区内应连续贯穿，严禁在节点核心区内切断或搭接。', 
    uiColor: 'red', colorCls: 'bg-red-600'
  };
  
  const colStirInfo = { 
    type: 'colStirrup', 
    name: '节点核心区柱箍筋', 
    spec: `直径Φ${colStir.diameter} @${colStir.spacingDense}mm`,
    formula: '核心区全加密', calcLabel: '体积配箍率', calcValue: '≥ 规范限值',
    desc: '框架节点核心区承受极大的剪力，必须按照图集要求设置箍筋加密区，落实“强节点弱构件”抗震原则。', 
    uiColor: 'orange', colorCls: 'bg-orange-600'
  };
  
  const beamTopInfo = { 
    type: 'beamTop', 
    name: '梁端上部纵筋锚固', 
    spec: `${beamTopR.count}根 Φ${beamTopR.diameter}`,
    formula: params.anchorType === 'bent' ? '直锚段 ≥0.4laE + 下弯15d' : 'laE (直锚长度)', 
    calcLabel: params.anchorType === 'bent' ? '向下弯折长度' : '直锚入柱长度', 
    calcValue: params.anchorType === 'bent' ? `${bendLenMm} mm` : `${laEMm} mm`,
    desc: params.anchorType === 'bent' ? '因柱截面尺寸不足以满足直锚要求，必须伸至柱外侧钢筋内侧，向下弯折 15d 进行锚固。' : '柱截面尺寸足够大，满足直锚 laE 的要求，钢筋直接平直伸入节点。', 
    uiColor: 'pink', colorCls: 'bg-pink-600'
  };
  
  const beamBotInfo = { 
    type: 'beamBottom', 
    name: '梁端下部纵筋锚固', 
    spec: `${beamBotR.count}根 Φ${beamBotR.diameter}`,
    formula: params.anchorType === 'bent' ? '直锚段 ≥0.4laE + 弯折15d' : 'laE 或 0.5hc+5d', 
    calcLabel: params.anchorType === 'bent' ? '向上/下弯折' : '伸入支座长度', 
    calcValue: params.anchorType === 'bent' ? `${bendLenMm} mm` : `${laEMm} mm`,
    desc: params.anchorType === 'bent' ? '边节点处，下部受拉钢筋同样需要伸至柱端部并弯折，通常与上部纵筋构造类似。' : '满足锚固要求时平直伸入支座，须过柱中心线。', 
    uiColor: 'blue', colorCls: 'bg-blue-600'
  };
  
  const beamStirInfo = { 
    type: 'beamStirrup', 
    name: '梁端箍筋加密区', 
    spec: `直径Φ${beamStir.diameter} @${beamStir.spacingDense}mm`,
    formula: 'L = max(1.5hb, 500)', calcLabel: '距柱边首根距离', calcValue: '50 mm',
    desc: '梁端部易发生塑性铰，必须设置加密区。第一根箍筋距支座边缘（柱边） 50mm 处开始布置。', 
    uiColor: 'green', colorCls: 'bg-emerald-600'
  };

  const topY = beamCenterY + bH / 2 - COVER;
  const botY = beamCenterY - bH / 2 + COVER;

  return (
    <>
      <mesh onClick={() => onSelect(null)} visible={false}>
        <boxGeometry args={[8, 8, 8]} />
        <meshBasicMaterial />
      </mesh>

      {/* ===== COLUMN CONCRETE ===== */}
      <mesh position={[0, colHeight / 2, 0]}>
        <boxGeometry args={[cB, colHeight, cH]} />
        <meshPhysicalMaterial color="#BDC3C7" transparent opacity={concreteOpacity} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <lineSegments position={[0, colHeight / 2, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(cB, colHeight, cH)]} />
        <lineBasicMaterial color="#94A3B8" />
      </lineSegments>

      {/* ===== BEAM CONCRETE (right) ===== */}
      <mesh position={[cB / 2 + beamLen / 2, beamCenterY, 0]}>
        <boxGeometry args={[beamLen, bH, bB]} />
        <meshPhysicalMaterial color="#D5DBDB" transparent opacity={concreteOpacity * 0.8} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <lineSegments position={[cB / 2 + beamLen / 2, beamCenterY, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(beamLen, bH, bB)]} />
        <lineBasicMaterial color="#94A3B8" />
      </lineSegments>

      {/* ===== BEAM CONCRETE (left, if middle) ===== */}
      {isMiddle && (
        <>
          <mesh position={[-cB / 2 - beamLen / 2, beamCenterY, 0]}>
            <boxGeometry args={[beamLen, bH, bB]} />
            <meshPhysicalMaterial color="#D5DBDB" transparent opacity={concreteOpacity * 0.8} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
          <lineSegments position={[-cB / 2 - beamLen / 2, beamCenterY, 0]}>
            <edgesGeometry args={[new THREE.BoxGeometry(beamLen, bH, bB)]} />
            <lineBasicMaterial color="#94A3B8" />
          </lineSegments>
        </>
      )}

      {/* ===== COLUMN REBARS ===== */}
      <Clickable info={colMainInfo} selected={selected?.type === 'colMain'} onSelect={onSelect}>
        {colRebarPos.map((p, i) => (
          <mesh key={`cr${i}`} position={[p.x, colHeight / 2, p.z]}>
            <cylinderGeometry args={[colR.diameter * S / 2, colR.diameter * S / 2, colHeight, 12]} />
            <meshStandardMaterial color={selected?.type === 'colMain' ? '#E74C3C' : '#C0392B'} roughness={0.4} metalness={0.6}
              emissive={selected?.type === 'colMain' ? '#E74C3C' : '#000'} emissiveIntensity={selected?.type === 'colMain' ? 0.3 : 0} />
          </mesh>
        ))}
      </Clickable>

      {/* ===== COLUMN / JOINT STIRRUPS ===== */}
      <Clickable info={colStirInfo} selected={selected?.type === 'colStirrup'} onSelect={onSelect}>
        {colStirPositions.map((y, i) => {
          const inJoint = y >= jointBottom && y <= jointTop;
          const color = inJoint
            ? (selected?.type === 'colStirrup' ? '#F39C12' : '#E67E22')
            : (selected?.type === 'colStirrup' ? '#2ECC71' : '#27AE60');
          return (
            <HStirrupRing key={`cs${i}`} y={y}
              width={colInnerW + colStir.diameter * S}
              depth={colInnerH + colStir.diameter * S}
              radius={colStir.diameter * S / 2} color={color} />
          );
        })}
      </Clickable>

      {/* ===== BEAM TOP REBARS with anchor ===== */}
      <Clickable info={beamTopInfo} selected={selected?.type === 'beamTop'} onSelect={onSelect}>
        {beamTopBars.map((z, i) => {
          const color = selected?.type === 'beamTop' ? '#db2777' : '#9d174d';
          const r = beamTopR.diameter * S / 2;

          if (params.anchorType === 'bent') {
            const pts = [
              new THREE.Vector3(cB / 2 + beamLen, topY, z),
              new THREE.Vector3(cB / 2, topY, z),
              new THREE.Vector3(-cB / 2 + COVER + 0.01, topY, z),
              new THREE.Vector3(-cB / 2 + COVER, topY - 0.02, z),
              new THREE.Vector3(-cB / 2 + COVER, topY - bendLen, z),
            ];
            return (
              <group key={`bt${i}`}>
                <TubePath points={pts} radius={r} color={color} />
                {isMiddle && (
                  <TubePath points={[
                    new THREE.Vector3(-cB / 2 - beamLen, topY, z),
                    new THREE.Vector3(-cB / 2, topY, z),
                    new THREE.Vector3(cB / 2 - COVER - 0.01, topY, z),
                    new THREE.Vector3(cB / 2 - COVER, topY - 0.02, z),
                    new THREE.Vector3(cB / 2 - COVER, topY - bendLen, z),
                  ]} radius={r} color={color} />
                )}
              </group>
            );
          } else {
            const totalLen = beamLen + cH;
            return (
              <group key={`bt${i}`}>
                <mesh position={[(cB / 2 + beamLen - totalLen / 2) / 2 + totalLen / 4, topY, z]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[r, r, beamLen + cH * 0.8, 12]} />
                  <meshStandardMaterial color={color} roughness={0.4} metalness={0.6} />
                </mesh>
                {isMiddle && (
                  <mesh position={[-(cB / 2 + beamLen - totalLen / 2) / 2 - totalLen / 4, topY, z]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[r, r, beamLen + cH * 0.8, 12]} />
                    <meshStandardMaterial color={color} roughness={0.4} metalness={0.6} />
                  </mesh>
                )}
              </group>
            );
          }
        })}
      </Clickable>

      {/* ===== BEAM BOTTOM REBARS with anchor ===== */}
      <Clickable info={beamBotInfo} selected={selected?.type === 'beamBottom'} onSelect={onSelect}>
        {beamBotBars.map((z, i) => {
          const color = selected?.type === 'beamBottom' ? '#3b82f6' : '#1e3a8a';
          const r = beamBotR.diameter * S / 2;

          if (params.anchorType === 'bent') {
            const pts = [
              new THREE.Vector3(cB / 2 + beamLen, botY, z),
              new THREE.Vector3(cB / 2, botY, z),
              new THREE.Vector3(-cB / 2 + COVER + 0.01, botY, z),
              new THREE.Vector3(-cB / 2 + COVER, botY + 0.02, z),
              new THREE.Vector3(-cB / 2 + COVER, botY + bendLen, z),
            ];
            return (
              <group key={`bb${i}`}>
                <TubePath points={pts} radius={r} color={color} />
                {isMiddle && (
                  <TubePath points={[
                    new THREE.Vector3(-cB / 2 - beamLen, botY, z),
                    new THREE.Vector3(-cB / 2, botY, z),
                    new THREE.Vector3(cB / 2 - COVER - 0.01, botY, z),
                    new THREE.Vector3(cB / 2 - COVER, botY + 0.02, z),
                    new THREE.Vector3(cB / 2 - COVER, botY + bendLen, z),
                  ]} radius={r} color={color} />
                )}
              </group>
            );
          } else {
            return (
              <group key={`bb${i}`}>
                <mesh position={[(cB / 2 + beamLen) / 2 - cH * 0.1, botY, z]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[r, r, beamLen + cH * 0.8, 12]} />
                  <meshStandardMaterial color={color} roughness={0.4} metalness={0.6} />
                </mesh>
                {isMiddle && (
                  <mesh position={[-(cB / 2 + beamLen) / 2 + cH * 0.1, botY, z]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[r, r, beamLen + cH * 0.8, 12]} />
                    <meshStandardMaterial color={color} roughness={0.4} metalness={0.6} />
                  </mesh>
                )}
              </group>
            );
          }
        })}
      </Clickable>

      {/* ===== BEAM STIRRUPS ===== */}
      <Clickable info={beamStirInfo} selected={selected?.type === 'beamStirrup'} onSelect={onSelect}>
        {beamStirPositions.map((x, i) => (
          <VStirrupRing key={`bs${i}`} x={x}
            width={beamInnerW + beamStir.diameter * S}
            height={bH - 2 * COVER + beamStir.diameter * S}
            yCenter={beamCenterY}
            radius={beamStir.diameter * S / 2}
            color={selected?.type === 'beamStirrup' ? '#10b981' : '#065f46'} />
        ))}
      </Clickable>

      {/* ===== JOINT ZONE HIGHLIGHT ===== */}
      <mesh position={[0, beamCenterY, 0]}>
        <boxGeometry args={[cB + 0.005, bH + 0.005, cH + 0.005]} />
        <meshBasicMaterial color="#F39C12" transparent opacity={0.04} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </>
  );
}

/* 🚀 听风专属：史诗级硬核参数卡片（替换原简陋气泡） */
function EnhancedInfoCard({ info, onClose }: { info: any; onClose: () => void }) {
  const name = info.name || info.label;
  const spec = info.spec || info.detail?.split('·')[0] || '';
  const formula = info.formula || '';
  const calcLabel = info.calcLabel || '';
  const calcValue = info.calcValue || '';
  const desc = info.desc || info.detail;
  const colorCls = info.colorCls || 'bg-slate-700';
  const uiColor = info.uiColor || 'blue';

  const formulaBg = uiColor === 'pink' ? 'bg-pink-50 border-pink-200 text-pink-700' :
                    uiColor === 'red' ? 'bg-red-50 border-red-200 text-red-700' :
                    uiColor === 'orange' ? 'bg-orange-50 border-orange-200 text-orange-700' :
                    uiColor === 'green' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                    'bg-blue-50 border-blue-200 text-blue-700';

  const calcTextColor = uiColor === 'pink' ? 'text-pink-600' :
                        uiColor === 'red' ? 'text-red-600' :
                        uiColor === 'orange' ? 'text-orange-600' :
                        uiColor === 'green' ? 'text-emerald-600' :
                        'text-blue-600';

  return (
    <div className="absolute top-16 right-4 z-20 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in slide-in-from-right-4 fade-in duration-300">
      <div className={`${colorCls} px-4 py-3 flex justify-between items-center text-white`}>
        <h3 className="font-bold text-md flex items-center gap-2">
          <span>🔍</span> {name}
        </h3>
        <button onClick={onClose} className="hover:bg-black/20 rounded-full w-6 h-6 flex items-center justify-center transition-colors">
          ✕
        </button>
      </div>
      
      <div className="p-4 space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
          <span className="text-slate-500 text-sm">规格参数</span>
          <span className="font-mono font-bold text-slate-800">{spec}</span>
        </div>
        
        {formula && (
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-2">
            <div className="flex justify-between items-center">
               <span className="text-slate-500 text-xs font-bold">📚 22G101 构造公式</span>
            </div>
            <div className={`font-mono font-bold text-center p-2 rounded border ${formulaBg}`}>
              {formula}
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-200/60 mt-2">
              <span className="text-slate-500 text-sm">{calcLabel}</span>
              <span className={`font-mono font-bold text-lg ${calcTextColor}`}>
                {calcValue}
              </span>
            </div>
          </div>
        )}

        <div>
          <span className="text-slate-500 text-sm block mb-1">说明</span>
          <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-2 rounded">
            {desc}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---- Exported component ---- */
export default function JointViewer({ params }: { params: JointParams }) {
  const [selected, setSelected] = useState<RebarMeshInfo | null>(null);
  const [concreteOpacity, setConcreteOpacity] = useState(0.12);
  const [cameraTarget, setCameraTarget] = useState<[number, number, number] | null>(null);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted font-bold bg-slate-100 px-3 py-1.5 rounded-full">
          {params.jointType === 'middle' ? '中间节点（双侧梁）' : params.jointType === 'side' ? '边节点（单侧梁）' : '角节点'}
          {' · '}
          {params.anchorType === 'bent' ? '梁端弯锚构造' : '梁端直锚构造'}
        </span>
      </div>

      <div className="relative w-full h-[500px] lg:h-[600px] bg-surface rounded-xl border border-gray-200 overflow-hidden shadow-inner">
        
        {/* 🚀 挂载我们的终极专属弹窗 */}
        {selected && <EnhancedInfoCard info={selected} onClose={() => setSelected(null)} />}

        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
          {[
            { name: '正面', pos: [0, 1.5, 5] as [number, number, number] },
            { name: '侧面', pos: [5, 1.5, 0] as [number, number, number] },
            { name: '俯视', pos: [0, 6, 0.1] as [number, number, number] },
            { name: '透视', pos: [3, 2.5, 4] as [number, number, number] },
          ].map(a => (
            <button key={a.name} onClick={() => setCameraTarget(a.pos)}
              className="px-2 py-1 rounded-md text-[11px] font-medium cursor-pointer bg-white/80 backdrop-blur-sm border border-gray-200/60 text-muted hover:bg-white hover:text-blue-600 transition-colors shadow-sm">
              {a.name}
            </button>
          ))}
          <div className="flex items-center gap-1 ml-1 px-2 py-1 rounded-md bg-white/80 backdrop-blur-sm border border-gray-200/60 shadow-sm">
            <span className="text-[11px] text-muted">透明</span>
            <input type="range" min={0} max={0.4} step={0.02} value={concreteOpacity}
              onChange={e => setConcreteOpacity(parseFloat(e.target.value))} className="w-12 accent-accent" />
          </div>
        </div>

        <Canvas camera={{ position: [3, 2.5, 4], fov: 45 }} scene={{ background: new THREE.Color('#f8fafc') }}>
          <CameraController targetPosition={cameraTarget} />
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 8, 5]} intensity={0.8} castShadow />
          <JointScene params={params} selected={selected} onSelect={setSelected} concreteOpacity={concreteOpacity} />
          <Grid args={[10, 10]} position={[0, -0.01, 0]} cellColor="#E2E8F0" sectionColor="#E2E8F0" fadeDistance={15} />
          <axesHelper args={[1]} />
          <OrbitControls target={[0, 1.5, 0]} enableDamping dampingFactor={0.1} />
        </Canvas>
        
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-800/80 text-white text-[11px] px-4 py-1.5 rounded-full backdrop-blur-sm pointer-events-none shadow-lg">
          左键旋转 · 右键平移 · 滚轮缩放 · <span className="text-blue-300 font-bold">点击钢筋查看图集构造</span>
        </div>
      </div>
    </div>
  );
}
