const { withPodfile } = require("@expo/config-plugins");

module.exports = function withSftpIos(config) {
  return withPodfile(config, (podfileConfig) => {
    const marker = "pod 'NMSSH', :git => 'https://github.com/aanah0/NMSSH.git'";
    if (!podfileConfig.modResults.contents.includes(marker)) {
      podfileConfig.modResults.contents = podfileConfig.modResults.contents.replace(
        "use_expo_modules!",
        `${marker}\n  use_expo_modules!`,
      );
    }
    return podfileConfig;
  });
};
