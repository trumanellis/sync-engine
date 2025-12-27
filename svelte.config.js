import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		// Static adapter for Capacitor - outputs to build/ directory
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: 'index.html', // SPA mode for Electron
			precompress: false,
			strict: false
		})
	}
};

export default config;
