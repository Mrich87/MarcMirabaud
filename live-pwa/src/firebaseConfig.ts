// Public Firebase web-app configuration.
//
// This is intentionally committed: a Firebase web config is not a secret
// (access control is enforced by database security rules, not by hiding
// these values). Fill it in from the Firebase console:
// Project settings > General > Your apps > SDK setup and configuration.
export const firebaseConfig = {
  apiKey: '',
  authDomain: '',
  databaseURL: '',
  projectId: '',
  appId: '',
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.databaseURL && firebaseConfig.projectId,
);
