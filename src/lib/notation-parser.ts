/**
 * 平法标注本地快速解析
 * 在发送 AI 前先尝试本地正则解析，识别成功则直接映射为 params，跳过 AI 调用
 *
 * 支持格式:
 * 梁: KL1(3) 300×600 2C25 4C25 A8@100/200(2) [左支座] [右支座]
 * 柱: KZ1 500×500 12C25 A10@100/200(4)
 * 板: LB1 h=120 C10@150 C10@200
 * 剪力墙: Q1 bw=200 lw=3000 C10@200 C10@200 8C16
 */
import type { ComponentType, BeamParams, ColumnParams, SlabParams, JointParams, ShearWallParams } from './types';

type AnyParams = BeamParams | ColumnParams | SlabParams | JointParams | ShearWallParams;

export interface NotationParseResult {
  success: true;
  params: Partial<AnyParams>;
  description: string; // 中文描述识别结果
}

export interface NotationParseFail {
  success: false;
}

export type NotationResult = NotationParseResult | NotationParseFail;

// ─── 通用正则 ───

/** 截面尺寸: 300×600, 300x600, 300*600, 300乘600 */
const RE_SECTION = /(\d{2,4})\s*[×xX*×乘]\s*(\d{2,4})/;

/** 箍筋标注: A8@100/200(2), C10@100/200(4) */
const RE_STIRRUP = /([A-Ea-e])(\d{1,2})@(\d{2,3})(?:\/(\d{2,3}))?\((\d)\)/;

/** 梁编号: KL1, KL1(3), WKL2(5) */
const RE_BEAM_ID = /[A-Z]*KL\d+(?:\(\d+\))?/i;

/** 柱编号: KZ1, KZ2 */
const RE_COLUMN_ID = /KZ\d+/i;

/** 板编号: LB1, LB2 */
const RE_SLAB_ID = /LB\d+/i;

/** 剪力墙编号: Q1, Q2 */
const RE_WALL_ID = /Q\d+/i;

// ─── 辅助 ───

function extractAllRebars(text: string): Array<{ count: number; grade: string; diameter: number; raw: string }> {
  const results: Array<{ count: number; grade: string; diameter: number; raw: string }> = [];
  const re = /(\d{1,2})([A-Ea-e])(\d{1,2})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    // 排除箍筋中的匹配（如 A8@... 中的 A8 不是纵筋）
    const after = text.slice(m.index + m[0].length);
    if (after.startsWith('@')) continue; // 这是分布筋/箍筋，不是纵筋
    results.push({
      count: parseInt(m[1]),
      grade: m[2].toUpperCase(),
      diameter: parseInt(m[3]),
      raw: m[0],
    });
  }
  return results;
}

function extractStirrup(text: string): { grade: string; diameter: number; spacingDense: number; spacingNormal: number; legs: number; raw: string } | null {
  const m = text.match(RE_STIRRUP);
  if (!m) return null;
  return {
    grade: m[1].toUpperCase(),
    diameter: parseInt(m[2]),
    spacingDense: parseInt(m[3]),
    spacingNormal: m[4] ? parseInt(m[4]) : parseInt(m[3]),
    legs: parseInt(m[5]),
    raw: m[0],
  };
}

function extractDistributed(text: string): Array<{ grade: string; diameter: number; spacing: number; raw: string }> {
  const results: Array<{ grade: string; diameter: number; spacing: number; raw: string }> = [];
  const re = /([A-Ea-e])(\d{1,2})@(\d{2,3})(?!\s*[/(])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    // 排除箍筋（后面跟 / 和 (）
    const after = text.slice(m.index + m[0].length);
    if (after.match(/^\s*\/\s*\d+\s*\(/)) continue;
    results.push({
      grade: m[1].toUpperCase(),
      diameter: parseInt(m[2]),
      spacing: parseInt(m[3]),
      raw: m[0],
    });
  }
  return results;
}

function rebarNotation(count: number, grade: string, diameter: number): string {
  return `${count}${grade}${diameter}`;
}

function stirrupNotation(s: { grade: string; diameter: number; spacingDense: number; spacingNormal: number; legs: number }): string {
  return `${s.grade}${s.diameter}@${s.spacingDense}/${s.spacingNormal}(${s.legs})`;
}

function distributedNotation(d: { grade: string; diameter: number; spacing: number }): string {
  return `${d.grade}${d.diameter}@${d.spacing}`;
}

// ─── 梁标注解析 ───

function parseBeamNotation(text: string): NotationResult {
  // 检测是否含有梁标注特征
  const hasBeamId = RE_BEAM_ID.test(text);
  const hasSection = RE_SECTION.test(text);
  const hasStirrup = RE_STIRRUP.test(text);
  const rebars = extractAllRebars(text);

  // 至少要有截面尺寸 + 纵筋 或 梁编号
  if (!hasSection && rebars.length < 2 && !hasBeamId) return { success: false };
  if (!hasBeamId && !hasStirrup && rebars.length < 2) return { success: false };

  const params: Partial<BeamParams> = {};
  const desc: string[] = [];

  // 编号
  const idMatch = text.match(RE_BEAM_ID);
  if (idMatch) {
    params.id = idMatch[0].toUpperCase();
    desc.push(params.id);
  }

  // 截面
  const secMatch = text.match(RE_SECTION);
  if (secMatch) {
    params.b = parseInt(secMatch[1]);
    params.h = parseInt(secMatch[2]);
    desc.push(`截面${params.b}×${params.h}`);
  }

  // 箍筋（先提取，避免和纵筋混淆）
  const stirrup = extractStirrup(text);
  if (stirrup) {
    params.stirrup = stirrupNotation(stirrup);
    desc.push(`箍筋${params.stirrup}`);
  }

  // 纵筋：按顺序分配为 上部筋、下部筋、左支座、右支座
  if (rebars.length >= 1) {
    params.top = rebarNotation(rebars[0].count, rebars[0].grade, rebars[0].diameter);
    desc.push(`上部筋${params.top}`);
  }
  if (rebars.length >= 2) {
    params.bottom = rebarNotation(rebars[1].count, rebars[1].grade, rebars[1].diameter);
    desc.push(`下部筋${params.bottom}`);
  }

  // 检查是否有原位标注分隔符（;或分号后的为支座筋）
  const supportPart = text.match(/[;；]\s*(.*)/);
  if (supportPart) {
    const supportRebars = extractAllRebars(supportPart[1]);
    if (supportRebars.length >= 1) {
      params.leftSupport = rebarNotation(supportRebars[0].count, supportRebars[0].grade, supportRebars[0].diameter);
      desc.push(`左支座${params.leftSupport}`);
    }
    if (supportRebars.length >= 2) {
      params.rightSupport = rebarNotation(supportRebars[1].count, supportRebars[1].grade, supportRebars[1].diameter);
      desc.push(`右支座${params.rightSupport}`);
    }
  } else if (rebars.length >= 4) {
    // 4根纵筋时：上部、下部、左支座、右支座
    params.leftSupport = rebarNotation(rebars[2].count, rebars[2].grade, rebars[2].diameter);
    params.rightSupport = rebarNotation(rebars[3].count, rebars[3].grade, rebars[3].diameter);
    desc.push(`左支座${params.leftSupport}`);
    desc.push(`右支座${params.rightSupport}`);
  }

  if (Object.keys(params).length < 2) return { success: false };

  return {
    success: true,
    params,
    description: `已识别梁标注：${desc.join('，')}`,
  };
}

// ─── 柱标注解析 ───

function parseColumnNotation(text: string): NotationResult {
  const hasColumnId = RE_COLUMN_ID.test(text);
  const hasSection = RE_SECTION.test(text);
  const rebars = extractAllRebars(text);
  const stirrup = extractStirrup(text);

  if (!hasColumnId && !hasSection) return { success: false };
  if (rebars.length < 1 && !stirrup) return { success: false };

  const params: Partial<ColumnParams> = {};
  const desc: string[] = [];

  const idMatch = text.match(RE_COLUMN_ID);
  if (idMatch) {
    params.id = idMatch[0].toUpperCase();
    desc.push(params.id);
  }

  const secMatch = text.match(RE_SECTION);
  if (secMatch) {
    params.b = parseInt(secMatch[1]);
    params.h = parseInt(secMatch[2]);
    desc.push(`截面${params.b}×${params.h}`);
  }

  if (rebars.length >= 1) {
    params.main = rebarNotation(rebars[0].count, rebars[0].grade, rebars[0].diameter);
    desc.push(`纵筋${params.main}`);
  }

  if (stirrup) {
    params.stirrup = stirrupNotation(stirrup);
    desc.push(`箍筋${params.stirrup}`);
  }

  if (Object.keys(params).length < 2) return { success: false };

  return {
    success: true,
    params,
    description: `已识别柱标注：${desc.join('，')}`,
  };
}

// ─── 板标注解析 ───

function parseSlabNotation(text: string): NotationResult {
  const hasSlabId = RE_SLAB_ID.test(text);
  const distributed = extractDistributed(text);

  // 提取板厚: h=120, 厚120, 120厚
  const thicknessMatch = text.match(/(?:h\s*=\s*|厚度?\s*=?\s*)(\d{2,3})|(\d{2,3})\s*厚/i);

  if (!hasSlabId && !thicknessMatch && distributed.length < 1) return { success: false };

  const params: Partial<SlabParams> = {};
  const desc: string[] = [];

  const idMatch = text.match(RE_SLAB_ID);
  if (idMatch) {
    params.id = idMatch[0].toUpperCase();
    desc.push(params.id);
  }

  if (thicknessMatch) {
    params.thickness = parseInt(thicknessMatch[1] || thicknessMatch[2]);
    desc.push(`板厚${params.thickness}mm`);
  }

  // 分布筋按顺序: X底、Y底、X面、Y面
  if (distributed.length >= 1) {
    params.bottomX = distributedNotation(distributed[0]);
    desc.push(`X底筋${params.bottomX}`);
  }
  if (distributed.length >= 2) {
    params.bottomY = distributedNotation(distributed[1]);
    desc.push(`Y底筋${params.bottomY}`);
  }
  if (distributed.length >= 3) {
    params.topX = distributedNotation(distributed[2]);
    desc.push(`X面筋${params.topX}`);
  }
  if (distributed.length >= 4) {
    params.topY = distributedNotation(distributed[3]);
    desc.push(`Y面筋${params.topY}`);
  }

  if (Object.keys(params).length < 2) return { success: false };

  return {
    success: true,
    params,
    description: `已识别板标注：${desc.join('，')}`,
  };
}

// ─── 剪力墙标注解析 ───

function parseShearWallNotation(text: string): NotationResult {
  const hasWallId = RE_WALL_ID.test(text);
  const distributed = extractDistributed(text);
  const rebars = extractAllRebars(text);

  // 提取墙厚: bw=200
  const bwMatch = text.match(/bw\s*=\s*(\d{3})/i);
  // 提取墙长: lw=3000
  const lwMatch = text.match(/lw\s*=\s*(\d{3,5})/i);

  if (!hasWallId && !bwMatch && distributed.length < 1) return { success: false };

  const params: Partial<ShearWallParams> = {};
  const desc: string[] = [];

  const idMatch = text.match(RE_WALL_ID);
  if (idMatch) {
    params.id = idMatch[0].toUpperCase();
    desc.push(params.id);
  }

  if (bwMatch) {
    params.bw = parseInt(bwMatch[1]);
    desc.push(`墙厚${params.bw}mm`);
  }
  if (lwMatch) {
    params.lw = parseInt(lwMatch[1]);
    desc.push(`墙长${params.lw}mm`);
  }

  // 分布筋: 竖向、水平
  if (distributed.length >= 1) {
    params.vertBar = distributedNotation(distributed[0]);
    desc.push(`竖向${params.vertBar}`);
  }
  if (distributed.length >= 2) {
    params.horizBar = distributedNotation(distributed[1]);
    desc.push(`水平${params.horizBar}`);
  }

  // 边缘构件纵筋
  if (rebars.length >= 1) {
    params.boundaryMain = rebarNotation(rebars[0].count, rebars[0].grade, rebars[0].diameter);
    desc.push(`边缘纵筋${params.boundaryMain}`);
  }

  if (Object.keys(params).length < 2) return { success: false };

  return {
    success: true,
    params,
    description: `已识别剪力墙标注：${desc.join('，')}`,
  };
}

// ─── 主入口 ───

/**
 * 尝试本地解析平法标注
 * @returns 解析结果，success=false 时应 fallback 到 AI
 */
export function tryParseNotation(text: string, componentType: ComponentType): NotationResult {
  const trimmed = text.trim();

  // 如果包含明显的自然语言问句词，不尝试本地解析
  if (/[?？]|怎么|为什么|什么是|如何|能不能|帮我|请问|计算/.test(trimmed)) {
    return { success: false };
  }

  // 按当前构件类型优先匹配，如果失败再尝试其他类型
  switch (componentType) {
    case 'beam': {
      const result = parseBeamNotation(trimmed);
      if (result.success) return result;
      break;
    }
    case 'column': {
      const result = parseColumnNotation(trimmed);
      if (result.success) return result;
      break;
    }
    case 'slab': {
      const result = parseSlabNotation(trimmed);
      if (result.success) return result;
      break;
    }
    case 'shearwall': {
      const result = parseShearWallNotation(trimmed);
      if (result.success) return result;
      break;
    }
    case 'joint':
      // 节点标注较复杂，暂不做本地解析，交给 AI
      break;
  }

  // 如果当前类型匹配失败，尝试检测文本中是否有明确的构件类型标识
  if (componentType !== 'beam' && RE_BEAM_ID.test(trimmed)) {
    const result = parseBeamNotation(trimmed);
    if (result.success) return result;
  }
  if (componentType !== 'column' && RE_COLUMN_ID.test(trimmed)) {
    const result = parseColumnNotation(trimmed);
    if (result.success) return result;
  }
  if (componentType !== 'slab' && RE_SLAB_ID.test(trimmed)) {
    const result = parseSlabNotation(trimmed);
    if (result.success) return result;
  }
  if (componentType !== 'shearwall' && RE_WALL_ID.test(trimmed)) {
    const result = parseShearWallNotation(trimmed);
    if (result.success) return result;
  }

  return { success: false };
}
