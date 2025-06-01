import crypto from 'node:crypto'
import axios from 'axios'
import type express from 'express'
import assign from 'lodash/assign'
import { getMerchantsMerchantPublicKey } from '../../src/lib/wompi'
import { config } from './config'

// Sandbox data
export const sandbox = {
	cards: {
		approved: '4242424242424242',
		declined: '4111111111111111',
	},
	nequi: {
		approved: '3991111111',
		declined: '3992222222',
		error: '3107654321',
	},
	users: {
		pepito: {
			email: 'pepito_perez@example.com',
		},
	},
}

export const hashSignature = async (signature: string) => {
	const encodedText = new TextEncoder().encode(signature)
	const hashBuffer = await crypto.subtle.digest('SHA-256', encodedText)
	const hashArray = Array.from(new Uint8Array(hashBuffer))
	const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
	return hashHex
}

export const handleError = (res: express.Response) => (error: unknown) => {
	if (axios.isAxiosError(error)) {
		res
			.status(500)
			.json(assign(error.toJSON(), { response: error.response?.data }))
	} else {
		res.status(500).json({ error })
	}
}

export const getAcceptanceToken = async () => {
	const { data: merchant } = await getMerchantsMerchantPublicKey(
		config.WOMPI_PUBLIC_API_KEY,
	)

	// users should be able to access these links and accept them.
	// merchant?.presigned_acceptance?.permalink
	// merchant?.presigned_personal_data_auth?.permalink

	if (!merchant) throw new Error('Merchant not found')
	if (!merchant.presigned_acceptance?.acceptance_token)
		throw new Error('Acceptance token not found')
	if (!merchant.presigned_personal_data_auth?.acceptance_token)
		throw new Error('Personal data auth token not found')

	return {
		acceptance_token: merchant.presigned_acceptance.acceptance_token,
		accept_personal_auth:
			merchant.presigned_personal_data_auth.acceptance_token,
	}
}
