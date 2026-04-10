let userConfig = undefined
try {
  userConfig = await import('./v0-user-next.config')
} catch (e) {
  // ignore error
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  /** Expose ML_API_URL to the browser for the detect page (client-side axios). */
  env: {
    NEXT_PUBLIC_ML_API_URL:
      process.env.ML_API_URL ||
      process.env.NEXT_PUBLIC_ML_API_URL ||
      "http://127.0.0.1:8000",
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Avoid parallel webpack workers / parallel compiles: they can race the dev disk cache and
  // produce ENOENT on .pack.gz plus 404 on /_next/static/* while HTML still returns 200.
}

mergeConfig(nextConfig, userConfig)

function mergeConfig(nextConfig, userConfig) {
  if (!userConfig) {
    return
  }

  for (const key in userConfig) {
    if (
      typeof nextConfig[key] === 'object' &&
      !Array.isArray(nextConfig[key])
    ) {
      nextConfig[key] = {
        ...nextConfig[key],
        ...userConfig[key],
      }
    } else {
      nextConfig[key] = userConfig[key]
    }
  }
}

export default nextConfig
