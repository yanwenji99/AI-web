export const providerASelectors = {
  input: "textarea",
  sendButton: "button[type='submit']",
  messageItem: "[data-message-role='assistant']",
  // Override with PROVIDER_A_LOGIN_REQUIRED_SELECTOR if target site uses different login UI.
  loginRequired: "input[type='password'], button:has-text('Log in'), button:has-text('Sign in')",
  // Optional loading indicator; empty string means no indicator check.
  responseLoading: ""
};
