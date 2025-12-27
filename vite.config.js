import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [sveltekit()],

	build: {
		rollupOptions: {
			external: [
				// Externalize Node.js modules for Electron runtime
				'libp2p',
				'helia',
				'@orbitdb/core',
				'blockstore-level',
				'datastore-level',
				'level',
				/^@libp2p\//,
				/^@chainsafe\//,
				/^@multiformats\//
			]
		}
	},

	ssr: {
		noExternal: ['@capacitor-community/electron']
	},

	test: {
		globals: true,
		environment: 'node',
		setupFiles: ['./tests/helpers/setup.js'],
		include: ['tests/**/*.test.js'],
		exclude: ['node_modules', 'build', '.svelte-kit']
	}
});
