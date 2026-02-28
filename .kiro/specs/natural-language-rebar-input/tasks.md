# Implementation Tasks: 自然语言配筋输入

## Task 1: RebarGenSchema 类型定义 ✅
- [x] 创建 `src/lib/nl-rebar-schema.ts`
- [ ] 定义钢筋子结构类型：`RebarSpec`（集中配筋: count/grade/diameter）、`DistributedRebarSpec`（分布筋: grade/diameter/spacing）、`StirrupSpec`（箍筋: grade/diameter/spacingDense/spacingNormal/legs）
- [ ] 定义五种构件的 Schema 子类型：`BeamSchema`、`ColumnSchema`、`SlabSchema`、`JointSchema`、`ShearWallSchema`
- [ ] 定义顶层 `RebarGenSchema` 联合类型，包含 `componentType` 鉴别字段
- [ ] 定义 `REBAR_GRADES` 常量映射（`"HRB400"→"C"`, `"HPB300"→"A"` 等）和 `STANDARD_DIAMETERS` 数组
- [ ] 导出 JSON Schema 字符串常量 `BEAM_JSON_SCHEMA`、`COLUMN_JSON_SCHEMA` 等，供 prompt 使用

### BeamSchema 字段
```
sectionWidth, sectionHeight, topRebar: RebarSpec, bottomRebar: RebarSpec,
stirrup: StirrupSpec, leftSupportRebar?: RebarSpec, rightSupportRebar?: RebarSpec,
concreteGrade?, seismicGrade?, cover?, spanLength?, columnWidth?,
lapType?, anchorType?
```

### ColumnSchema 字段
```
sectionWidth, sectionHeight, mainRebar: RebarSpec, stirrup: StirrupSpec,
concreteGrade?, seismicGrade?, cover?, height?
```

### ShearWallSchema 字段
```
wallThickness, wallLength, wallHeight,
verticalBar: DistributedRebarSpec, horizontalBar: DistributedRebarSpec,
boundaryMainRebar: RebarSpec, boundaryStirrup: StirrupSpec,
concreteGrade?, seismicGrade?, cover?
```

### SlabSchema 字段
```
thickness, bottomXBar: DistributedRebarSpec, bottomYBar: DistributedRebarSpec,
topXBar?: DistributedRebarSpec, topYBar?: DistributedRebarSpec,
distributionBar?: DistributedRebarSpec, concreteGrade?, cover?
```

### JointSchema 字段
```
columnWidth, columnHeight, columnMainRebar: RebarSpec, columnStirrup: StirrupSpec,
beamWidth, beamHeight, beamTopRebar: RebarSpec, beamBottomRebar: RebarSpec,
beamStirrup: StirrupSpec, jointType?, anchorType?,
concreteGrade?, seismicGrade?, cover?
```

**Requirements:** R8 (AC1-AC4)

## Task 2: Schema ↔ Params 双向映射 ✅
- [x] 创建 `src/lib/nl-rebar-mapper.ts`
- [ ] 实现 `rebarSpecToNotation(spec: RebarSpec): string`，将 `{count:4, grade:"HRB400", diameter:25}` → `"4C25"`
- [ ] 实现 `notationToRebarSpec(notation: string): RebarSpec`，将 `"4C25"` → `{count:4, grade:"HRB400", diameter:25}`
- [ ] 实现 `distributedSpecToNotation(spec: DistributedRebarSpec): string`，将 `{grade:"HRB400", diameter:10, spacing:200}` → `"C10@200"`
- [ ] 实现 `stirrupSpecToNotation(spec: StirrupSpec): string`，将箍筋对象 → `"A8@100/200(2)"`
- [ ] 实现 `mapSchemaToParams(schema, componentType)` — 对五种构件分别映射
- [ ] 实现 `mapParamsToSchema(params, componentType)` — 反向映射
- [ ] 映射时仅输出 schema 中非 undefined 的字段，确保部分合并语义

**Requirements:** R8 (AC5-AC6), R2 (AC5), R3 (AC3)

## Task 3: Prompt 构造与格式化 ✅
- [x] 创建 `src/lib/nl-rebar-prompt.ts`
- [ ] 实现 `buildNLPrompt(componentType, currentParams, userText)` 返回 `{system, user}`
- [ ] system prompt 包含：角色设定（22G101 结构工程师）、Rebar_Notation 格式说明、当前构件的 JSON Schema、字段取值范围约束、输出格式要求（纯 JSON，无 markdown）
- [ ] user message 包含：用户原文 + 当前参数上下文（让 AI 知道哪些字段已有值）
- [ ] 实现 `formatParams(componentType, params): string`，将 Structured_Params 格式化为中文可读描述
- [ ] 实现 `formatSchemaPreview(schema, componentType): string`，将 RebarGenSchema 格式化为中文预览文本（用于确认面板）
- [ ] prompt 中包含搭接/锚固相关字段说明（lapType、anchorType 可选）

**Requirements:** R2 (AC1, AC3), R8 (AC7), R9 (AC1-AC3), R11 (AC1)

## Task 4: AI 响应解析与校验 ✅
- [x] 创建 `src/lib/nl-rebar-parser.ts`
- [ ] 实现 `extractJSON(responseText: string): object`，处理：纯 JSON、```json 包裹、混合文本中提取 JSON
- [ ] 实现 `validateRebarGenSchema(data, componentType)` 校验逻辑：检查 componentType 匹配、必填字段存在、数值范围合法（直径在 STANDARD_DIAMETERS 中、尺寸在合理范围内）、钢筋等级合法
- [ ] 实现 `parseAIResponse(responseText, componentType)` 完整流程：extractJSON → validate → 返回结果
- [ ] 错误信息使用中文，标注具体问题字段

**Requirements:** R2 (AC2), R4 (AC2-AC3), R11 (AC2)

## Task 5: NLRebarInput UI 组件 ✅
- [x] 创建 `src/components/NLRebarInput.tsx`
- [ ] 实现 props 接口：`componentType`, `currentParams`, `onApply`
- [ ] 实现输入态：多行 textarea + "AI 解析"按钮，placeholder 按 componentType 动态切换
- [ ] 实现 API Key 检测：无 key 时显示引导提示 + 链接到 /settings
- [ ] 实现 AI 调用逻辑：获取当前 provider/model/apiKey，POST 非流式请求到 AI Provider
- [ ] 实现加载态：spinner + 禁用按钮
- [ ] 实现预览态：调用 `formatSchemaPreview` 展示中文可读结果 + "应用"/"取消"按钮
- [ ] 实现成功态：显示已填充字段列表，2秒后自动消失
- [ ] 实现错误态：显示具体错误信息（网络错误/JSON异常/校验失败）
- [ ] "应用"按钮：调用 `mapSchemaToParams` → `onApply(partialParams)`
- [ ] "取消"按钮：清除 preview，恢复输入态
- [ ] 白色主题，与现有 FormControls 风格一致

**Requirements:** R1 (AC1-AC5), R4 (AC1-AC4), R6 (AC1-AC4)

## Task 6: 集成到五个构件页面 ✅
- [x] 在 `BeamPageClient.tsx` 的"快速示例"下方添加 `<NLRebarInput componentType="beam" currentParams={params} onApply={...} />`
- [x] 在 `ColumnPageClient.tsx` 同样位置添加 NLRebarInput
- [x] 在 `SlabPageClient.tsx` 同样位置添加 NLRebarInput
- [x] 在 `ShearWallPageClient.tsx` 同样位置添加 NLRebarInput
- [x] 在 `JointPageClient.tsx` 同样位置添加 NLRebarInput（JointParams 无 id 字段，注意适配）
- [x] 确认各页面的 `update()` 函数通过 `setParams(p => ({...p, ...patch}))` 实现部分合并
- [x] 确认 useMemo 依赖链（calcResult, aiContext, errors）在参数更新后自动重算

**Requirements:** R3 (AC1-AC2, AC4), R5 (AC1-AC5), R10 (AC1, AC4-AC6)

## Task 7: 锚固/搭接联动验证
- [ ] 确认 AI 修改 concreteGrade/seismicGrade 后，NotationExplain 中的 laE/llE 自动重算（已有 useMemo 链）
- [ ] 确认 AI 修改钢筋规格后，WeightCalc 中的用量自动更新
- [ ] 确认 AI 修改截面尺寸后，箍筋加密区长度等派生值自动更新
- [ ] 在 NLRebarInput 的 prompt 中说明 lapType/anchorType 为可选字段
- [ ] 测试：输入"C35混凝土，二级抗震"后确认锚固长度变化

**Requirements:** R9 (AC4-AC5), R10 (AC2-AC3, AC5)
