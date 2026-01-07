// memory/test.ts - メモリシステムの動作確認スクリプト

import * as fs from 'node:fs';
import { Manager } from './manager.js';

const TEST_DB_PATH = './data/test-memory.db';
const TEST_PROJECT_PATH = '/test/project';

// テスト用データベースをクリーンアップ
function cleanupTestDB() {
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
    console.log('✓ 既存のテストDBを削除しました');
  }
}

// セパレーター出力
function separator(title: string) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`  ${title}`);
  console.log('='.repeat(50));
}

// メイン処理
async function main() {
  console.log('🚀 メモリシステム動作確認テスト\n');

  // 1. テスト準備
  separator('1. テスト準備');
  cleanupTestDB();

  const manager = Manager.create(TEST_DB_PATH);
  console.log('✓ Managerを作成しました');
  console.log(`  データベース: ${TEST_DB_PATH}`);

  // 2. セッション作成
  separator('2. セッション作成');
  const session1 = manager.startSession(TEST_PROJECT_PATH, 'gpt-4');
  console.log('✓ セッション1を作成しました');
  console.log(`  ID: ${session1.id}`);
  console.log(`  プロジェクト: ${session1.projectPath}`);
  console.log(`  モデル: ${session1.modelUsed}`);
  console.log(`  アクティブ: ${session1.isActive()}`);

  // 3. メッセージ保存
  separator('3. メッセージ保存');
  const msg1 = manager.saveMessage('user', 'こんにちは、AIエージェント！');
  console.log(`✓ メッセージ1を保存しました (ID: ${msg1})`);

  const msg2 = manager.saveMessage('assistant', 'こんにちは！何かお手伝いできることはありますか？');
  console.log(`✓ メッセージ2を保存しました (ID: ${msg2})`);

  const msg3 = manager.saveMessage('user', 'ファイル一覧を取得してください');
  console.log(`✓ メッセージ3を保存しました (ID: ${msg3})`);

  // ツール呼び出しを含むメッセージ
  const toolCall = JSON.stringify({
    tool: 'list',
    args: { path: '.', recursive: false }
  });
  const msg4 = manager.saveMessage('assistant', 'ファイル一覧を取得します', toolCall);
  console.log(`✓ メッセージ4を保存しました (ID: ${msg4}) [ツール呼び出し付き]`);

  // ツール結果
  const toolResult = JSON.stringify({
    success: true,
    files: ['index.ts', 'README.md', 'package.json']
  });
  const msg5 = manager.saveMessage('tool', '', null, toolResult);
  console.log(`✓ メッセージ5を保存しました (ID: ${msg5}) [ツール結果]`);

  const msg6 = manager.saveMessage('assistant', '以下のファイルが見つかりました:\n- index.ts\n- README.md\n- package.json');
  console.log(`✓ メッセージ6を保存しました (ID: ${msg6})`);

  // 4. メッセージ取得
  separator('4. メッセージ取得');
  const messages = manager.getSessionMessages(session1.id);
  console.log(`✓ ${messages.length}件のメッセージを取得しました\n`);

  for (const msg of messages) {
    console.log(`[${msg.role.padEnd(9)}] ${msg.content.substring(0, 50)}${msg.content.length > 50 ? '...' : ''}`);
    if (msg.toolCalls) {
      console.log(`              ツール呼び出し: ${msg.toolCalls.substring(0, 40)}...`);
    }
    if (msg.toolResults) {
      console.log(`              ツール結果: ${msg.toolResults.substring(0, 40)}...`);
    }
  }

  // 5. セッション終了
  separator('5. セッション終了');
  manager.endSession();
  console.log('✓ セッション1を終了しました');
  console.log(`  アクティブ: ${session1.isActive()}`);
  console.log(`  継続時間: ${session1.duration()}ミリ秒`);

  // 6. 2つ目のセッション作成
  separator('6. 2つ目のセッション作成');
  // 少し待機してタイムスタンプが異なるようにする
  await new Promise(resolve => setTimeout(resolve, 1100));

  const session2 = manager.startSession(TEST_PROJECT_PATH, 'gpt-3.5-turbo');
  console.log('✓ セッション2を作成しました');
  console.log(`  ID: ${session2.id}`);

  manager.saveMessage('user', '新しいセッションです');
  manager.saveMessage('assistant', '新しいセッションを開始しました');
  console.log('✓ メッセージを2件保存しました');

  manager.endSession();
  console.log('✓ セッション2を終了しました');

  // 7. セッション一覧取得
  separator('7. セッション一覧取得');
  const summaries = manager.getSessionsByProject(TEST_PROJECT_PATH);
  console.log(`✓ ${summaries.length}件のセッションを取得しました\n`);

  for (const summary of summaries) {
    console.log(`セッション: ${summary.id}`);
    console.log(`  モデル: ${summary.modelUsed}`);
    console.log(`  メッセージ数: ${summary.messageCount}`);
    console.log(`  最後のメッセージ: ${summary.lastMessage}`);
    console.log(`  アクティブ: ${summary.endedAt === null ? 'はい' : 'いいえ'}`);
    console.log('');
  }

  // 8. 最近のセッション取得
  separator('8. 最近のセッション取得');
  const recentSessions = manager.getRecentSessions(5);
  console.log(`✓ 最近の${recentSessions.length}件のセッションを取得しました\n`);

  for (const summary of recentSessions) {
    console.log(`- ${summary.id} (${summary.projectPath})`);
  }

  // 9. セッション復元
  separator('9. セッション復元');
  const restoredSession = manager.restoreSession(session1.id);
  console.log('✓ セッション1を復元しました');
  console.log(`  ID: ${restoredSession.id}`);
  console.log(`  メッセージ数: ${manager.getSessionMessages(restoredSession.id).length}`);

  const currentSession = manager.getCurrentSession();
  console.log(`✓ 現在のセッション: ${currentSession?.id}`);

  // 10. セッション削除
  separator('10. セッション削除');
  manager.deleteSession(session2.id);
  console.log(`✓ セッション2を削除しました (${session2.id})`);

  const remainingSessions = manager.getSessionsByProject(TEST_PROJECT_PATH);
  console.log(`✓ 残りのセッション数: ${remainingSessions.length}`);

  // 11. クリーンアップ
  separator('11. クリーンアップ');
  manager.close();
  console.log('✓ Managerをクローズしました');

  // テスト完了
  separator('✅ テスト完了');
  console.log('すべての動作確認が正常に完了しました！');
  console.log(`\nテストデータベース: ${TEST_DB_PATH}`);
  console.log('データベースファイルは残っているので、SQLiteクライアントで直接確認できます。');
  console.log('\n削除する場合: rm ./data/test-memory.db\n');
}

// 実行
main().catch((error) => {
  console.error('\n❌ エラーが発生しました:');
  console.error(error);
  process.exit(1);
});
