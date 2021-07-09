const admin = require("firebase-admin");
const fs = require("fs");

const CLI = require("clui");
const Spinner = CLI.Spinner;
const chalk = require("chalk");
const randomUid = () =>
  Date.now().toString(36) + Math.random().toString(36).substr(2);

const initializeApp = (serviceAccountFile) => {
  console.log(chalk.grey(serviceAccountFile));

  var serviceAccount = fs.readFileSync(`./${serviceAccountFile}`, {
    encoding: "utf8",
  });
  const serviceAccountJSON = JSON.parse(serviceAccount);

  let app;
  if (admin.apps[0]) {
    app = admin.apps[0];
  } else {
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccountJSON),
      databaseURL: `https://${serviceAccountJSON.project_id}.firebaseio.com`,
    });
  }
  const auth = app.auth();
  const db = app.firestore();
  return { auth, db };
};

module.exports.setUserRoles = (serviceAccountFile) => async (email, roles) => {
  try {
    const { auth } = initializeApp(serviceAccountFile);
    // Initialize Auth
    // sets the custom claims on an account to the claims object provided
    const user = await auth.getUserByEmail(email);
    await auth.setCustomUserClaims(user.uid, { ...user.customClaims, roles });
    return {
      success: true,
      message: `\n✅ ${chalk.bold(email)} has the roles: ${chalk.bold(
        roles.join(", ")
      )}`,
    };
  } catch (error) {
    return {
      success: false,
      code: "auth/user-not-found",
      message: error.message,
    };
  }
};

module.exports.getUserRoles = (serviceAccountFile) => async (email) => {
  try {
    const { auth } = initializeApp(serviceAccountFile);
    // Initialize Auth
    // sets the custom claims on an account to the claims object provided
    const user = await auth.getUserByEmail(email);
    const roles = user.customClaims.roles;
    if (!roles || roles.length === 0) {
      return {
        success: false,
        message: `\n${chalk.bold(email)} has no roles`,
      };
    }
    return {
      success: true,
      message: `\n${chalk.bold(email)} has the roles: ${chalk.bold(
        roles.join(", ")
      )}`,
    };
  } catch (error) {
    return {
      success: false,
      code: "auth/user-not-found",
      message: error.message,
    };
  }
};

module.exports.createUser = (serviceAccountFile) => async (
  email,
  roles,
  displayName
) => {
  try {
    const { auth } = initializeApp(serviceAccountFile);
    // Initialize Auth
    // sets the custom claims on an account to the claims object provided

    await auth.importUsers([
      {
        displayName,
        uid: randomUid(),
        email,
        // set users roles
        customClaims: { roles },
      },
    ]);
    return {
      success: true,
      message: `\n✅ Successfully created ${chalk.bold(
        email
      )} and with the following roles: ${chalk.bold(roles.join(", "))}`,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
};

module.exports.getProjectTables = (serviceAccountFile) => async () => {
  try {
    const status = new Spinner("Fetching Firetable collections");
    status.start();
    // Initialize DB
    const { db } = initializeApp(serviceAccountFile);

    // sets the custom claims on an account to the claims object provided
    const tablesDoc = await db.doc("_FIRETABLE_/settings").get();
    status.stop();

    return tablesDoc
      .data()
      ["tables"].filter((table) => !table.isCollectionGroup);
    // return {
    //   success: true,
    //   message: `✅ ${email} now has the following roles ✨${roles.join(
    //     " & "
    //   )}✨`,
    // };
  } catch (error) {
    throw new Error(error.message);
  }
};
