const client = require("firebase-tools");

const CLI = require("clui");
const Spinner = CLI.Spinner;
module.exports.getFirebaseProjects = () =>
  new Promise((resolve) => {
    const status = new Spinner("Getting your Firebase projects");
    status.start();
    client.projects
      .list()
      .then((data) => {
        status.stop();
        resolve(data);
      })
      .catch((err) => {
        status.stop();

        console.error(err.message);
      });
  });

module.exports.getFiretableApp = (projectId) =>
  new Promise((resolve) => {
    const status = new Spinner("Checking for existing Firetable web app");
    status.start();
    client.apps
      .list("WEB", { project: projectId })
      .then((data) => {
        const filteredConfigs = data.filter(
          (config) => config.displayName === "firetable-app"
        );
        if (filteredConfigs.length === 0) {
          client.apps
            .create("WEB", "firetable-app", { project: projectId })
            .then((newApp) => {
              console.log(newApp);
              status.stop();
              resolve(newApp);
            })
            .catch((err) => {
              status.stop();
              console.error(err);
            });
        } else {
          status.stop();
          resolve(filteredConfigs[0]);
        }
      })
      .catch((err) => {
        status.stop();
        console.error(err);
      });
  });
