interface GoogleCredentialResponse {
  credential: string;
  select_by?: string;
}

interface GoogleGsiButtonConfiguration {
  type?: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  logo_alignment?: 'left' | 'center';
  width?: number | string;
  locale?: string;
}

interface GoogleAccountsId {
  initialize(options: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    context?: 'signin' | 'signup' | 'use';
    ux_mode?: 'popup' | 'redirect';
    /** Opt in to Federated Credential Management for One Tap. */
    use_fedcm_for_prompt?: boolean;
    /** Opt in to FedCM for the Sign in with Google button flow. */
    use_fedcm_for_button?: boolean;
    button_auto_select?: boolean;
  }): void;
  renderButton(parent: HTMLElement, options?: GoogleGsiButtonConfiguration): void;
  prompt(momentListener?: (notification: GooglePromptMomentNotification) => void): void;
  cancel?(): void;
  disableAutoSelect?(): void;
}

/**
 * FedCM-safe prompt moment APIs only.
 * Do not use: isDisplayMoment, isDisplayed, isNotDisplayed, getNotDisplayedReason, getSkippedReason.
 */
interface GooglePromptMomentNotification {
  isSkippedMoment(): boolean;
  isDismissedMoment(): boolean;
  getDismissedReason(): string;
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
