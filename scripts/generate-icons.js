/* eslint-disable */
// Builds every app icon, splash and store image from the PeakPay peak mark
// (the same vector as assets/svg/lighticon.js), using CanvasKit (Skia), which
// is already installed.
//
//   node scripts/generate-icons.js
//
// Writes into assets/images (used by app.json) and assets/store (images to
// upload to the App Store and Google Play by hand).

const fs = require('fs');
const path = require('path');

const ckDir = path.dirname(require.resolve('canvaskit-wasm/bin/canvaskit.js', {
  paths: [path.join(__dirname, '..'), path.join(__dirname, '../node_modules/.pnpm/canvaskit-wasm@0.41.0/node_modules')],
}));
const CanvasKitInit = require(path.join(ckDir, 'canvaskit.js'));

const ROOT = path.join(__dirname, '..');
const IMAGES = path.join(ROOT, 'assets/images');
const STORE = path.join(ROOT, 'assets/store');

// Brand
const ORANGE = '#FF7A00';
const ORANGE_DEEP = '#F25C05';
const ORANGE_LIGHT = '#FF9A2E';
const INK = '#1E1E1E';

// The peak mark: 42 x 40 viewBox.
const MARK_W = 42;
const MARK_H = 40;
const MARK_PATHS = [
  'M13.44 1.107 4.544 13.962 9.414.586a.904.904 0 0 1 .462-.505.895.895 0 0 1 .681-.026l2.883 1.052ZM18.052 2.457 5.689 14.85 14.29 2.425l.696-1.01a.9.9 0 0 1 .736-.386c.18 0 .356.056.503.16l1.827 1.268ZM34.95 16.295a.908.908 0 0 0 0-1.266L21.882 1.938a.895.895 0 0 0-.975-.196.875.875 0 0 0-.285.196L3.912 18.68.256 22.344a.902.902 0 0 0-.012 1.248l16.1 16.135a.926.926 0 0 0 1.312 0l3.628-3.636-2.39-2.394a.92.92 0 0 1 0-1.315L34.95 16.295ZM13.303 28.091l-4.455-4.454a.929.929 0 0 1 0-1.316l11.748-11.775a.926.926 0 0 1 1.312 0l4.448 4.458a.93.93 0 0 1 0 1.316L14.61 28.09a.926.926 0 0 1-1.306 0Z',
  'M41.039 16.293 22.426 34.95l-1.367-1.37a.929.929 0 0 1 0-1.315l1.246-1.25 13.66-13.695a2.332 2.332 0 0 0 0-3.308L25.316 3.336l1.398-1.398a.875.875 0 0 1 1.254 0l11.68 11.7 1.388 1.393a.896.896 0 0 1 .004 1.262Z',
];

let CK;

function color(hex, alpha = 1) {
  return CK.Color4f(
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255,
    alpha,
  );
}

function markPath() {
  return CK.Path.MakeFromSVGString(MARK_PATHS.join(' '));
}

// Draws the mark centred in a box of `size` px at (cx, cy).
function drawMark(canvas, { cx, cy, size, fill = '#FFFFFF', shadow = false }) {
  const scale = size / MARK_W;
  const path = markPath();
  canvas.save();
  canvas.translate(cx - (MARK_W * scale) / 2, cy - (MARK_H * scale) / 2);
  canvas.scale(scale, scale);
  if (shadow) {
    const sp = new CK.Paint();
    sp.setAntiAlias(true);
    sp.setColor(CK.Color4f(0.45, 0.15, 0, 0.28));
    sp.setMaskFilter(CK.MaskFilter.MakeBlur(CK.BlurStyle.Normal, 0.9, true));
    canvas.save();
    canvas.translate(0, 1.1);
    canvas.drawPath(path, sp);
    canvas.restore();
    sp.delete();
  }
  const paint = new CK.Paint();
  paint.setAntiAlias(true);
  paint.setColor(color(fill));
  canvas.drawPath(path, paint);
  canvas.restore();
  paint.delete();
  path.delete();
}

function brandBackground(canvas, w, h) {
  const paint = new CK.Paint();
  paint.setShader(CK.Shader.MakeLinearGradient(
    [0, 0], [w, h],
    [color(ORANGE_LIGHT), color(ORANGE), color(ORANGE_DEEP)],
    [0, 0.5, 1],
    CK.TileMode.Clamp,
  ));
  canvas.drawRect(CK.LTRBRect(0, 0, w, h), paint);
  paint.delete();
  // Soft highlight top-left for depth.
  const glow = new CK.Paint();
  glow.setShader(CK.Shader.MakeRadialGradient(
    [w * 0.25, h * 0.15], Math.max(w, h) * 0.7,
    [CK.Color4f(1, 1, 1, 0.18), CK.Color4f(1, 1, 1, 0)],
    null, CK.TileMode.Clamp,
  ));
  canvas.drawRect(CK.LTRBRect(0, 0, w, h), glow);
  glow.delete();
}

function render(file, w, h, draw) {
  const surface = CK.MakeSurface(w, h);
  const canvas = surface.getCanvas();
  canvas.clear(CK.TRANSPARENT);
  draw(canvas, w, h);
  const img = surface.makeImageSnapshot();
  const bytes = img.encodeToBytes(CK.ImageFormat.PNG, 100);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from(bytes));
  img.delete();
  surface.delete();
  console.log('  ', path.relative(ROOT, file), `${w}x${h}`);
}

// Opaque square icon: orange gradient + white mark (iOS, Play Store, legacy).
function appIcon(canvas, s) {
  brandBackground(canvas, s, s);
  // Nudge down slightly: the mark is visually top-heavy.
  drawMark(canvas, { cx: s / 2, cy: s * 0.5, size: s * 0.56, shadow: true });
}

(async () => {
  CK = await CanvasKitInit({ locateFile: (f) => path.join(ckDir, f) });

  console.log('App icons (assets/images):');
  render(path.join(IMAGES, 'icon.png'), 1024, 1024, (c, w) => appIcon(c, w));

  // Android adaptive icon: 108dp canvas, launcher masks to the inner ~66dp.
  // Keep the mark inside the centre 60% so no mask shape clips it.
  render(path.join(IMAGES, 'android-icon-foreground.png'), 1024, 1024, (c, s) =>
    drawMark(c, { cx: s / 2, cy: s / 2, size: s * 0.40, shadow: true }));
  render(path.join(IMAGES, 'android-icon-background.png'), 1024, 1024, (c, s) => brandBackground(c, s, s));
  render(path.join(IMAGES, 'android-icon-monochrome.png'), 1024, 1024, (c, s) =>
    drawMark(c, { cx: s / 2, cy: s / 2, size: s * 0.40 }));

  // Splash: white mark on transparent; background colour comes from app.json.
  render(path.join(IMAGES, 'splash-icon.png'), 1024, 1024, (c, s) =>
    drawMark(c, { cx: s / 2, cy: s / 2, size: s * 0.9 }));

  render(path.join(IMAGES, 'favicon.png'), 196, 196, (c, s) => {
    const r = CK.RRectXY(CK.LTRBRect(0, 0, s, s), s * 0.22, s * 0.22);
    c.save();
    c.clipRRect(r, CK.ClipOp.Intersect, true);
    appIcon(c, s);
    c.restore();
  });

  // In-app logo images (empty states, banners).
  render(path.join(IMAGES, 'logo-mark-white.png'), 512, 512, (c, s) =>
    drawMark(c, { cx: s / 2, cy: s / 2, size: s * 0.9 }));
  render(path.join(IMAGES, 'logo-mark-orange.png'), 512, 512, (c, s) =>
    drawMark(c, { cx: s / 2, cy: s / 2, size: s * 0.9, fill: ORANGE }));

  console.log('Store images (assets/store):');
  // App Store Connect: 1024x1024, opaque, no rounded corners (Apple rounds it).
  render(path.join(STORE, 'ios-app-store-icon-1024.png'), 1024, 1024, (c, w) => appIcon(c, w));
  // Google Play: 512x512 hi-res icon (Play applies its own mask).
  render(path.join(STORE, 'play-store-icon-512.png'), 512, 512, (c, w) => appIcon(c, w));
  // Google Play feature graphic: 1024x500.
  render(path.join(STORE, 'play-feature-graphic-1024x500.png'), 1024, 500, (c, w, h) => {
    brandBackground(c, w, h);
    drawMark(c, { cx: w / 2, cy: h / 2, size: 260, shadow: true });
  });
  // Handy extras for the website, socials and press.
  render(path.join(STORE, 'logo-mark-orange.png'), 1024, 1024, (c, s) =>
    drawMark(c, { cx: s / 2, cy: s / 2, size: s * 0.8, fill: ORANGE }));
  render(path.join(STORE, 'logo-mark-dark.png'), 1024, 1024, (c, s) =>
    drawMark(c, { cx: s / 2, cy: s / 2, size: s * 0.8, fill: INK }));
  render(path.join(STORE, 'logo-mark-white.png'), 1024, 1024, (c, s) =>
    drawMark(c, { cx: s / 2, cy: s / 2, size: s * 0.8 }));

  console.log('Done.');
})();
