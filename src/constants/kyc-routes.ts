import { getKycSteps, useKYCStore } from '@/store/useKYCStore';

// The screen for each KYC step id used by useKYCStore. The liveness selfie is
// checked against the BVN typed on the BVN screen (bvn -> liveness-intro ->
// smileid-verify), so liveness starts there too.
export const KYC_STEP_ROUTES = {
  phone: '/kyc/phone',
  bvn: '/kyc/bvn',
  liveness: '/kyc/bvn',
  nin: '/kyc/nin',
  nextOfKin: '/kyc/next-of-kin',
  employment: '/kyc/employment',
  pep: '/kyc/pep-details',
  bankDetails: '/kyc/bank-details',
  transactionPin: '/kyc/create-pin',
} as const;

type StepId = keyof typeof KYC_STEP_ROUTES;

// The first incomplete step's screen, or null when KYC is done. Uses the
// backend's next step (activeStepId) when it is still incomplete.
export function nextKycRoute(): string | null {
  const state = useKYCStore.getState();
  const steps = getKycSteps(state);
  const active = steps.find((step) => step.id === state.activeStepId && !step.completed);
  const next = active ?? steps.find((step) => !step.completed);
  return next ? KYC_STEP_ROUTES[next.id as StepId] : null;
}

// The screen after `stepId`, skipping steps that are already done; '/(tabs)'
// when nothing is left.
export function routeAfterKycStep(stepId: StepId): string {
  const steps = getKycSteps(useKYCStore.getState());
  const index = steps.findIndex((step) => step.id === stepId);
  const next = steps.slice(index + 1).find((step) => !step.completed);
  return next ? KYC_STEP_ROUTES[next.id as StepId] : '/(tabs)';
}
