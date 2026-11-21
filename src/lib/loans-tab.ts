import { StackActions } from '@react-navigation/native';

// Just what openLoansTab needs from expo-router's useNavigation().
type Nav = {
  getState(): { type?: string } | undefined;
  getParent(): Nav | undefined;
  navigate(name: string): void;
  dispatch(action: ReturnType<typeof StackActions.popTo>): void;
};

// The Loans tab (app/(tabs)/loans.tsx, Manage Loan) and the application flow
// (app/loans/) both live at the URL /loans, so router.push('/(tabs)/loans')
// lands on the flow's first screen, start. Go to the tab by navigator name.
export function openLoansTab(navigation: unknown) {
  let nav = navigation as Nav | undefined;
  while (nav) {
    // From another tab: just switch tabs.
    if (nav.getState()?.type === 'tab') {
      nav.navigate('loans');
      return;
    }
    const parent = nav.getParent();
    if (!parent) break;
    nav = parent;
  }
  // From a loan flow screen: close the flow back to the tabs, on Loans.
  nav?.dispatch(StackActions.popTo('(tabs)', { screen: 'loans' }));
}
