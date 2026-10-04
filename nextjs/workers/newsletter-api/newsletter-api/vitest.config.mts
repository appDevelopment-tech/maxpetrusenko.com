import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
	test: {
		poolOptions: {
			workers: {
				wrangler: { configPath: './wrangler.jsonc' },
				// Not in wrangler.jsonc until Max creates the namespace (see the plan's
				// go-live order); tests get a local one.
				miniflare: { kvNamespaces: { AMBASSADORS: { id: 'ambassadors-test' }, IDEAS: { id: 'ideas-test' } } },
			},
		},
	},
});
