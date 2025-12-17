/** @type {import('next').NextConfig} */
import path from 'path';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

const nextConfig = {
    turbopack: {
        root: path.join(__dirname, '../../'),
    }
};

export default nextConfig;
