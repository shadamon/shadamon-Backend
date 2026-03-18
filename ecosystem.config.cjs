module.exports = {
  apps: [
    {
      name: "shadamon-backend",
      script: "index.js",
      instances: 1,
      exec_mode: "fork",
      time: true,
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      },
    },
  ],
};

