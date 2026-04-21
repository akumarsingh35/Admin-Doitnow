interface GoogleCredentialResponse {
  credential: string;
  select_by?: string;
}

interface GooglePromptMomentNotification {
  isNotDisplayed(): boolean;
  isSkippedMoment(): boolean;
  isDismissedMoment?(): boolean;
  getNotDisplayedReason?(): string;
  getSkippedReason?(): string;
  getDismissedReason?(): string;
}

interface GoogleAccountsId {
  initialize(options: {
    client_id: string;
    use_fedcm_for_prompt?: boolean;
    callback: (response: GoogleCredentialResponse) => void;
  }): void;
  prompt(momentListener?: (notification: GooglePromptMomentNotification) => void): void;
  cancel?(): void;
}

interface GoogleAccounts {
  id: GoogleAccountsId;
}

interface GoogleGlobal {
  accounts: GoogleAccounts;
}

interface Window {
  google: GoogleGlobal;
}
