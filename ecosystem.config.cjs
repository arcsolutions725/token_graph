module.exports = {
  apps: [
    {
      name: 'token-graph-dev',
      script: 'npm',
      args: 'run dev -- --host 0.0.0.0',
      env: {
        NODE_ENV: 'development',
      },
      watch: false, // Vite has its own watcher
      autorestart: true,
      max_memory_restart: '1G',
    },
    {
      name: 'token-graph-prod',
      script: 'npm',
      args: 'run preview -- --host 0.0.0.0',
      env: {
        NODE_ENV: 'production',
      },
      watch: false,
      autorestart: true,
      max_memory_restart: '1G',
    }
  ],
};
