/**
 * Production environment values. Swapped in for `environment.ts` by the
 * production build's `fileReplacements` (see angular.json).
 */
export const environment = {
  production: true,

  /**
   * Base URL of the backend API. Production points at the live backend.
   */
  apiBaseUrl: 'https://invoicegen-01.onrender.com',

  /**
   * Google Identity Services OAuth client ID for "Continue with Google".
   * SWAP THIS PER ENVIRONMENT — production should use its own OAuth client
   * whose authorized JavaScript origins match the production origin. It is
   * currently set to the same client as dev; replace it with the production
   * client ID before deploying.
   */
  googleClientId: '43185216455-39d6tfkbub5drh5ihcgmcs5h0smhnk33.apps.googleusercontent.com',
};
