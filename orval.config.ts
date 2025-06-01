import { defineConfig } from 'orval'

export default defineConfig({
	wompi: {
		input: './src/swagger/wompi.yaml',
		output: {
			target: './src/lib/wompi.ts',
			override: {
				mutator: {
					path: './src/api/default-instance.ts',
					name: 'defaultInstance',
				},
			},
		},
		hooks: {
			afterAllFilesWrite: 'yarn format:fix',
		},
	},
	payouts: {
		input: './src/swagger/wompi-payouts.yaml',
		output: {
			target: './src/lib/payouts.ts',
			override: {
				mutator: {
					path: './src/api/payouts-instance.ts',
					name: 'payoutsInstance',
				},
			},
		},
		hooks: {
			afterAllFilesWrite: 'yarn format:fix',
		},
	},
})
