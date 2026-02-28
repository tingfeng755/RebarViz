import type { ConcreteGrade, SeismicGrade } from './anchor';

export interface RebarInfo {
  count: number;
  grade: string;
  diameter: number;
  rows?: number; // 排数，如 6C25(2) 表示2排
  perRow?: number[]; // 每排根数，如 [4,2] 表示第一排4根第二排2根
}

export interface StirrupInfo {
  grade: string;
  diameter: number;
  spacingDense: number;
  spacingNormal: number;
  legs: number;
}

export type HaunchType = 'none' | 'horizontal' | 'vertical';

export interface BeamParams {
  id: string;
  b: number;
  h: number;
  top: string;
  bottom: string;
  stirrup: string;
  leftSupport?: string;
  rightSupport?: string;
  // 新增
  concreteGrade: ConcreteGrade;
  seismicGrade: SeismicGrade;
  cover: number;          // 保护层厚度 mm
  spanLength: number;     // 梁净跨 mm
  hc: number;             // 支座柱截面宽度 mm（沿梁方向）
  // 加腋
  haunchType: HaunchType;       // 加腋类型
  haunchLength: number;         // 加腋长度 c1 (mm)
  haunchHeight: number;         // 加腋高度 (mm)，水平加腋=梁高方向增加量，竖向加腋=梁宽方向增加量
  haunchSide: 'both' | 'left' | 'right'; // 加腋位置
  leftSupport2?: string;  // 第二排左支座负筋，如 2C25（伸入跨内 ln/4）
  rightSupport2?: string; // 第二排右支座负筋
  sideBar?: string; // 腰筋/抗扭筋，如 G4C12（构造腰筋）、N2C16（抗扭筋）
  tieBar?: string;  // 拉筋，如 A6（HPB300 Φ6），留空时按22G101自动确定
  spanCount?: number; // 跨数（多跨连续梁），默认1
}

export interface ColumnParams {
  id: string;
  b: number;
  h: number;
  main: string;
  stirrup: string;
  // 新增
  concreteGrade: ConcreteGrade;
  seismicGrade: SeismicGrade;
  cover: number;
  height: number;         // 柱净高 mm
}

export interface SlabParams {
  id: string;
  thickness: number;
  bottomX: string;
  bottomY: string;
  topX: string;
  topY: string;
  distribution: string;
  // 新增
  concreteGrade: ConcreteGrade;
  cover: number;
}

export interface JointParams {
  colB: number;
  colH: number;
  colMain: string;
  colStirrup: string;
  beamB: number;
  beamH: number;
  beamTop: string;
  beamBottom: string;
  beamStirrup: string;
  jointType: 'middle' | 'side' | 'corner';
  anchorType: 'straight' | 'bent';
  // 新增
  concreteGrade: ConcreteGrade;
  seismicGrade: SeismicGrade;
  cover: number;
}

export interface ShearWallParams {
  id: string;
  bw: number;       // 墙厚 mm (200-400)
  lw: number;       // 墙长 mm (1000-6000)
  hw: number;       // 墙净高 mm
  vertBar: string;  // 竖向分布筋 e.g. C10@200
  horizBar: string; // 水平分布筋 e.g. C10@200
  boundaryMain: string;   // 约束边缘构件纵筋 e.g. 8C16
  boundaryStirrup: string; // 约束边缘构件箍筋 e.g. A8@100
  concreteGrade: import('./anchor').ConcreteGrade;
  seismicGrade: import('./anchor').SeismicGrade;
  cover: number;
}

export type ComponentType = 'beam' | 'column' | 'slab' | 'joint' | 'shearwall';

export interface RebarMeshInfo {
  type: 'top' | 'bottom' | 'stirrup' | 'leftSupport' | 'rightSupport' | 'leftSupport2' | 'rightSupport2' | 'main'
    | 'bottomX' | 'bottomY' | 'topX' | 'topY' | 'distribution'
    | 'colMain' | 'colStirrup' | 'beamTop' | 'beamBottom' | 'beamStirrup' | 'jointStirrup' | 'anchor'
    | 'vertBar' | 'horizBar' | 'boundaryMain' | 'boundaryStirrup'
    | 'sideBar' | 'erection' | 'tieBar';
  label: string;
  detail: string;
}
