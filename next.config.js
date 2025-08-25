/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config, { isServer }) => {
        // Exclude SST from client-side bundles
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                sst: false,
            }
        }

        return config
    },

    // Ensure SST is treated as external in server builds during development
    experimental: {
        serverComponentsExternalPackages: ['sst']
    }
}

module.exports = nextConfig