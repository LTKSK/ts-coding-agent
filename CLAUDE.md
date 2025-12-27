# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

Go言語で実装された自律的コーディングエージェント「nebula」をTypeScript + Vercel AI SDKに移行するプロジェクト。AI SDKの`generateText`関数とカスタムツールシステムを使用した、ファイル操作が可能な対話型CLIエージェント。

## 開発コマンド

```bash
# 開発モードで実行（ホットリロード）
npm run dev

# TypeScriptのビルド
tsc

# ビルドした成果物を実行
node dist/main.js
```

## コアアーキテクチャ

### 1. ツールシステム (src/tools/)

AI SDKの`tool()`関数でツールを定義し、エージェントがファイルシステム操作を実行できるようにする。

**重要な型定義 (src/tools/types.ts):**
- `ToolDefinition`: AI SDKの`Tool`型とexecute関数を持つ
- `ToolResult`: ツール実行結果の標準フォーマット（success, content, files, errorフィールド）

**実装予定のツール:**
- `readFile`: ファイル内容の読み込み（UTF-8検証付き）
- `list`: ディレクトリ一覧の取得（再帰オプション付き）
- `searchInDirectory`: キーワードによるファイル検索
- `writeFile`: 新規ファイル作成（ユーザー許可プロンプト必須）
- `editFile`: 既存ファイルの編集（Read-Modify-Writeパターン）

### 2. モードシステム

**PLANモード:**
- 読み取り専用ツール（readFile, list, searchInDirectory）のみ利用可能
- コードの探索と計画立案に使用

**AGENTモード:**
- 全ツールが利用可能（writeFile, editFileを含む）
- 実際のファイル変更を実行

### 3. AI SDK統合

Vercel AI SDKの`generateText`を使用し、以下の利点を活用:
- `maxSteps`パラメータで自動的にツール実行ループを処理
- ツール呼び出しとレスポンスを自動管理
- モードに応じてツールセットを動的に切り替え

### 4. メモリシステム (src/memory/ - 実装予定)

**データベース: better-sqlite3**
- セッション管理: プロジェクトパスごとに会話履歴を保存
- メッセージ履歴: role, content, tool_call_idを含むメッセージを永続化
- セッション復元: 過去の会話を継続可能

**テーブル構造:**
- `sessions`: id, project_path, started_at, last_active_at
- `messages`: id, session_id, role, content, tool_call_id, created_at

### 5. TypeScript設定

- **Module System**: `nodenext`（ES Modules対応）
- **Target**: `esnext`
- **Strict Mode**: 有効（厳密な型チェック）
- **出力先**: `dist/`ディレクトリ

## 依存パッケージ

**コア依存:**
- `ai`: Vercel AI SDK（generateText, tool関数）
- `@ai-sdk/openai`: OpenAI provider
- `better-sqlite3`: SQLiteデータベース（同期API）
- `dotenv`: 環境変数管理

**開発依存:**
- `tsx`: TypeScript実行・ホットリロード
- `@biomejs/biome`: リンター・フォーマッター
- `@types/node`, `@types/better-sqlite3`: 型定義

## 実装パターン

### ツール定義の標準形式

```typescript
import { tool } from 'ai';
import { z } from 'zod';

export const exampleTool = tool({
  description: 'ツールの説明',
  parameters: z.object({
    param: z.string().describe('パラメータの説明'),
  }),
  execute: async ({ param }) => {
    // 実装
    return 'result';
  },
});
```

### AI SDK generateTextの標準呼び出し

```typescript
const result = await generateText({
  model: openai(config.model),
  system: getSystemPrompt(currentMode),
  messages: history,
  tools: currentMode === 'AGENT' ? allTools : readOnlyTools,
  maxSteps: 10, // ツール実行の最大ループ回数
});
```

## 設計原則

1. **Read-Modify-Writeパターン**: ファイル編集時は必ずreadFile → 内容変更 → editFileの順で実行
2. **ユーザー許可**: writeFile/editFile実行前に必ずユーザーに確認を取る
3. **UTF-8検証**: ファイル読み込み時にエンコーディングを検証し、無効な文字を処理
4. **エラーハンドリング**: ツール実行結果は必ずToolResult形式で返し、エラー情報を含める
5. **セッション管理**: 会話履歴をSQLiteに永続化し、プロジェクトごとにコンテキストを保持

## プロジェクト状態

現在の実装状況:
- ✅ プロジェクトセットアップ完了
- ✅ 基本型定義（src/tools/types.ts）
- ⏳ メインCLI（src/main.ts - 骨格のみ）
- ⏳ 設定システム（src/config/config.ts - ファイルのみ）
- ⏳ システムプロンプト（src/prompts/system.ts - ファイルのみ）
- ❌ ツール実装（未着手）
- ❌ メモリシステム（未着手）

詳細な実装計画は`plan.md`を参照。
