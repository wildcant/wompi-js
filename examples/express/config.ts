import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

export const config = createEnv({
	server: {
		WOMPI_URL: z.string().min(1),
		WOMPI_PUBLIC_API_KEY: z.string().min(1),
		WOMPI_PRIVATE_API_KEY: z.string().min(1),
		WOMPI_INTEGRITY_HASH: z.string().min(1),
		WOMPI_PAYOUTS_URL: z.string().min(1),
		WOMPI_PAYOUTS_API_KEY: z.string().min(1).optional(),
		WOMPI_PAYOUTS_USER_ID: z.string().min(1).optional(),
	},
	runtimeEnv: process.env,
})
