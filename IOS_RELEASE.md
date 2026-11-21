# PeakPay iOS release guide (EAS → TestFlight → App Store)

PeakPay's iOS app is built and uploaded by Expo's EAS service in the cloud. **No Xcode and no Mac build setup are needed.** The Apple account owner does a one-time setup (about 30 minutes). After that, one command builds the app and sends it to TestFlight.

- **App ID (bundle identifier):** `com.peakpay.app`
- **Expo project:** `@peakpay-org/peak-pay` (organization `peakpay-org`): https://expo.dev/accounts/peakpay-org/projects/peak-pay
- **Build + upload command:** `npm run submit-ios` (runs `eas build --platform ios --profile production --auto-submit`)

| Who | Does what | How often |
| --- | --- | --- |
| Apple account owner | Apple membership, create the app, create an API key, give the key to EAS | Once |
| Anyone with Expo project access | Run `npm run submit-ios` | Every release |
| Apple account owner or App Manager | Add testers, fill the store listing, submit for review | Each App Store release |

---

## 1. Before you start

- [ ] **Apple Developer Program membership** on the owner's Apple ID (USD 99 a year): https://developer.apple.com/programs/
  - A loan app should be enrolled as an **Organization** (a company, which needs a D-U-N-S number), not an Individual. Apple expects financial-services apps to come from the company that provides the service.
- [ ] **Membership of the Expo organization** `peakpay-org` on https://expo.dev. Running builds needs the **Developer** role or higher. Adding the Apple API key (step 4) needs **Admin** or **Owner**.
- [ ] **Node.js 18 or newer** on whichever computer runs the command. No Xcode, no CocoaPods.
- [ ] **The code:** this repo (`peak-pay-mobile`, branch `sync-with-web`), then `npm install` once.

---

## 2. One-time setup (Apple account owner)

These four steps let EAS sign and upload the app. After them, nobody needs to log in to Apple again to ship a build.

### Step 1: Register the app ID `com.peakpay.app`
1. Go to [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list) → **Identifiers** → **+** → **App IDs** → **App**.
2. Description: `PeakPay`. Bundle ID: **Explicit**, `com.peakpay.app`. Leave the capabilities at their defaults, then **Register**.

(EAS can also create this for you on the first build if you sign in to Apple when it asks.)

### Step 2: Create the app in App Store Connect
1. Go to [App Store Connect](https://appstoreconnect.apple.com) → **Apps** → **+** → **New App**.
2. Platform: **iOS**. Name: `PeakPay` (must be unique on the App Store). Primary language: English. Bundle ID: `com.peakpay.app`. SKU: `peakpay-ios`. User access: Full.
3. Open the app → **App Information** and copy the **Apple ID**, a number like `6741234567`. Send it to the developer; it goes into `eas.json` (see section 3).

### Step 3: Create an App Store Connect API key
1. App Store Connect → **Users and Access** → **Integrations** → **App Store Connect API** → **Team Keys** → **+**.
2. Name: `EAS`. Access: **App Manager**. Click **Generate**.
3. **Download the `.p8` file.** Apple lets you download it **only once**, so keep it safe.
4. Write down the **Key ID** (next to the key) and the **Issuer ID** (at the top of the page).

### Step 4: Give the key to EAS
Pick one:
- **On the website (no code needed):** https://expo.dev → organization `peakpay-org` → **Credentials** → **App Store Connect API Keys** → **Add**. Upload the `.p8` and enter the Key ID and Issuer ID.
- **From this code folder:**
  ```bash
  npx eas-cli login          # any account that is Admin/Owner in peakpay-org
  npx eas-cli credentials -p ios
  # choose: production → App Store Connect: Manage your API Key → Add a new API Key
  ```

On the first build, EAS also creates the iOS **distribution certificate** and **provisioning profile** using this key. Accept its defaults.

When steps 1–4 are done, send the developer the **Apple ID** from step 2 and confirm the key is in EAS.

---

## 3. Developer: one-time config

Put the App Store Connect Apple ID in `eas.json`, so the upload never stops to ask questions:

```json
"submit": {
  "production": {
    "ios": {
      "ascAppId": "6741234567"
    }
  }
}
```

(Replace `6741234567` with the real Apple ID from step 2.)

---

## 4. Every release: build and send to TestFlight

```bash
npm install          # first time, or after pulling new code
npm run submit-ios
```

What happens:
1. EAS uploads the code and builds the `.ipa` on a cloud Mac, which takes about 15–30 minutes. The build number goes up automatically.
2. The finished `.ipa` is kept on **expo.dev → peakpay-org → peak-pay → Builds**, where you can download it any time.
3. `--auto-submit` uploads it to **App Store Connect**.
4. Apple processes it for about 10–30 minutes. It then shows in App Store Connect → the app → **TestFlight**, and Apple sends an email.

Useful commands:

| Command | What it does |
| --- | --- |
| `npm run submit-ios` | Build in the cloud and upload to TestFlight |
| `npx eas-cli build -p ios --profile production` | Build only, no upload |
| `npx eas-cli submit -p ios --latest` | Upload the latest finished build |
| `npx eas-cli build:list -p ios` | See past builds and their status |

To ship a new **App Store version** (for example 1.0.1), change `"version"` in `app.json` first. The build number is handled for you.

---

## 5. TestFlight testers

- **Internal testers** (people on your Apple team, up to 100): App Store Connect → the app → **TestFlight** → **Internal Testing** → **+** → add them. They install the **TestFlight** app on their iPhone and get the build straight away.
- **External testers** (anyone, by email or a public link, up to 10,000): **External Testing** → create a group → add the build. The first build needs a short Apple **beta review**, usually within a day.

---

## 6. Submitting to the App Store

In App Store Connect → the app → the version under **iOS App**:

- [ ] **Screenshots:** at least the 6.9" iPhone size (1320 × 2868), 3 to 10 images.
- [ ] **Description, keywords, support URL, marketing URL.**
- [ ] **Privacy policy URL:** https://www.mypeakpay.com/privacy (or the current one).
- [ ] **App Privacy** questions (what data you collect: name, contact details, financial info, photos for identity checks, and so on).
- [ ] **Age rating** questionnaire.
- [ ] **Build:** pick the TestFlight build to release.
- [ ] **App Review information:** a **demo login that works end to end**. Apple's reviewer cannot pass BVN or a live Smile ID selfie, so give them an account that has **already finished KYC**, plus clear notes on how to reach the loan screens.
- [ ] **Submit for Review.** Review usually takes 1–3 days.

### Rules Apple checks for loan apps
- The app must show the **APR, all fees and the repayment dates** clearly before the customer accepts a loan.
- Apple does not allow a maximum APR above **36%**, or apps that require full repayment in **60 days or less**.
- Financial-services apps should be published from the **company's** (Organization) developer account.

---

## 7. Troubleshooting

| Problem | Fix |
| --- | --- |
| EAS asks for an Apple ID / password / 2FA code | The API key isn't in EAS yet: do step 4. |
| "Bundle identifier is not available" | `com.peakpay.app` is taken or not registered on your team: do step 1 on the right Apple team. |
| "No app found for bundle identifier" when uploading | The app record is missing: do step 2. |
| Build is in TestFlight but says **Missing Compliance** | It shouldn't, because `usesNonExemptEncryption: false` is set in `app.json`. If it does, answer **No** to "uses non-exempt encryption". |
| Build failed on EAS | Open the build page on expo.dev and read the failing step's log. Send it to the developer. |
| Need the `.ipa` file itself | expo.dev → peakpay-org → peak-pay → Builds → the build → **Download**. |
