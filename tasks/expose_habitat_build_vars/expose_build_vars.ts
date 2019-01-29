/**
 * Script to read in the `last_build.env` file and expose the variables
 * to the VSTS environment for other tasks to be able to access
 *
 * @author Russell Seymour
 */

// Import tasks from vsts
import * as tl from "azure-pipelines-task-lib/task";

// Import common tasks
import * as task from "./common/TaskConfiguration";

// Import library to read environment vars from files
import {config} from "dotenv";

import {sprintf} from "sprintf-js";

async function run() {

  // initialise the settings class
  let taskParameters = new task.TaskParameters();

  // define the parameters that this task requires
  let required = [
      "habitatLastBuildEnvPath",
      "habitatSetBuildNumber",
      "habitatSetImageNames",
      "habitatImageNames",
      "habitatImageNamesFilename"
  ];

  let params = await taskParameters.getTaskParameters(required);

  if (!tl.exist(params.lastBuildEnvPath)) {
    tl.setResult(tl.TaskResult.Failed, sprintf("Unable to locate last build environment file: %s", params.lastBuildEnvPath));
  } else {

    // read in the environment variables
    config({path: params.lastBuildEnvPath});

    // define list of habitat variables that are to be exposed
    // this is so that it can be iterated over
    let habitat_var_names = [
      "pkg_origin",
      "pkg_name",
      "pkg_version",
      "pkg_release",
      "pkg_ident",
      "pkg_artifact",
      "pkg_sha256sum",
      "pkg_blake2bsum"
    ];

    // iterate around the habitat var names and set the build environment variables
    for (let habitat_var_name of habitat_var_names)
    {
      tl.debug(sprintf("Setting variables '%s': %s", habitat_var_name, process.env[habitat_var_name]));

      // now set the variable
      tl.setVariable(habitat_var_name, process.env[habitat_var_name]);
    }

    // if the option has been set to set the build number do it now
    if (params.setBuildNumber) {
      let build_number = sprintf("%s-%s", process.env.pkg_version, process.env.pkg_release);
      console.log("Setting Build Number: %s", build_number);
      console.log("##vso[build.updatebuildnumber]%s", build_number);
    }

    // if the option has been specified to set the images to tag, write out the filename
    // and set the variable name to use
    if (params.setImageNames) {
      console.log("Writing image names file: %s", params.imageNamesFilename);

      // evaluate the string so that variables can be expanded
      let contents = expandenv(params.imageNames);
      tl.writeFile(params.imageNamesFilename, contents);

      // set the path to the imagefilename as a variable
      tl.setVariable("image_names_filename", params.imageNamesFilename);
    }
  }

}

function expandenv(phrase, env = {}) {
  if (!phrase) {
    throw new Error("Please pass a string into expandenv");
  }

  env = merge(process.env, (env || {}));

  return phrase.replace(/\$[\w]+/g, function(match) {
    return env[match.replace("$", "")] || match;
  });
}

function merge(orig, newObj) {
  let result = new Object(orig);

  Object.keys(newObj).forEach(function(key) {
    if (newObj.hasOwnProperty(key)) {
      result[key] = newObj[key];
    }
  });

  return result;
}

run();