const { withXcodeProject } = require('@expo/config-plugins');

const phaseName = '"Bundle React Native code and images"';
const ipFile = '"$(CONFIGURATION_BUILD_DIR)/$(UNLOCALIZED_RESOURCES_FOLDER_PATH)/ip.txt"';

module.exports = function withMetroIpOutput(config) {
  return withXcodeProject(config, config => {
    const phases = config.modResults.hash.project.objects.PBXShellScriptBuildPhase;
    const bundlePhase = Object.values(phases).find(phase => phase?.name === phaseName);

    if (!bundlePhase) {
      throw new Error(`Could not find the Xcode "${phaseName}" build phase.`);
    }

    const outputPaths = bundlePhase.outputPaths ?? [];
    if (!outputPaths.includes(ipFile)) {
      bundlePhase.outputPaths = [...outputPaths, ipFile];
    }

    return config;
  });
};
