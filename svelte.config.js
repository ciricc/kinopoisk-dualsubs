import preprocess from 'svelte-preprocess';
import { windi } from 'svelte-windicss-preprocess';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: [
		preprocess(),
		windi(),
	],
    kit: {
		vite: {
			plugins: [],
		},
	},
};

export default config;