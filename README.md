# ProBoxerTimmer

ボクシングの練習中に、離れた位置からでも残り時間がひと目で分かるラウンドタイマーです。React Native と TypeScript を使った iOS アプリです。

## 練習の流れ

アプリを開くとタイマーが表示され、右上の再生アイコンで開始できます。初回は **3分・休憩30秒・3ラウンド**です。左上の歯車から設定を開き、ホイールで変更するか「初期値にリセット」を押します。「確定」で選んだ値をタイマーに反映します。ラウンドと休憩は自動で切り替わります。

1ラウンドは最長10分、1回の練習は最大12ラウンドです。練習を開始すると3項目を端末に保存し、次にアプリを起動したときに復元します。

## タイマー画面
| Timmer  | Settings |
| ------------- | ------------- |
| <img width="2622" height="1206" alt="Screenshot iPhone 18 Pro 2026-11-19 at 15 28 54" src="https://github.com/user-attachments/assets/5b26f4f9-01eb-4416-beeb-f30d6bc3ec95" />  |  <img width="2622" height="1206" alt="Screenshot iPhone 18 Pro 2026-11-19 at 15 29 06" src="https://github.com/user-attachments/assets/516835f5-805b-4768-a91b-ddb4e2e45bd0" /> |

横画面では、残り時間を赤い7セグメント数字で画面いっぱいに表示します。左上の歯車の隣に「Round 1/3」のように進行を表示し、右上に左から終了、リセット、開始・一時停止・再開のアイコンを配置しています。リセットすると第1ラウンドの開始前に戻ります。休憩に入ると休憩の残り時間に切り替わり、練習終了後は `0:00` を表示します。

タイマー表示中は端末の自動消灯を防ぎます。各ラウンドの開始・終了を、高く鋭い2打のリングベルで知らせます。

## ローカルで起動

Expo SDK 58 と React Native を使用します。FirebaseのネイティブSDKを使うため、Expo GoではなくiOSネイティブビルドが必要です。Node.js 24 LTS（24.3 以上）と npm、GoogleService-Info.plistを用意し、リポジトリ直下で実行してください。Firebaseの設定とビルド手順は[Firebase設定ガイド](firebase-setup.md)を参照してください。

```sh
npm ci
npx expo run:ios
```

ローカルでiOSビルドする場合は、MacにXcodeをインストールしてください。Firebaseを使う開発ビルドとTestFlight用ビルドはEAS Buildを使用します。手順は[Firebase設定ガイド](firebase-setup.md)を参照してください。

## 確認方法

```sh
npm run typecheck
npm test
```

Android・iOS 共通の動作と端末での確認手順は [要件定義書](docs/requirements.md) にまとめています。
