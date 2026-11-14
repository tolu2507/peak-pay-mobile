// Keeps Android dependencies readable by the project's Kotlin compiler.
//
// Expo SDK 55 / React Native 0.83 compile with Kotlin 2.1.20, which can read
// libraries built with Kotlin up to 2.2. Smile ID's android-security 11.2.1
// asks for kotlinx-serialization 1.10.0, which drags in kotlin-stdlib 2.3.0,
// and the build then fails in :expo:compileReleaseKotlin with "Module was
// compiled with an incompatible version of Kotlin".
//
// This pins the app's (not the compiler's) classpaths to the newest versions a
// 2.1 compiler can read. Remove it once the project moves to Kotlin 2.2+.
//
// It also gives Gradle more memory: the default 512 MiB metaspace runs out on
// this project and restarts the daemon mid-build.

const { withProjectBuildGradle, withGradleProperties } = require('expo/config-plugins');

const KOTLIN_STDLIB = '2.2.21';
const KOTLINX_SERIALIZATION = '1.9.0';
const MARKER = '// @peakpay/kotlin-compat';

const block = `
${MARKER}
allprojects {
    configurations.configureEach { config ->
        // Leave the Kotlin compiler's own classpaths alone.
        if (!(config.name ==~ /.*(RuntimeClasspath|CompileClasspath)$/)) return
        config.resolutionStrategy.eachDependency { details ->
            def req = details.requested
            if (req.group == 'org.jetbrains.kotlin' && req.name.startsWith('kotlin-stdlib')) {
                details.useVersion '${KOTLIN_STDLIB}'
                details.because 'Kotlin 2.1 compiler reads metadata up to 2.2'
            } else if (req.group == 'org.jetbrains.kotlinx' && req.name.startsWith('kotlinx-serialization')) {
                details.useVersion '${KOTLINX_SERIALIZATION}'
                details.because 'kotlinx-serialization 1.10 needs kotlin-stdlib 2.3'
            }
        }
    }
}
`;

const withKotlinCompat = (config) => {
  config = withProjectBuildGradle(config, (cfg) => {
    if (!cfg.modResults.contents.includes(MARKER)) {
      cfg.modResults.contents += block;
    }
    return cfg;
  });

  config = withGradleProperties(config, (cfg) => {
    const props = cfg.modResults.filter((item) => !(item.type === 'property' && item.key === 'org.gradle.jvmargs'));
    props.push({
      type: 'property',
      key: 'org.gradle.jvmargs',
      value: '-Xmx4096m -XX:MaxMetaspaceSize=1024m',
    });
    cfg.modResults = props;
    return cfg;
  });

  return config;
};

module.exports = withKotlinCompat;
