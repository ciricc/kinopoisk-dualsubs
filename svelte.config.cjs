const preprocess = require('svelte-preprocess');
const { windi } = require('svelte-windicss-preprocess');


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

module.exports = config;