# RebarViz · 鹏哥的钢筋日常

> 基于 22G101 图集的钢筋平法学习工具，输入平法标注即时生成三维配筋模型。

🌐 **在线体验**: [[https://brucelee1024.github.io/RebarViz](https://tingfeng755.github.io/RebarViz)](https://brucelee1024.github.io/RebarViz)

---

## 功能特性

- **3D 交互查看** — 旋转、缩放、平移，从任意角度观察配筋构造
- **点击识别** — 点击任意钢筋，即时显示钢筋详细信息
- **剖切视图** — 沿构件任意位置剖切，查看截面配筋
- **标注自动解读** — 输入平法标注，自动解析钢筋等级、直径、间距
- **AI 平法助手** — 接入 DeepSeek / 通义千问 / Kimi，随时提问构造问题
- **截面配筋图** — 同步生成 2D 截面示意图

## 支持构件

| 构件 | 编号 | 说明 |
|------|------|------|
| 框架梁 | KL | 集中标注、原位标注、支座负筋、箍筋加密区、22G101 端锚构造 |
| 框架柱 | KZ | 纵筋分布、箍筋加密区、搭接区域 |
| 楼板 | LB | X/Y 向底筋、面筋、分布筋双向配筋 |
| 梁柱节点 | Joint | 节点核心区构造、梁筋锚固、节点区箍筋加密 |

## 本地运行

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问 http://localhost:3000

## AI 功能配置

AI 助手需要配置 API Key，Key 仅保存在浏览器本地，不会上传服务器。

在应用内点击左侧导航栏「设置」，添加以下任意一个服务商的 API Key：

| 服务商 | 获取地址 |
|--------|---------|
| DeepSeek | https://platform.deepseek.com/api_keys |
| 通义千问 | https://dashscope.console.aliyun.com/apiKey |
| Kimi | https://platform.moonshot.cn/console/api-keys |

## 技术栈

- [Next.js 15](https://nextjs.org/) + React 19
- [Three.js](https://threejs.org/) + [@react-three/fiber](https://docs.pmnd.rs/react-three-fiber)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Lucide Icons](https://lucide.dev/)

---

## 许可证

**CC BY-NC 4.0 — 署名-非商业性使用 4.0 国际**

Copyright © 2025 BruceLee1024

本项目基于 [Creative Commons Attribution-NonCommercial 4.0 International](https://creativecommons.org/licenses/by-nc/4.0/) 许可证发布。

**你可以自由地：**
- 分享 — 以任何媒介或格式复制、发行本作品
- 演绎 — 修改、转换或以本作品为基础进行创作

**但须遵守以下条件：**
- **署名** — 必须注明原作者（BruceLee1024）及来源链接
- **非商业性使用** — 不得将本作品用于商业目的，包括但不限于销售、付费服务、商业培训等
- **相同方式共享** — 若对本作品进行演绎，须以相同许可证发布

> 仅供学习参考，计算结果不作为工程设计依据。
