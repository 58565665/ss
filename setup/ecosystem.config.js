// PM2 Ecosystem configuration for ZeroLegend Game Server
module.exports = {
  apps: [
    {
      name: 'zerolegend-game-backend',
      script: './server.js',
      instances: 4,          // Numero di worker processes
      exec_mode: 'cluster',  // Usa cluster mode per load balancing
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: '/home/zero/ss/logs/error.log',
      out_file: '/home/zero/ss/logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '500M',  // Restart se supera 500MB
      watch: false,  // Non attivare in produzione
      ignore_watch: ['node_modules', 'logs'],
      merge_logs: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};
