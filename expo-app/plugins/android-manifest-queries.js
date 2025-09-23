const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withAndroidQueries(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;

    // Add queries element if it doesn't exist
    if (!androidManifest.manifest.queries) {
      androidManifest.manifest.queries = [];
    }

    // Add package query for OneKey
    const packageQuery = {
      package: [
        {
          $: {
            'android:name': 'so.onekey.app.wallet',
          },
        },
      ],
    };

    // Add intent queries for URL schemes
    const intentQueries = [
      {
        intent: [
          {
            action: [
              {
                $: {
                  'android:name': 'android.intent.action.VIEW',
                },
              },
            ],
            data: [
              {
                $: {
                  'android:scheme': 'onekey',
                },
              },
            ],
          },
        ],
      },
      {
        intent: [
          {
            action: [
              {
                $: {
                  'android:name': 'android.intent.action.VIEW',
                },
              },
            ],
            data: [
              {
                $: {
                  'android:scheme': 'onekey-wallet',
                },
              },
            ],
          },
        ],
      },
      {
        intent: [
          {
            action: [
              {
                $: {
                  'android:name': 'android.intent.action.VIEW',
                },
              },
            ],
            data: [
              {
                $: {
                  'android:scheme': 'wc',
                },
              },
            ],
          },
        ],
      },
    ];

    // Add to queries if not already present
    const queries = androidManifest.manifest.queries[0];
    if (!queries) {
      androidManifest.manifest.queries[0] = {
        ...packageQuery,
        intent: intentQueries.map((q) => q.intent[0]),
      };
    }

    return config;
  });
};
