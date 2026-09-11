/**
 * Development environment values. The production build swaps this file for
 * `environment.prod.ts` (see the `fileReplacements` in angular.json).
 */
export const environment = {
  production: false,

  /**
   * Google Identity Services OAuth client ID for "Continue with Google".
   * SWAP THIS PER ENVIRONMENT — each deployment (dev/staging/prod) should use
   * its own OAuth client, whose authorized origins match that origin. The
   * value below is the client for local/dev use.
   */
  googleClientId: '43185216455-39d6tfkbub5drh5ihcgmcs5h0smhnk33.apps.googleusercontent.com',
};
