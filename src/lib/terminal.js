const exec = require("child_process").exec;
const spawn = require("child_process").spawn;
const chalk = require("chalk");

const CLI = require("clui");
const Spinner = CLI.Spinner;
// appId regex \d:[0-9]*:web:[0-z]*

// firetable app Regex │ firetable-app.*
function execute(command, callback) {
  exec(command, function (error, stdout, stderr) {
    //console.log({ error, stdout, stderr });
    callback(stdout);
  });
}

module.exports.getRequiredVersions = () =>
  new Promise((resolve) => {
    const checkingVersionsStatus = new Spinner(
      "Checking versions of required system packages"
    );

    checkingVersionsStatus.start();

    execute("git --version", function (git) {
      execute("node --version", function (node) {
        execute("yarn --version", function (yarn) {
          execute("firebase --version", function (firebase) {
            checkingVersionsStatus.stop();
            resolve({
              node: node ? node.match(/[0-9]*\.[0-9]*\.[0-9]/)[0] : "",
              git: git ? git.match(/[0-9]*\.[0-9]*\.[0-9]/)[0] : "",
              yarn: yarn ? yarn.match(/[0-9]*\.[0-9]*\.[0-9]/)[0] : "",
              firebase: firebase
                ? firebase.match(/[0-9]*\.[0-9]*\.[0-9]/)[0]
                : "",
            });
          });
        });
      });
    });
  });

module.exports.getGitUser = function (callback) {
  execute("git config --global user.name", function (name) {
    execute("git config --global user.email", function (email) {
      callback({
        name: name.replace("\n", ""),
        email: email.replace("\n", ""),
      });
    });
  });
};

module.exports.cloneFiretable = (dir = "firetable") =>
  new Promise((resolve) => {
    const cloningStatus = new Spinner("Cloning the Firetable repository");
    cloningStatus.start();
    execute(
      `git clone --depth 1 https://github.com/FiretableProject/firetable.git ${dir}`,
      function () {
        cloningStatus.stop();
        const installingPackagesStatus = new Spinner("Installing packages");
        installingPackagesStatus.start();
        execute(`cd ${dir}/www && yarn;`, function (results) {
          installingPackagesStatus.stop();
          resolve(results);
        });
      }
    );
  });

module.exports.updateFiretable = (branch) =>
  new Promise((resolve) => {
    const cloningStatus = new Spinner("Pulling from the Firetable repository");
    cloningStatus.start();
    execute(
      `git remote set-branches origin '*';git fetch -v;git checkout ${branch};git pull;`,
      function () {
        cloningStatus.stop();
        const installingPackagesStatus = new Spinner("updating packages");
        installingPackagesStatus.start();
        execute(`cd www && yarn;`, function (results) {
          installingPackagesStatus.stop();
          resolve(results);
        });
      }
    );
  });

module.exports.setFiretableENV = (envVariables, dir) =>
  new Promise((resolve) => {
    const status = new Spinner("Setting environment variables");
    status.start();
    const command = `cd ${dir}/www && node createDotEnv ${envVariables.projectId} ${envVariables.firebaseWebApiKey} ${envVariables.algoliaAppId} ${envVariables.algoliaSearchKey}`;
    execute(command, function () {
      status.stop();
      resolve(true);
    });
  });

module.exports.setFirebaseHostingTarget = (projectId, hostingTarget) =>
  new Promise((resolve) => {
    const status = new Spinner("Setting Firebase Hosting target");
    status.start();

    const command = `cd www && echo '{}' > .firebaserc && yarn target ${hostingTarget} --project ${projectId}`;
    execute(command, function () {
      execute(`firebase use ${projectId}`, function () {
        status.stop();
        resolve(true);
      });
    });
  });

module.exports.deployToFirebaseHosting = (projectId) =>
  new Promise((resolve) => {
    const status = new Spinner("Deploying to Firebase Hosting");
    status.start();
    const command = `cd www && firebase deploy --project ${projectId} --only hosting`;
    execute(command, function (results) {
      if (results.includes("Error:")) {
        throw new Error(results);
      }
      status.stop();
      resolve(true);
    });
  });

module.exports.startFiretableLocally = (dir = "firetable/www") =>
  new Promise((resolve) => {
    const child = spawn(
      /^win/.test(process.platform) ? "yarn.cmd" : "yarn",
      ["serve"],
      { cwd: dir }
    );
    child.stdout.on("data", (data) => {
      const msg = data.toString();
      const portRegex = /^INFO: Accepting connections at (http:\/\/[\w\.]+:\d+)/;

      if (portRegex.test(msg))
        console.log(
          chalk.green(
            chalk.bold(
              "\u2705 Serving Firetable at " +
                chalk.underline(msg.replace(portRegex, "$1"))
            )
          )
        );
      else console.log(msg);
    });

    child.on("close", (code) => resolve(code));
  });

module.exports.installFiretableAppPackages = (dir = "firetable/www") =>
  new Promise((resolve) => {
    const status = new Spinner("Installing Firetable app npm packages");
    status.start();
    execute(`cd ${dir} && yarn`, function () {
      status.stop();
      resolve(true);
    });
  });

module.exports.buildFiretable = (dir) =>
  new Promise((resolve) => {
    const status = new Spinner(
      "Building Firetable. This will take a few minutes"
    );
    status.start();
    execute(`cd ${dir ? `${dir + "/"}` : ""}www && yarn build`, function (
      stdout
    ) {
      status.stop();
      resolve(true);
    });
  });

module.exports.createFirebaseAppConfigFile = (config, dir) =>
  new Promise((resolve) => {
    const status = new Spinner(`Creating firebase config file`);
    status.start();
    execute(
      `cd ${dir}/www/src/firebase && ls && echo 'export default ${config.replace(
        /\n/g,
        ""
      )}' > config.ts`,
      function (results) {
        console.log(results);
        status.stop();
        resolve(results);
      }
    );
  });

module.exports.createCloudFunctionConfig = (functionName, collectionName) =>
  new Promise((resolve) => {
    const status = new Spinner(
      `Configuring ${functionName} for ${collectionName}`
    );
    status.start();
    const command = `cd cloud_functions/functions && yarn && yarn generateConfig ${functionName} ${collectionName}`;
    execute(command, function (results) {
      console.log(results);
      if (results.includes("Error:")) {
        throw new Error(results);
      }
      status.stop();
      resolve(true);
    });
  });

module.exports.deployCloudFunction = (projectId, functionName) =>
  new Promise((resolve) => {
    const status = new Spinner(`Deploying ${functionName}`);
    status.start();
    const command = `cd cloud_functions/functions && yarn && firebase deploy --project ${projectId} --only functions:${functionName}`;
    execute(command, function (results) {
      if (results.includes("Error:")) {
        throw new Error(results);
      }
      status.stop();
      resolve(true);
    });
  });
