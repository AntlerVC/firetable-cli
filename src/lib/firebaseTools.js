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
