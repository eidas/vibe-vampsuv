# vibe-vampsuv

TypeScript + Phaser 3 で動くヴァンパイアサバイバーライクの最小プロトタイプです。

## セットアップと起動
```bash
npm install
npm run dev
```
`http://localhost:5173` にアクセスするとゲームが動作します。

## 操作
- **移動**: カーソルキー（WASD も併用可）
- プレイヤーは自動で投射攻撃を放ちます。敵に当てて経験値オーブを集め、レベルアップで攻撃間隔と敵出現速度が少しずつ変化します。

## GitHub Actions で GitHub Pages に公開する
TypeScript（Vite）で書いたコードを GitHub Actions 上で JavaScript にビルドし、GitHub Pages に配置するためのワークフローを用意しています。

1. リポジトリに含まれる [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) を main ブランチにプッシュします。
2. GitHub の **Settings → Pages** で Source を *GitHub Actions* に切り替えます。
3. 以降は main ブランチにプッシュされるたびに Actions が走り、以下の流れで自動デプロイされます。
   - `actions/setup-node` で Node.js 20 をセットアップ
   - `npm install` と `npm run build` で `dist/` に JavaScript/アセットを生成
   - 生成物を `actions/upload-pages-artifact` → `actions/deploy-pages` で Pages に配置
4. デプロイが完了すると Actions のジョブログに公開 URL が表示されます（`https://<ユーザー名>.github.io/<リポジトリ名>/`）。

> **メモ**: Vite で GitHub Pages（サブディレクトリ配信）に合わせるため、`vite.config.ts` の `base` にリポジトリ名（例: `/vibe-vampsuv/`）を設定しています。フォークして別名で公開する場合は `repoName` を差し替えてください。
