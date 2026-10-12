# AGENT 开发规范文档

> 版本：v1.1
> 适用范围：本项目（梦境记录与词网络 Web 应用）及后续所有 AI Agent 辅助开发场景
> 目标：让 Agent 在可控、可预测、可追溯的边界内高效产出代码，减少返工与幻觉。

---

## 一、总则

### 1.1 文档目的

本规范定义 Agent 在本项目中参与开发时的**角色边界、工作流程、输出标准、质量红线与协作协议**。所有由 Agent 生成的代码、文档、配置，均需符合本规范。

### 1.2 技术栈基线

| 层 | 技术选型 | 说明 |
|---|---|---|
| **前端框架** | React 18+ + TypeScript | 严格模式，函数组件 + Hooks |
| **前端构建** | Vite | 快速冷启动，ESM 优先 |
| **前端样式** | Tailwind CSS | 原子化，深色主题优先 |
| **前端状态** | Zustand | 轻量，避免过度设计 |
| **前端路由** | React Router v6 | 声明式路由 |
| **前端图可视化** | react-force-graph / reaflow | 力导向词网络 |
| **后端框架** | Python 3.11+ + FastAPI | 异步优先，Pydantic 校验 |
| **后端 ORM** | SQLAlchemy 2.0 + Alembic | 异步 ORM，迁移管理 |
| **数据库** | SQLite | 单文件，开发/轻量部署友好 |
| **AI 能力** | OpenAI / Gemini / 本地 Ollama | 关键词提取 + Embedding |
| **测试（前端）** | Vitest + React Testing Library | 单元 + 组件测试 |
| **测试（后端）** | pytest + httpx | 单元 + 接口测试 |

### 1.3 核心原则

| 原则 | 说明 |
|---|---|
| **最小惊讶** | Agent 的输出应符合项目现有约定，不擅自引入新范式 |
| **显式优于隐式** | 任何假设必须写出来，不得默默替用户做决定 |
| **可追溯** | 每次改动需说明"改了什么、为什么改、影响范围" |
| **小步提交** | 一次只做一件事，避免大范围重写 |
| **人类兜底** | 关键决策（架构、安全、数据模型）必须由人类确认 |

### 1.4 术语定义

- **Agent**：执行开发任务的 AI 智能体
- **Human**：项目负责人 / 开发者
- **Task**：一次独立的开发请求
- **Artifact**：Agent 产出的代码、文档、配置等
- **Context**：Agent 可访问的项目信息（代码库、规范、历史）

---

## 二、角色与边界

### 2.1 Agent 可承担的角色

| 角色 | 职责 | 典型任务 |
|---|---|---|
| **代码生成者** | 按规范产出代码 | 写组件、API、工具函数 |
| **重构助手** | 在不改变行为前提下优化结构 | 提取函数、拆分模块 |
| **测试编写者** | 补充单元/集成测试 | 写测试用例、mock |
| **文档撰写者** | 生成/更新文档 | README、API 文档、注释 |
| **代码审查者** | 发现问题并提出建议 | Review、安全扫描 |
| **调试助手** | 定位并修复 bug | 分析日志、复现问题 |

### 2.2 Agent 禁止事项（红线）

- ❌ 未经确认，**不得修改数据库 schema 或 Alembic 迁移脚本**
- ❌ 未经确认，**不得改动认证、授权、加密相关代码**
- ❌ 不得**删除**已有测试用例来"让测试通过"
- ❌ 不得引入**未在 `package.json` / `pyproject.toml` 中声明**的第三方库
- ❌ 不得在代码中**硬编码密钥、token、密码**
- ❌ 不得**擅自重写**整个文件，除非任务明确要求
- ❌ 不得对**未理解**的代码做"猜测性修改"
- ❌ 不得在**生产配置**中开启 debug / 关闭安全校验
- ❌ 不得在前端使用 `any` 类型绕过 TypeScript 检查
- ❌ 不得在后端绕过 Pydantic 校验直接处理原始请求体

### 2.3 需要人类确认的操作

以下操作必须先获得 Human 明确同意：

1. 新增/升级依赖（前端 npm 包、后端 pip 包）
2. 修改 SQLite 表结构或 Alembic 迁移
3. 修改 API 契约（请求/响应字段、状态码）
4. 涉及隐私、支付、权限的逻辑
5. 跨模块的大范围重构
6. 性能优化涉及缓存策略变更
7. 删除任何已有功能
8. 引入新的 AI 模型或更换 LLM 供应商

---

## 三、工作流程

### 3.1 标准任务流程

```
[1] 接收任务
      ↓
[2] 澄清需求（不确定必问）
      ↓
[3] 阅读相关代码与文档
      ↓
[4] 输出实现计划（Plan）
      ↓
[5] 人类确认计划
      ↓
[6] 分步实现（每步可验证）
      ↓
[7] 自测 + 说明改动
      ↓
[8] 提交 Review
```

### 3.2 各阶段要求

#### 阶段 1：接收任务
- 复述任务目标，确认理解无误
- 若任务模糊，列出**待澄清问题**，不擅自假设

#### 阶段 2：澄清需求
必须澄清的典型问题：
- 输入/输出是什么？
- 边界条件？（空值、超长、并发）
- 是否影响现有功能？
- 有无性能/安全要求？
- 验收标准是什么？

#### 阶段 3：阅读上下文
- 先读相关文件，**再动手写**
- 遵循项目现有目录结构、命名、风格
- 若发现规范冲突，先报告，不擅自决定

#### 阶段 4：输出计划
计划需包含：
- 改动文件清单（前端/后端分别列出）
- 每个文件的改动目的
- 新增/修改的接口（含请求/响应示例）
- 风险点与回滚方式
- 预计影响的模块

#### 阶段 5：人类确认
- 计划未确认前，**不写代码**
- 若人类要求跳过确认，需在输出中标注"未确认执行"

#### 阶段 6：分步实现
- 每个步骤**可独立验证**
- 一次只改一个逻辑单元
- 改完立即说明"这一步做了什么"

#### 阶段 7：自测与说明
- 运行现有测试，确保不破坏
- 新增功能需补充测试
- 输出**改动说明**（见 5.3）

#### 阶段 8：提交 Review
- 提供 diff 摘要
- 标注需重点 Review 的部分
- 列出已知限制与 TODO

---

## 四、代码规范

### 4.1 通用要求

- 遵循项目既有**语言风格与 lint 规则**
- 命名清晰，避免缩写歧义
- 函数单一职责，长度建议 ≤ 50 行
- 注释解释**为什么**，而非**是什么**
- 禁止提交注释掉的死代码

---

### 4.2 前端规范（React + TypeScript）

#### 4.2.1 目录结构

```
frontend/
├── src/
│   ├── api/              # API 请求封装
│   │   ├── client.ts     # axios/fetch 实例
│   │   └── dreams.ts     # 梦境相关接口
│   ├── components/       # 通用组件
│   │   ├── ui/           # 基础 UI（Button、Modal）
│   │   └── dream/        # 业务组件（DreamCard）
│   ├── features/         # 按功能域组织
│   │   ├── record/       # 记录梦境
│   │   ├── network/      # 词网络
│   │   ├── calendar/     # 日历
│   │   └── explore/      # 联机广场
│   ├── hooks/            # 自定义 Hooks
│   ├── stores/           # Zustand store
│   ├── types/            # 全局类型定义
│   ├── utils/            # 工具函数
│   ├── App.tsx
│   └── main.tsx
├── tests/
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

#### 4.2.2 TypeScript 要求

- **禁止 `any`**，必要时用 `unknown` + 类型守卫
- 所有组件 Props 必须有**显式 interface**
- API 响应必须有**类型定义**，与后端 Pydantic 模型对应
- 使用**严格模式**（`strict: true`）

```tsx
// ✅ 推荐：显式类型、语义化命名、边界处理
interface DreamCardProps {
  dream: Dream;
  onSelect: (id: string) => void;
}

export function DreamCard({ dream, onSelect }: DreamCardProps) {
  if (!dream) return null;
  return (
    <article onClick={() => onSelect(dream.id)}>
      <h3>{dream.date}</h3>
      <p>{dream.summary}</p>
    </article>
  );
}
```

```tsx
// ❌ 禁止：any、隐式全局、无边界处理
export function Card(props: any) {
  return <div onClick={() => props.fn(props.data.id)}>{props.data.text}</div>;
}
```

#### 4.2.3 组件规范

- 函数组件 + Hooks，**禁止 class 组件**
- 组件文件使用 **PascalCase**
- 一个文件一个主组件，可含同文件子组件
- 副作用统一放 `useEffect`，依赖数组必须完整
- 数据请求优先用 **React Query / SWR**（若引入），避免手写 loading 状态

#### 4.2.4 状态管理

- 全局状态用 **Zustand**，局部状态用 `useState`
- Store 按功能域拆分，禁止单一巨型 store
- 异步逻辑放 store action 或独立 hooks

#### 4.2.5 样式

- 统一使用 **Tailwind CSS**
- 禁止内联 `style`（动态计算除外）
- 深色主题优先，通过 `class` 切换
- 响应式断点：移动端优先

#### 4.2.6 API 调用

```ts
// src/api/dreams.ts
import type { Dream, DreamCreate } from '@/types/dream';

export async function createDream(payload: DreamCreate): Promise<Dream> {
  const res = await fetch('/api/dreams', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new ApiError(await res.json());
  return res.json();
}
```

- 所有请求统一走 `api/client.ts`
- 错误统一处理，禁止在组件中散落 `try/catch`
- 类型与后端 Pydantic 模型保持同步

---

### 4.3 后端规范（Python + FastAPI）

#### 4.3.1 目录结构

```
backend/
├── app/
│   ├── api/              # 路由层
│   │   ├── deps.py       # 依赖注入
│   │   └── v1/
│   │       ├── dreams.py
│   │       ├── keywords.py
│   │       └── matches.py
│   ├── core/             # 配置、安全
│   │   ├── config.py
│   │   └── security.py
│   ├── models/           # SQLAlchemy ORM 模型
│   │   ├── dream.py
│   │   ├── keyword.py
│   │   └── user.py
│   ├── schemas/          # Pydantic 模型
│   │   ├── dream.py
│   │   └── keyword.py
│   ├── services/         # 业务逻辑
│   │   ├── dream_service.py
│   │   ├── keyword_service.py
│   │   └── match_service.py
│   ├── db/               # 数据库
│   │   ├── session.py
│   │   └── base.py
│   ├── ai/               # AI 能力封装
│   │   ├── extractor.py  # 关键词提取
│   │   └── embedding.py  # 向量计算
│   └── main.py
├── alembic/              # 迁移
├── tests/
├── pyproject.toml
└── .env.example
```

#### 4.3.2 分层职责

| 层 | 职责 | 禁止 |
|---|---|---|
| **api** | 路由、参数校验、依赖注入 | 写业务逻辑 |
| **services** | 业务逻辑、编排 | 直接操作 HTTP |
| **models** | ORM 定义 | 写业务逻辑 |
| **schemas** | 请求/响应校验 | 写业务逻辑 |
| **ai** | LLM/Embedding 封装 | 直接暴露给路由 |

#### 4.3.3 FastAPI 要求

- 所有接口必须有**响应模型**（`response_model`）
- 请求体必须用 **Pydantic 模型**校验
- 异步接口用 `async def`，数据库用异步 session
- 错误统一用 `HTTPException`，禁止返回裸 dict
- 依赖注入统一走 `Depends`

```python
# ✅ 推荐
from fastapi import APIRouter, Depends, HTTPException
from app.schemas.dream import DreamCreate, DreamOut
from app.services.dream_service import DreamService, get_dream_service

router = APIRouter(prefix="/dreams", tags=["dreams"])

@router.post("", response_model=DreamOut, status_code=201)
async def create_dream(
    payload: DreamCreate,
    service: DreamService = Depends(get_dream_service),
):
    try:
        return await service.create(payload)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
```

```python
# ❌ 禁止
@app.post("/dreams")
def create_dream(data: dict):  # 无校验
    db.execute(f"INSERT ... '{data['content']}'")  # SQL 注入
    return {"ok": True}  # 无响应模型
```

#### 4.3.4 SQLAlchemy 要求

- 使用 **2.0 风格**（`Mapped` / `mapped_column`）
- 所有查询必须**参数化**，禁止字符串拼接 SQL
- 关系加载显式声明（`selectinload` / `joinedload`），避免 N+1
- 事务边界在 **service 层**控制

```python
# models/dream.py
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class Dream(Base):
    __tablename__ = "dreams"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(index=True)
    content: Mapped[str]
    date: Mapped[str] = mapped_column(index=True)
    is_public: Mapped[bool] = mapped_column(default=False)
    keywords: Mapped[list["Keyword"]] = relationship(back_populates="dream")
```

#### 4.3.5 Pydantic 要求

- 使用 **Pydantic v2**
- 请求/响应模型分离（`DreamCreate` / `DreamOut`）
- 字段校验用 `Field`，明确约束
- 禁止在响应中暴露敏感字段

```python
# schemas/dream.py
from pydantic import BaseModel, Field
from datetime import date

class DreamCreate(BaseModel):
    content: str = Field(min_length=1, max_length=5000)
    date: date
    mood: list[str] = []
    clarity: int = Field(ge=1, le=5, default=3)
    is_public: bool = False

class DreamOut(BaseModel):
    id: int
    content: str
    date: date
    keywords: list["KeywordOut"]

    model_config = {"from_attributes": True}
```

---

### 4.4 数据库规范（SQLite）

#### 4.4.1 基本约束

- 使用 **SQLite 3**，单文件数据库
- 开发环境文件：`./data/dream.db`
- 生产环境路径通过环境变量 `DATABASE_URL` 配置
- **必须开启外键约束**：`PRAGMA foreign_keys=ON`
- 建议开启 WAL 模式提升并发读性能

```python
# db/session.py
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

engine = create_async_engine(
    settings.DATABASE_URL,  # sqlite+aiosqlite:///./data/dream.db
    echo=False,
    connect_args={"check_same_thread": False},
)
```

#### 4.4.2 SQLite 特性注意事项

| 特性 | 说明 | 应对 |
|---|---|---|
| **无原生并发写** | 同一时刻只允许一个写事务 | 写操作串行化，避免长事务 |
| **无完整 ALTER** | 不支持删除/修改列 | 用 Alembic 的 `batch_alter_table` |
| **类型弱约束** | 类型亲和性，非强制 | 在 Pydantic 层强校验 |
| **无原生 JSON 类型** | 以 TEXT 存储 | 用 SQLAlchemy `JSON` 类型 |
| **日期时间** | 以 TEXT/INTEGER 存储 | 统一用 ISO8601 字符串 |

#### 4.4.3 迁移管理（Alembic）

- 所有 schema 变更**必须**通过 Alembic 迁移
- 迁移脚本必须可**正向 + 反向**执行
- SQLite 修改列必须用 `batch_alter_table`

```python
# alembic/versions/xxx_add_mood.py
def upgrade():
    with op.batch_alter_table("dreams") as batch_op:
        batch_op.add_column(sa.Column("mood", sa.JSON, nullable=True))

def downgrade():
    with op.batch_alter_table("dreams") as batch_op:
        batch_op.drop_column("mood")
```

#### 4.4.4 数据模型（核心）

```
User
  id, email, nickname, avatar, created_at

Dream
  id, user_id, content, date, mood(JSON), clarity,
  is_public, is_anonymous, created_at

Keyword
  id, dream_id, word, weight, embedding(JSON)

DreamMatch
  id, dream_a_id, dream_b_id, similarity, created_at
```

#### 4.4.5 索引要求

- 外键字段必须建索引（`user_id`、`dream_id`）
- 高频查询字段建索引（`date`、`is_public`）
- 避免过度索引，写多读少的表慎加

---

### 4.5 命名约定

| 类型 | 约定 | 示例 |
|---|---|---|
| 前端组件文件 | PascalCase | `DreamCard.tsx` |
| 前端工具文件 | kebab-case | `format-date.ts` |
| 前端变量/函数 | camelCase | `extractKeywords` |
| 前端常量 | UPPER_SNAKE | `MAX_DREAM_LENGTH` |
| 前端类型/接口 | PascalCase | `DreamKeyword` |
| 后端模块/文件 | snake_case | `dream_service.py` |
| 后端类 | PascalCase | `DreamService` |
| 后端函数/变量 | snake_case | `extract_keywords` |
| 数据库表 | snake_case（复数） | `dream_keywords` |
| API 路径 | kebab-case（复数） | `/api/dreams` |

---

## 五、输出规范

### 5.1 代码输出

- 必须包含**完整可运行**的代码块，而非片段（除非明确要求片段）
- 必须标注**文件路径**
- 修改已有文件时，说明**改动的行范围与原因**
- 前端代码需标注是否影响类型定义
- 后端代码需标注是否影响 API 契约

### 5.2 文档输出

- 使用 Markdown
- 结构清晰，含标题层级
- 代码示例可运行
- 关键决策需说明理由

### 5.3 改动说明模板

```markdown
## 改动说明

### 目标
[一句话说明本次任务目标]

### 改动文件
| 文件 | 类型 | 说明 |
|---|---|---|
| frontend/src/components/dream/DreamCard.tsx | 新增 | 梦境卡片组件 |
| frontend/src/api/dreams.ts | 修改 | 新增 getDreamById |
| backend/app/api/v1/dreams.py | 修改 | 新增 GET /dreams/{id} |
| backend/app/schemas/dream.py | 修改 | 新增 DreamDetail |

### API 变更
- 新增：`GET /api/dreams/{id}` → `DreamDetail`
- 是否破坏兼容：否

### 数据库变更
- 无 / 迁移文件：`alembic/versions/xxx.py`

### 关键决策
- [决策1]：原因……
- [决策2]：原因……

### 影响范围
- 影响模块：……
- 是否破坏兼容：否 / 是（说明）

### 测试情况
- 前端：`npm test`，通过
- 后端：`pytest`，通过
- 新增测试：`DreamCard.test.tsx`、`test_dreams.py`

### 已知限制 / TODO
- ……
```

### 5.4 禁止的输出行为

- ❌ 输出"省略若干行"的伪代码，除非人类明确要求
- ❌ 输出未经验证的 API 用法（如虚构的库函数）
- ❌ 输出与任务无关的大段解释
- ❌ 在未确认时输出"已完成"结论
- ❌ 前端输出 `any` 类型
- ❌ 后端输出绕过 Pydantic 的裸 dict 接口

---

## 六、质量红线

### 6.1 必须通过

- ✅ 前端：`tsc --noEmit` 无错误、`eslint` 无警告
- ✅ 前端：`vitest` 全部通过
- ✅ 后端：`ruff` / `mypy` 无错误
- ✅ 后端：`pytest` 全部通过
- ✅ 新增功能有对应测试
- ✅ 无安全漏洞（SQL 注入、XSS、越权）
- ✅ 无硬编码敏感信息

### 6.2 必须避免

- ❌ 破坏性改动未标注
- ❌ 未处理的异常路径
- ❌ 未释放的资源（数据库连接、定时器）
- ❌ 未考虑的并发/竞态（尤其 SQLite 写）
- ❌ 未做边界校验的用户输入
- ❌ 前端绕过 TypeScript 类型检查
- ❌ 后端绕过 Pydantic 校验

### 6.3 自检清单（提交前逐项确认）

- [ ] 任务目标是否完全满足？
- [ ] 是否遵循项目现有风格？
- [ ] 是否有未澄清的假设？
- [ ] 是否影响其他模块？
- [ ] 是否补充了测试（前端 + 后端）？
- [ ] 是否有硬编码 / 密钥泄露？
- [ ] 是否处理了错误与边界？
- [ ] 前端类型是否完整？后端响应模型是否声明？
- [ ] 数据库变更是否有 Alembic 迁移？
- [ ] 改动说明是否完整？

---

## 七、协作协议

### 7.1 与人类的分工

| 事项 | 人类 | Agent |
|---|---|---|
| 需求定义 | ✅ 主导 | 协助澄清 |
| 架构设计 | ✅ 决策 | 提供方案 |
| 数据模型 | ✅ 决策 | 建议 |
| 编码实现 | 审核 | ✅ 主导 |
| 测试 | 审核 | ✅ 主导 |
| 安全审查 | ✅ 终审 | 初筛 |
| 上线部署 | ✅ 执行 | 提供脚本 |

### 7.2 沟通要求

- 使用**简洁、结构化**的表达
- 不确定时**明确说"不确定"**，不编造
- 遇到冲突规范时**先报告**，不擅自选择
- 每次输出结尾附**下一步建议**

### 7.3 上下文管理

- 长任务需**分阶段汇报**，避免一次性输出过多
- 关键决策需**记录在案**（可写入 `DECISIONS.md`）
- 跨会话任务需**复述当前状态**

---

## 八、错误处理与回滚

### 8.1 发现错误时

1. **立即停止**当前操作
2. **说明**错误现象与可能原因
3. **提出**修复方案
4. 经确认后再执行

### 8.2 回滚要求

- 每次改动应可**独立回滚**
- 涉及数据库变更的，需提供 **Alembic downgrade**
- 涉及 API 变更的，需保留**旧版本兼容**
- 涉及配置变更的，需保留**旧配置备份**

### 8.3 禁止行为

- ❌ 掩盖错误、谎报"已修复"
- ❌ 在未理解原因时反复试错
- ❌ 删除错误日志以"让问题消失"

---

## 九、安全与隐私

### 9.1 数据安全

- 用户梦境属**敏感隐私数据**，默认不公开
- 传输必须 HTTPS
- 敏感字段（邮箱、密码哈希）加密存储
- 日志中禁止出现梦境正文

### 9.2 权限

- 所有接口必须校验用户身份（JWT / Session）
- 禁止越权访问他人数据（每个查询带 `user_id` 过滤）
- 公开数据也需脱敏处理

### 9.3 依赖安全

- 新增依赖需评估**维护状态与漏洞**
- 定期运行 `npm audit` / `pip-audit`
- 禁止引入来源不明的包
- 前端锁定 `package-lock.json`，后端锁定 `poetry.lock` / `requirements.txt`

### 9.4 AI 相关安全

- LLM 调用需**超时与降级**（失败时返回空关键词，不阻塞记录）
- 用户梦境文本发送给第三方 LLM 前需**明确告知**
- Embedding 向量存储需考虑隐私（可本地计算）
- 禁止将用户梦境用于模型训练

---

## 十、附录

### 10.1 常用命令

```bash
# 前端
cd frontend
npm install
npm run dev          # 开发
npm run build        # 构建
npm run test         # 测试
npm run lint         # 检查

# 后端
cd backend
poetry install       # 或 pip install -e .
uvicorn app.main:app --reload   # 开发
pytest                          # 测试
ruff check .                    # 检查
alembic upgrade head            # 迁移
```

### 10.2 常用 Prompt 模板

**任务启动模板**
```
任务：[描述]
技术栈：React + TS（前端）/ FastAPI + SQLite（后端）
上下文：[相关文件/模块]
约束：[规范/依赖限制]
验收标准：[可验证的条件]
请先输出实现计划（含前后端改动清单），待确认后再编码。
```

**代码审查模板**
```
请审查以下改动：
- 文件：[路径]
- 目的：[说明]
- 关注点：安全 / 性能 / 类型安全 / 可维护性
输出格式：问题列表 + 严重级别 + 修改建议
```

### 10.3 严重级别定义

| 级别 | 含义 | 处理 |
|---|---|---|
| P0 | 安全漏洞 / 数据丢失 | 立即停止，优先修复 |
| P1 | 功能错误 / 破坏兼容 | 本次任务内修复 |
| P2 | 性能 / 可维护性问题 | 记录并排期 |
| P3 | 风格 / 优化建议 | 可选处理 |

### 10.4 版本记录

| 版本 | 日期 | 变更 |
|---|---|---|
| v1.0 | — | 初版 |
| v1.1 | — | 补充技术栈基线；明确前端 React+TS、后端 FastAPI、数据库 SQLite 的详细规范 |

---

> 本规范为活文档，随项目演进持续更新。任何 Agent 在执行任务前，应先阅读并遵守本规范。