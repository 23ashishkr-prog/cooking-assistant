/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'www.themealdb.com', pathname: '/images/media/meals/**' },
      { protocol: 'https', hostname: 'ohnwifpgdoimydddjiwa.supabase.co', pathname: '/storage/v1/object/public/recipe-images/**' },
    ],
    formats: ['image/webp'],
    minimumCacheTTL: 86400,
  },
}

export default nextConfig
