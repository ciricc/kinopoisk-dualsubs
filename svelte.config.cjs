const preprocess = require('svelte-preprocess');

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: [
		preprocess(),
	],
    kit: {
		vite: {
			plugins: [],
		},
	},
};

module.exports = config;
