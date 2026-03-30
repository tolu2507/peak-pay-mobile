const { withAndroidManifest } = require('@expo/config-plugins');

const withMLKitDependencies = (config) => {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults;
    const app = manifest.manifest.application[0];
    
    // We need to ensure the 'tools' namespace exists on the root <manifest> tag
    const manifestRoot = manifest.manifest;
    if (!manifestRoot.$['xmlns:tools']) {
      manifestRoot.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    if (!app['meta-data']) {
      app['meta-data'] = [];
    }
    
    // Find existing ML Kit dependencies meta-data
    let dependenciesMeta = app['meta-data'].find(
      (item) => item.$['android:name'] === 'com.google.mlkit.vision.DEPENDENCIES'
    );

    if (dependenciesMeta) {
      // If it exists, ensure both barcode_ui and face are in the value
      const existingValues = dependenciesMeta.$['android:value'] || '';
      const neededValues = ['barcode_ui', 'face'];
      
      const combinedValues = Array.from(new Set([...existingValues.split(','), ...neededValues]))
        .filter(Boolean)
        .join(',');
        
      dependenciesMeta.$['android:value'] = combinedValues;
      
      // Critical: Add tools:replace explicitly to resolve merger conflicts
      dependenciesMeta.$['tools:replace'] = 'android:value';
    } else {
      // If it doesn't exist, create it.
      app['meta-data'].push({
        $: {
          'android:name': 'com.google.mlkit.vision.DEPENDENCIES',
          'android:value': 'barcode_ui,face',
          'tools:replace': 'android:value'
        }
      });
    }
    
    return config;
  });
};

module.exports = withMLKitDependencies;
