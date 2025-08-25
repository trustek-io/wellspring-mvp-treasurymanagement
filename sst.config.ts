// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "wellspring-frontend",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "aws",
    };
  },
  async run() {
    /* -------------------------  Secrets  ------------------------- */
    const secrets = {
      // DATABASE_URL: new sst.Secret("DATABASE_URL"),
      // JWT_SECRET: new sst.Secret("JWT_SECRET"),
      // STRIPE_SECRET_KEY: new sst.Secret("STRIPE_SECRET_KEY"),
    };

    const domainName = $app.stage === "production"
        ? "app.wellspring.money"
        : `${$app.stage}-app.wellspring.money`;

    /* ------------------  Non-sensitive env vars  ----------------- */
    const environment = {
      NODE_ENV: "production",
      NEXT_PUBLIC_APP_URL: `https://${domainName}`,
      NEXT_PUBLIC_STAGE: $app.stage,

    };

    /* ------------------------  Domain  --------------------------- */
    const domain = {
      name: domainName,
      hostedZone: "Z06245sdsf8sdfsdDSsdfsdf30D4O",
    };

    /* ------------------------  Next.js  -------------------------- */
    new sst.aws.Nextjs("wellspring-frontend", {
      domain,
      environment,
      link: Object.values(secrets),
    });
  },
});