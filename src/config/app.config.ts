const DEFAULT_APP_NAME = "Phirank";

const getAppName = () => {
  const appName = process.env.APP_NAME?.trim();

  return appName || DEFAULT_APP_NAME;
};

export { DEFAULT_APP_NAME, getAppName };
