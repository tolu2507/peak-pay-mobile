// Turns a SmileID SmartSelfie capture (run with skipApiSubmission) into the
// payload the backend's /kyc/biometric-verification/ expects: the same
// `{ images: [{ image_type_id, image }] }` the web camera publishes.

// SmileID image types: 2 = selfie, 6 = liveness frame, both base64 JPEG.
const SELFIE_IMAGE_TYPE = 2;
const LIVENESS_IMAGE_TYPE = 6;

// iOS sends { selfie, livenessImages: string[] }; Android sends
// { selfieFile, livenessFiles } with the list flattened to "[a, b]".
// Either may arrive wrapped in `result` or as a JSON string.
function readCapture(raw: unknown): { selfie: string; liveness: string[] } {
  let value: any = raw;
  if (typeof value === 'string') value = JSON.parse(value);
  if (value?.result) value = typeof value.result === 'string' ? JSON.parse(value.result) : value.result;

  const selfie: string | undefined = value?.selfie ?? value?.selfieFile;
  let liveness: unknown = value?.livenessImages ?? value?.livenessFiles ?? [];
  if (typeof liveness === 'string') {
    liveness = liveness.replace(/^\[|\]$/g, '').split(',').map((path) => path.trim()).filter(Boolean);
  }
  if (!selfie) throw new Error('The selfie could not be captured. Please try again.');
  return { selfie, liveness: liveness as string[] };
}

const toFileUri = (path: string) => (/^[a-z]+:\/\//i.test(path) ? path : `file://${path}`);

// Reads a local image as base64 without the data: prefix.
async function readBase64(path: string): Promise<string> {
  const blob = await (await fetch(toFileUri(path))).blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('The selfie could not be read. Please try again.'));
    reader.readAsDataURL(blob);
  });
  return dataUrl.slice(dataUrl.indexOf(',') + 1);
}

// JSON string accepted by useKYCStore.submitLiveness.
export async function smileCaptureToPayload(raw: unknown): Promise<string> {
  const { selfie, liveness } = readCapture(raw);
  const images = [
    { image_type_id: SELFIE_IMAGE_TYPE, image: await readBase64(selfie) },
    ...(await Promise.all(liveness.map(async (path) => ({
      image_type_id: LIVENESS_IMAGE_TYPE,
      image: await readBase64(path),
    })))),
  ];
  return JSON.stringify({ images });
}
