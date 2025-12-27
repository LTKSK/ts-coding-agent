# nebula TypeScript移行計画

## 概要

Go言語で実装された自律的コーディングエージェント「nebula」をTypeScript + Vercel AI SDKに移行する実装計画。

## 前提条件

- **ターゲット言語**: TypeScript
- **AIライブラリ**: Vercel AI SDK (`ai` package)
- **ランタイム**: Node.js (v18以上推奨)
- **データベース**: better-sqlite3 (Go版と同じSQLite)
- **パッケージマネージャー**: npm or pnpm

## フェーズ1: プロジェクトセットアップ

### 1.1 プロジェクト初期化

```bash
mkdir nebula-ts
cd nebula-ts
npm init -y
```

### 1.2 依存パッケージのインストール

**コア依存関係:**
```bash
npm install ai openai
npm install better-sqlite3
npm install dotenv
```

**開発依存関係:**
```bash
npm install -D typescript @types/node @types/better-sqlite3
npm install -D tsx nodemon
npm install -D @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

### 1.3 TypeScript設定 (tsconfig.json)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 1.4 package.json スクリプト設定

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/main.js",
    "dev": "tsx src/main.ts",
    "dev:watch": "tsx watch src/main.ts"
  }
}
```

## フェーズ2: ディレクトリ構造とコア型定義

### 2.1 ディレクトリ構造

```
nebula-ts/
├── src/
│   ├── main.ts                  # エントリーポイント
│   ├── config/
│   │   └── config.ts            # 設定管理
│   ├── memory/
│   │   ├── manager.ts           # メモリマネージャー
│   │   ├── database.ts          # SQLite接続
│   │   ├── models.ts            # データモデル
│   │   └── queries.ts           # SQL操作
│   ├── tools/
│   │   ├── types.ts             # ツール型定義
│   │   ├── registry.ts          # ツール登録
│   │   ├── utils.ts             # JSON/UTF-8ユーティリティ
│   │   ├── readFile.ts
│   │   ├── list.ts
│   │   ├── search.ts
│   │   ├── writeFile.ts
│   │   └── editFile.ts
│   └── prompts/
│       └── system.ts            # システムプロンプト
├── package.json
├── tsconfig.json
└── .env
```

### 2.2 コア型定義 (src/tools/types.ts)

```typescript
import { CoreTool } from 'ai';

export interface ToolDefinition {
  schema: CoreTool;
  execute: (args: any) => Promise<string>;
}

export interface ToolResult {
  success?: boolean;
  content?: string;
  files?: string[];
  error?: string;
}
```

## フェーズ3: 設定システムの実装

### 3.1 Config実装 (src/config/config.ts)

**実装内容:**
- `~/.nebula-ts/config.json` の読み書き
- モデル選択機能 (`gpt-4o`, `gpt-4o-mini` など)
- データベースパスの管理
- 環境変数からのAPIキー読み込み

**主要関数:**
```typescript
export interface Config {
  model: string;
  databasePath: string;
}

export function loadConfig(): Config
export function saveConfig(config: Config): void
export function getApiKey(): string
```

## フェーズ4: ツールシステムの実装

### 4.1 ユーティリティ関数 (src/tools/utils.ts)

**実装内容:**
- `validateUTF8(content: string): boolean` - UTF-8検証
- `cleanControlCharacters(content: string): string` - 制御文字除去
- `safeJSONParse<T>(json: string): T` - 安全なJSON解析
- `safeJSONStringify(obj: any): string` - 安全なJSON文字列化

### 4.2 個別ツール実装

#### readFile (src/tools/readFile.ts)

```typescript
import { z } from 'zod';
import { tool } from 'ai';

export const readFileTool = tool({
  description: '指定されたファイルの内容全体を読み込みます。',
  parameters: z.object({
    path: z.string().describe('読み込むファイルのパス'),
  }),
  execute: async ({ path }) => {
    // fs.readFile実装 + UTF-8検証
    // Go版と同じロジック
  },
});
```

#### list (src/tools/list.ts)

```typescript
export const listTool = tool({
  description: '指定したディレクトリ内のファイルとディレクトリの一覧を返します。',
  parameters: z.object({
    path: z.string().describe('リストするディレクトリのパス'),
    recursive: z.boolean().optional().describe('再帰的にリストするかどうか'),
  }),
  execute: async ({ path, recursive }) => {
    // fs.readdir実装 (recursive対応)
  },
});
```

#### searchInDirectory (src/tools/search.ts)

```typescript
export const searchTool = tool({
  description: 'ディレクトリ配下を再帰的に検索し、キーワードを含むファイルを見つけます。',
  parameters: z.object({
    directory: z.string().describe('検索するディレクトリのパス'),
    keyword: z.string().describe('検索するキーワード'),
  }),
  execute: async ({ directory, keyword }) => {
    // 再帰的ファイル検索 + readline実装
  },
});
```

#### writeFile (src/tools/writeFile.ts)

```typescript
export const writeFileTool = tool({
  description: '新しいファイルを作成し、内容を書き込みます。実行前にユーザーの許可を求めます。',
  parameters: z.object({
    path: z.string().describe('作成するファイルのパス'),
    content: z.string().describe('ファイルに書き込む内容'),
  }),
  execute: async ({ path, content }) => {
    // ファイル存在チェック
    // ユーザー許可プロンプト (readline)
    // fs.writeFile + ディレクトリ自動作成
  },
});
```

#### editFile (src/tools/editFile.ts)

```typescript
export const editFileTool = tool({
  description: '既存ファイルの内容を完全に上書きします。Read-Modify-Writeパターンに従ってください。',
  parameters: z.object({
    path: z.string().describe('編集する既存ファイルのパス'),
    new_content: z.string().describe('ファイル全体を上書きする新しい完全な内容'),
  }),
  execute: async ({ path, new_content }) => {
    // ファイル存在チェック
    // ユーザー許可プロンプト
    // fs.writeFile実装
  },
});
```

### 4.3 ツールレジストリ (src/tools/registry.ts)

```typescript
import { readFileTool } from './readFile';
import { listTool } from './list';
// ... 他のツールをインポート

export function getAvailableTools() {
  return {
    readFile: readFileTool,
    list: listTool,
    searchInDirectory: searchTool,
    writeFile: writeFileTool,
    editFile: editFileTool,
  };
}
```

## フェーズ5: メモリシステムの実装

### 5.1 データモデル (src/memory/models.ts)

```typescript
export interface Session {
  id: number;
  projectPath: string;
  startedAt: string;
  lastActiveAt: string;
}

export interface Message {
  id: number;
  sessionId: number;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolCallId?: string;
  createdAt: string;
}
```

### 5.2 データベース接続 (src/memory/database.ts)

```typescript
import Database from 'better-sqlite3';

export function initDatabase(dbPath: string): Database.Database {
  const db = new Database(dbPath);

  // テーブル作成SQL実行
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_path TEXT NOT NULL,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      tool_call_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );
  `);

  return db;
}
```

### 5.3 SQLクエリ実装 (src/memory/queries.ts)

**主要関数:**
```typescript
export function createSession(db: Database, projectPath: string): number
export function getRecentSessions(db: Database, projectPath: string, limit: number): Session[]
export function saveMessage(db: Database, sessionId: number, message: Message): void
export function getSessionMessages(db: Database, sessionId: number): Message[]
export function updateSessionActivity(db: Database, sessionId: number): void
```

### 5.4 メモリマネージャー (src/memory/manager.ts)

```typescript
export class MemoryManager {
  private db: Database;
  private currentSessionId?: number;

  constructor(dbPath: string) {
    this.db = initDatabase(dbPath);
  }

  startNewSession(projectPath: string): number
  restoreSession(sessionId: number): Message[]
  saveMessage(message: Message): void
  getCurrentSessionId(): number | undefined
  selectSessionInteractive(projectPath: string): number | undefined
}
```

## フェーズ6: システムプロンプトの実装

### 6.1 システムプロンプト (src/prompts/system.ts)

**実装内容:**
- Go版 `getSystemPrompt()` の完全移植
- モード別プロンプト生成（PLAN / AGENT）
- 実行プロトコルの明記

```typescript
export function getSystemPrompt(mode: 'PLAN' | 'AGENT'): string {
  const basePrompt = `# Role
You are "nebula", an expert software developer and autonomous coding agent.

# Critical Rules (Non-Negotiable)
...
`;

  const modeSpecificPrompt = mode === 'PLAN'
    ? '# PLAN MODE: Read-only operations only...'
    : '# AGENT MODE: Full capabilities including writeFile and editFile...';

  return basePrompt + modeSpecificPrompt;
}
```

## フェーズ7: メインCLIの実装

### 7.1 会話ループ (src/main.ts)

**実装内容:**

```typescript
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import * as readline from 'readline';
import { MemoryManager } from './memory/manager';
import { loadConfig } from './config/config';
import { getAvailableTools } from './tools/registry';
import { getSystemPrompt } from './prompts/system';

async function main() {
  // 1. 設定読み込み
  const config = loadConfig();

  // 2. メモリマネージャー初期化
  const memory = new MemoryManager(config.databasePath);

  // 3. セッション選択 or 新規作成
  const sessionId = memory.selectSessionInteractive(process.cwd());

  // 4. 会話履歴の復元
  const history = sessionId ? memory.restoreSession(sessionId) : [];

  // 5. モード設定（デフォルト: AGENT）
  let currentMode: 'PLAN' | 'AGENT' = 'AGENT';

  // 6. ツール取得
  const tools = getAvailableTools();

  // 7. REPLループ
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log('nebula - TypeScript版 自律コーディングエージェント');
  console.log('コマンド: exit, model, mode, plan, agent');

  const prompt = () => {
    rl.question(`[${currentMode}] You: `, async (input) => {
      if (input === 'exit') {
        rl.close();
        return;
      }

      if (input === 'plan') {
        currentMode = 'PLAN';
        console.log('モードをPLANに切り替えました');
        prompt();
        return;
      }

      if (input === 'agent') {
        currentMode = 'AGENT';
        console.log('モードをAGENTに切り替えました');
        prompt();
        return;
      }

      // AI SDK generateText実行
      const result = await generateText({
        model: openai(config.model),
        system: getSystemPrompt(currentMode),
        messages: history,
        tools: currentMode === 'AGENT' ? tools : {
          readFile: tools.readFile,
          list: tools.list,
          searchInDirectory: tools.searchInDirectory,
        },
        maxSteps: 10, // ツール実行のループ回数制限
      });

      // レスポンス表示
      console.log(`Assistant: ${result.text}`);

      // メモリに保存
      memory.saveMessage({
        role: 'user',
        content: input,
        sessionId: memory.getCurrentSessionId()!,
      });

      memory.saveMessage({
        role: 'assistant',
        content: result.text,
        sessionId: memory.getCurrentSessionId()!,
      });

      prompt();
    });
  };

  prompt();
}

main().catch(console.error);
```

## フェーズ8: テストと検証

### 8.1 基本機能テスト

```bash
# プロジェクトのビルド
npm run build

# 開発モードで実行
npm run dev
```

**テストシナリオ:**
1. モデル切り替えコマンドの動作確認
2. readFile, list, searchInDirectory の実行
3. writeFile のユーザー許可プロンプト
4. editFile の Read-Modify-Write パターン
5. セッション復元機能

### 8.2 マルチファイル編集テスト

```
"test/todo-app プロジェクトに優先度機能を追加してください"
```

期待動作:
1. list で構造を探索
2. readFile で各ファイルを読み込み
3. 構造理解後に editFile で変更実行

## フェーズ9: 最適化と改善

### 9.1 エラーハンドリング強化

- ツール実行時の詳細なエラーメッセージ
- ファイルシステムエラーの適切なハンドリング
- データベースエラーのリカバリー

### 9.2 パフォーマンス最適化

- SQLite prepared statements の活用
- ファイル読み込みのストリーミング処理
- 大規模ディレクトリの効率的な探索

### 9.3 ユーザー体験の向上

- カラー出力 (`chalk` パッケージ）
- プログレスバー表示
- より詳細なモード説明
- インタラクティブなセッション選択UI

## 実装順序の推奨

### Week 1: 基盤構築
1. プロジェクトセットアップ（フェーズ1）
2. ディレクトリ構造と型定義（フェーズ2）
3. 設定システム実装（フェーズ3）

### Week 2: ツールシステム
4. ユーティリティ実装（フェーズ4.1）
5. 読み取り系ツール実装（readFile, list, search）（フェーズ4.2前半）
6. 書き込み系ツール実装（writeFile, editFile）（フェーズ4.2後半）
7. ツールレジストリ（フェーズ4.3）

### Week 3: メモリとCLI
8. データモデルとDB初期化（フェーズ5.1, 5.2）
9. SQLクエリ実装（フェーズ5.3）
10. メモリマネージャー（フェーズ5.4）
11. システムプロンプト（フェーズ6）

### Week 4: 統合とテスト
12. メインCLI実装（フェーズ7）
13. 基本機能テスト（フェーズ8.1）
14. マルチファイル編集テスト（フェーズ8.2）
15. 最適化と改善（フェーズ9）

## Go版との主な違い

### 1. AI SDK統合

**Go版:**
```go
resp, err := client.CreateChatCompletion(ctx, openai.ChatCompletionRequest{
  Model: model,
  Messages: messages,
  Tools: toolSchemas,
})
```

**TypeScript版:**
```typescript
const result = await generateText({
  model: openai(config.model),
  messages: history,
  tools: tools,
  maxSteps: 10,
});
```

AI SDKは自動的にツールループを処理するため、Go版の手動ループ実装が不要。

### 2. ファイルシステムAPI

**Go版:** `os`, `io`, `filepath` パッケージ
**TypeScript版:** `fs/promises`, `path` モジュール

### 3. SQLiteライブラリ

**Go版:** `modernc.org/sqlite` (CGO不要)
**TypeScript版:** `better-sqlite3` (同期API、高速)

### 4. ユーザー入力

**Go版:** `bufio.Scanner`
**TypeScript版:** `readline` モジュール or `inquirer` パッケージ

## 追加の改善案

### オプション機能

1. **設定ファイルの拡張**
   - カスタムシステムプロンプトの読み込み
   - デフォルトモードの設定
   - ツールのON/OFF切り替え

2. **ロギングシステム**
   - ツール実行ログのファイル出力
   - デバッグモードの追加

3. **プラグインシステム**
   - カスタムツールの動的読み込み
   - サードパーティツールの統合

4. **Web UI（将来的）**
   - Next.js + AI SDK UIでWebインターフェース
   - ブラウザベースの会話管理

## まとめ

この計画に従うことで、Go版nebulaの全機能をTypeScript + AI SDKで再実装できます。AI SDKの自動ツールループ機能により、Go版よりもシンプルな実装になることが期待されます。

**推定実装時間:** 20-30時間（週4-5時間 x 4週間）

**学習効果:**
- AI SDKの深い理解
- TypeScriptの型システム活用
- SQLiteとの統合
- CLIツール開発のベストプラクティス
