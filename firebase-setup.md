# Firebase設定ガイド

このアプリはFirebase Analyticsでアプリの利用状況を集計し、Firebase Crashlyticsでクラッシュを収集します。Firebase SDKはネイティブ機能を使うため、Expo Goでは動作せず、iOSネイティブビルドが必要です。

このプロジェクトではReact Native FirebaseがFirebase iOS SDKをSwift Package Manager経由で追加し、Firebaseの初期化も行います。Firebase Consoleの「XcodeでAdd Packages」やSwiftの初期化コードを手作業で追加する必要はありません。ExpoのiOSプロジェクトはビルド時に生成されるため、Xcodeでの手動変更は再生成時に失われることがあります。

## Firebase Consoleの設定

1. Firebase Consoleでプロジェクトを作成します。
2. Google Analyticsを有効にします。Analyticsの「アクティブユーザー」でDAUを確認できます。
3. iOSアプリを追加し、Bundle IDに `com.henbryant.proboxertimmer` を指定します。
4. `GoogleService-Info.plist` をダウンロードし、リポジトリ直下に配置します。`app.json` は `./GoogleService-Info.plist` を参照します。
5. Firebase ConsoleでAnalyticsとCrashlyticsを有効にします。

Firebaseプロジェクトの設定ファイルにはアプリを識別する情報が含まれます。FirebaseのAPIキーはクライアントアプリ内で使われるもので、サーバー秘密鍵とは異なります。Firebase ConsoleでAPIキーの利用制限を設定し、サーバー用秘密鍵はアプリやリポジトリに追加しないでください。

## 開発ビルドと動作確認

1. `GoogleService-Info.plist` をリポジトリ直下に置き、EASにログインします。

```sh
npx eas-cli login
```

2. 実機用の開発ビルドを作成します。初回はEASの案内に従ってAppleアカウントとテスト端末を登録してください。Apple Developerアカウントがまだない場合は、ローカルのiOS Simulatorで確認するか、EASのシミュレーター用ビルドを使えます。

```sh
npx eas-cli build --platform ios --profile development
```

3. インストールした開発ビルドを起動し、Metroを開発クライアント向けに起動します。

```sh
npx expo start --dev-client
```

EASでApple DeveloperアカウントなしにiOS Simulator用ビルドを作る場合は、次のプロファイルを指定します。EASへのログインは必要です。

```sh
npx eas-cli build --platform ios --profile development-simulator
```

CrashlyticsはDebugビルドでは既定で無効です。クラッシュの受信は以下のTestFlight手順で確認します。

リリース後はFirebase ConsoleのAnalyticsレポートで「アクティブユーザー」を見てDAUを確認し、Crashlyticsでクラッシュや影響ユーザーを確認します。

## TestFlightへの提出

App Store Connectにアプリを作成し、Apple Developer Programの利用資格を用意したうえで、productionビルドを作成して提出します。

```sh
npx eas-cli build --platform ios --profile production --auto-submit
```

処理が完了したら、対象のビルドを内部テストに追加してiPhoneにインストールします。

1. **同意** — クリーンインストールし、未選択と「共有しない」の状態でタイマーを使えることを確認します。設定右上の情報アイコンから「利用状況とクラッシュの共有」を開いて許可し、再起動後も選択を保持することを確認します。「共有しない」に変更して再起動し、送信が止まることも確認します。Crashlytics の無効化は次回起動時に反映されます。
2. **Analytics** — 共有を許可した後にアプリを使い、Firebase ConsoleのAnalyticsのリアルタイムレポートで対象iOSアプリのイベントを確認します。確認は検証端末のイベントと区別できる時間帯で行い、通常の集計レポートへの反映には時間がかかることを考慮します。
3. **Crashlytics** — TestFlight の検証ビルド `1.0.0 (4)` で、共有許可後のテストクラッシュが Firebase に届くことを確認済みです。App Store 審査には `production` プロファイルで作成し、TestFlight でテストしたビルドを選びます。[検証ビルド](https://expo.dev/accounts/henbryant/projects/pro-boxer-timmer/builds/d1968b83-6c67-4d8d-91d7-254ac34cab08) · [Firebaseのテスト手順](https://firebase.google.com/docs/crashlytics/ios/test-implementation)

`--auto-submit` はビルドと同じ名前の提出プロファイルを使います。自動提出の設定で止まっても、EAS 上のビルドが `FINISHED` になれば、そのビルド ID を指定して再ビルドなしで提出できます。初回は対話モードで App Store Connect の認証を設定します。

```sh
npx eas-cli submit --platform ios --profile production --id "EASのビルドID"
```

## App Storeのプライバシー申告

Firebaseを利用するため、[プライバシーポリシー](docs/privacy-policy.md)を確認し、App Store ConnectのApp Privacy申告をFirebase SDKの最新のデータ収集情報に合わせて更新してください。AnalyticsやCrashlyticsが収集する利用状況・診断情報を申告し、広告目的のトラッキングは行わない設定にしています。

Firebase AnalyticsとCrashlyticsは通常の利用では追加料金なしで利用できます。料金条件は変更されることがあるため、[Firebase料金ページ](https://firebase.google.com/pricing)を確認してください。
