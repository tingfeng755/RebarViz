# Requirements Document

## Introduction

自然语言配筋输入功能允许用户在 RebarViz 的各构件页面（梁、柱、剪力墙、板、节点）中，通过输入一段中文自然语言描述来自动填充配筋参数表单，替代逐个字段手动输入。系统调用已有的 AI 服务商（DeepSeek / 通义千问 / Kimi）解析自然语言，将其转换为结构化参数对象，并回填到对应的表单字段中。

## Glossary

- **NL_Input_Box**: 自然语言输入框组件，嵌入在各构件页面的参数面板中，用户在此输入中文配筋描述
- **NL_Parser**: 自然语言解析模块，负责构造 prompt、调用 AI 接口、将 AI 返回的 JSON 解析为结构化参数对象
- **Param_Filler**: 参数回填模块，负责将解析后的结构化参数写入对应构件页面的表单状态
- **Component_Page**: 构件页面，指梁(beam)、柱(column)、剪力墙(shearwall)、板(slab)、节点(joint)五个页面
- **Structured_Params**: 结构化参数，指 BeamParams、ColumnParams、SlabParams、JointParams、ShearWallParams 等 TypeScript 类型定义的参数对象
- **AI_Provider**: AI 服务商，指 DeepSeek、通义千问(Qwen)、Kimi 三个已集成的 OpenAI 兼容接口
- **Rebar_Notation**: 钢筋标注格式，如 "4C25"（4根HRB400直径25mm）、"A8@100/200(2)"（HPB300直径8mm加密100非加密200两肢箍）、"C10@200"（HRB400直径10mm间距200mm）
- **RebarGenSchema**: 统一的 AI 配筋生成数据结构，作为 AI 输出和系统输入之间的中间层。该结构与具体构件类型无关，AI 只需按此 schema 输出 JSON，系统负责将其映射到对应的 Structured_Params。设计目标是让 AI 不需要了解系统内部的字段命名和格式约定，只需输出语义清晰的配筋描述对象

## Requirements

### Requirement 1: 自然语言输入框

**User Story:** As a 结构工程师, I want to 在参数面板中看到一个自然语言输入框, so that 我可以用中文描述配筋方案而不必逐个填写表单字段。

#### Acceptance Criteria

1. THE NL_Input_Box SHALL 显示在每个 Component_Page 参数面板顶部，位于"快速示例"按钮区域下方
2. THE NL_Input_Box SHALL 包含一个多行文本输入区域和一个"AI 解析"提交按钮
3. THE NL_Input_Box SHALL 根据当前 Component_Page 类型显示对应的 placeholder 示例文本（梁页面显示梁的示例，柱页面显示柱的示例）
4. WHEN 用户未配置任何 AI_Provider 的 API Key, THE NL_Input_Box SHALL 显示提示信息引导用户前往设置页面配置 API Key
5. THE NL_Input_Box SHALL 使用当前 AI_Provider 设置（与 AIChat 组件共享同一套 provider 和 API Key 配置）

### Requirement 2: 自然语言解析

**User Story:** As a 结构工程师, I want to 输入中文配筋描述后系统自动解析为结构化参数, so that 我不需要记忆每个字段的精确格式。

#### Acceptance Criteria

1. WHEN 用户提交自然语言描述, THE NL_Parser SHALL 根据当前 Component_Page 类型构造包含目标 Structured_Params JSON schema 的 prompt 发送给 AI_Provider
2. WHEN AI_Provider 返回响应, THE NL_Parser SHALL 从响应中提取 JSON 对象并校验其符合对应的 Structured_Params 类型定义
3. THE NL_Parser SHALL 在 prompt 中包含 Rebar_Notation 格式说明和各字段的取值范围约束
4. WHEN 自然语言描述中未提及某些参数（如混凝土等级、保护层厚度）, THE NL_Parser SHALL 保留这些字段的当前表单值不做覆盖
5. THE NL_Parser SHALL 将 AI_Provider 返回的钢筋标注格式规范化为系统可识别的 Rebar_Notation（如将"HRB400"转为等级字母"C"，将"直径25"转为"25"）

### Requirement 3: 参数回填

**User Story:** As a 结构工程师, I want to 解析结果自动填入表单字段, so that 我可以立即看到 3D 可视化效果并按需微调。

#### Acceptance Criteria

1. WHEN NL_Parser 成功解析出 Structured_Params, THE Param_Filler SHALL 将解析结果合并到当前 Component_Page 的表单状态中
2. WHEN 参数回填完成, THE Component_Page SHALL 立即更新 3D 可视化、截面图和标注解读
3. THE Param_Filler SHALL 仅覆盖 NL_Parser 返回的非空字段，保留用户之前手动设置的其他字段值
4. WHEN 回填完成, THE NL_Input_Box SHALL 显示解析成功的提示，列出已填充的字段名称

### Requirement 4: 解析错误处理

**User Story:** As a 结构工程师, I want to 在解析失败时获得清晰的错误提示, so that 我可以修改描述重新尝试。

#### Acceptance Criteria

1. IF AI_Provider 接口调用失败（网络错误、API Key 无效、额度不足）, THEN THE NL_Input_Box SHALL 显示具体的错误原因
2. IF AI_Provider 返回的内容无法解析为有效 JSON, THEN THE NL_Input_Box SHALL 显示"AI 返回格式异常，请重试或调整描述"的提示
3. IF 解析出的参数值不符合字段校验规则（如直径不在标准规格中、数值超出范围）, THEN THE NL_Input_Box SHALL 显示具体的校验错误信息并标注问题字段
4. WHILE NL_Parser 正在等待 AI_Provider 响应, THE NL_Input_Box SHALL 显示加载状态并禁用提交按钮

### Requirement 5: 构件类型适配

**User Story:** As a 结构工程师, I want to 在所有五种构件页面中使用自然语言输入, so that 无论配置哪种构件都能享受同样的便捷体验。

#### Acceptance Criteria

1. THE NL_Parser SHALL 支持解析梁(BeamParams)的自然语言描述，包括截面尺寸、上部筋、下部筋、箍筋、支座负筋
2. THE NL_Parser SHALL 支持解析柱(ColumnParams)的自然语言描述，包括截面尺寸、纵筋、箍筋
3. THE NL_Parser SHALL 支持解析剪力墙(ShearWallParams)的自然语言描述，包括墙厚、竖向分布筋、水平分布筋、边缘构件配筋
4. THE NL_Parser SHALL 支持解析板(SlabParams)的自然语言描述，包括板厚、X/Y向底筋和面筋、分布筋
5. THE NL_Parser SHALL 支持解析节点(JointParams)的自然语言描述，包括柱截面与配筋、梁截面与配筋、节点类型、锚固方式

### Requirement 6: 解析结果确认

**User Story:** As a 结构工程师, I want to 在参数回填前预览解析结果, so that 我可以确认 AI 理解正确后再应用。

#### Acceptance Criteria

1. WHEN NL_Parser 成功解析出 Structured_Params, THE NL_Input_Box SHALL 以可读的中文格式展示解析结果预览（如"截面: 300×600, 上部筋: 2C25, 下部筋: 4C25"）
2. THE NL_Input_Box SHALL 提供"应用"和"取消"两个操作按钮供用户确认或放弃解析结果
3. WHEN 用户点击"应用"按钮, THE Param_Filler SHALL 执行参数回填
4. WHEN 用户点击"取消"按钮, THE NL_Input_Box SHALL 丢弃解析结果并恢复到输入状态

### Requirement 8: 统一的 AI 配筋生成数据结构 (RebarGenSchema)

**User Story:** As a 开发者, I want to 定义一套统一的、AI 友好的中间数据结构, so that AI 只需按固定 schema 输出 JSON，系统负责映射到各构件的内部参数类型。

#### Acceptance Criteria

1. THE RebarGenSchema SHALL 定义一个与构件类型无关的顶层结构，包含 `componentType` 字段标识构件类型（beam/column/shearwall/slab/joint）
2. THE RebarGenSchema SHALL 使用语义化的中文友好字段名（如 `sectionWidth`、`sectionHeight`、`topRebar`），而非系统内部缩写（如 `b`、`h`、`top`），使 AI 更容易正确填充
3. THE RebarGenSchema SHALL 为每种构件类型定义对应的子结构，包含该构件所有可配置参数的字段定义、类型约束和取值范围
4. THE RebarGenSchema SHALL 为钢筋标注定义统一的子结构（如 `{ count, grade, diameter }` 用于集中配筋，`{ grade, diameter, spacing }` 用于分布筋，`{ grade, diameter, spacingDense, spacingNormal, legs }` 用于箍筋），避免 AI 需要拼接字符串格式
5. THE system SHALL 提供 `mapSchemaToParams` 函数，将 RebarGenSchema 对象转换为对应的 Structured_Params 对象（如将 `{ count: 4, grade: "HRB400", diameter: 25 }` 转为 `"4C25"`）
6. THE system SHALL 提供 `mapParamsToSchema` 函数，将 Structured_Params 对象转换为 RebarGenSchema 对象（用于 round-trip 验证和预览展示）
7. THE NL_Parser 的 prompt SHALL 包含完整的 RebarGenSchema JSON Schema 定义，使 AI 严格按此结构输出

### Requirement 9: 搭接与锚固参数联动

**User Story:** As a 结构工程师, I want to 自然语言描述中包含搭接和锚固相关信息时系统能正确处理, so that 生成的配筋方案在构造上是完整的。

#### Acceptance Criteria

1. WHEN 用户在自然语言中提及搭接方式（如"机械连接"、"焊接"、"绑扎搭接"）, THE RebarGenSchema SHALL 包含 `lapType` 字段记录搭接方式
2. WHEN 用户在自然语言中提及锚固方式（如"直锚"、"弯锚"）, THE RebarGenSchema SHALL 包含 `anchorType` 字段记录锚固方式
3. WHEN 用户未提及搭接/锚固参数, THE NL_Parser SHALL 不输出这些字段，系统保留当前值或使用 22G101 默认规则自动计算
4. THE Param_Filler SHALL 在回填参数后触发系统已有的锚固长度计算（calcLaE、calcLlE、calcBeamEndAnchor 等），确保搭接/锚固长度与新参数一致
5. WHEN 混凝土等级或抗震等级通过自然语言被修改, THE system SHALL 自动重新计算所有依赖这些参数的锚固长度和搭接长度

### Requirement 10: 参数动态更新与响应式联动

**User Story:** As a 结构工程师, I want to AI 填充参数后所有关联计算和视图立即更新, so that 我看到的 3D 模型、截面图、用量估算和标注解读都是基于最新参数的。

#### Acceptance Criteria

1. WHEN Param_Filler 更新表单状态后, THE Component_Page SHALL 在同一个 React 渲染周期内触发所有 useMemo 依赖链的重新计算（calcResult、aiContext、errors）
2. WHEN 钢筋规格（等级、直径）通过 AI 被修改, THE system SHALL 自动重新计算该钢筋的锚固长度 laE、搭接长度 llE，并更新标注解读面板中的锚固/搭接信息
3. WHEN 截面尺寸通过 AI 被修改, THE system SHALL 自动重新计算箍筋加密区长度、支座负筋伸入长度等依赖截面尺寸的派生值
4. THE 3D Viewer SHALL 在参数更新后自动重建钢筋几何体，反映新的钢筋数量、直径、间距和位置
5. THE WeightCalc 组件 SHALL 在参数更新后自动重新计算钢筋用量估算
6. WHEN AI 一次性修改多个关联参数（如同时修改截面尺寸和钢筋规格）, THE system SHALL 确保所有参数在同一次状态更新中写入，避免中间状态导致的闪烁或错误计算

### Requirement 11: 自然语言解析 prompt 的 round-trip 一致性

#### Acceptance Criteria

1. THE NL_Parser SHALL 提供一个 formatParams 函数，将 Structured_Params 格式化为人类可读的中文描述字符串
2. THE NL_Parser SHALL 提供一个 parseResponse 函数，将 AI 返回的 JSON 字符串解析为 Structured_Params 对象
3. FOR ALL valid Structured_Params 对象, 对其调用 formatParams 生成描述再交给 AI 解析再调用 parseResponse, SHALL 产生与原始对象等价的参数（round-trip 属性）
