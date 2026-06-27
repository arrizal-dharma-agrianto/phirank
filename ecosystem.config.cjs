module.exports = {
  apps: [
    {
      name: "phirank",
      cwd: "/home/phirank/htdocs/phirank.arrizaldharma.my.id/phirank",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3027",
      interpreter: "/home/phirank/.nvm/versions/node/v22.23.1/bin/node",
      env: {
        NODE_ENV: "production",
        PORT: "3027"
      }
    }
  ]
};
