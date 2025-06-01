import { createId } from '@paralleldrive/cuid2'
import axios from 'axios'
import express from 'express'
import { z } from 'zod'
import {
	type TransactionNew,
	getBanks,
	getMerchantsMerchantPublicKey,
	getPaymentSourcesPaymentSourceId,
	getTransactionsTransactionId,
	postPaymentSources,
	postTokensCards,
	postTokensNequi,
	postTransactions,
} from '../../src/lib'
import { config } from './config'
import {
	getAcceptanceToken,
	handleError,
	hashSignature,
	sandbox,
} from './utils'

// axios.defaults.baseURL = config.WOMPI_URL
// axios.defaults.headers.common.Authorization = `Bearer ${config.WOMPI_PRIVATE_API_KEY}`

const app = express()

app.use(express.json())

app.get('/merchant', async (_req, res) => {
	getMerchantsMerchantPublicKey(config.WOMPI_PUBLIC_API_KEY)
		.then(({ data }) => res.json(data))
		.catch(handleError(res))
})

const TransactionSchema = z.object({
	amount: z.coerce.number().optional(),
	payment_source_id: z.coerce.number().optional(),
	recurrent: z.enum(['true', 'false']).optional(),
})

// e.g. http://localhost:3000/?amount=2500000&payment_source_id=181384 (nequi)
// e.g. http://localhost:3000/?amount=2500000&payment_source_id=181387 (card)
// e.g. http://localhost:3000/?amount=1500000&payment_source_id=181387&recurrent=true (card)
app.get('/transaction', async (req, res) => {
	const { amount, payment_source_id, recurrent } = TransactionSchema.parse(
		req.query,
	)
	try {
		const { acceptance_token, accept_personal_auth } =
			await getAcceptanceToken()

		const reference = createId()
		const amount_in_cents = amount ?? 2500000
		const currency = 'COP'
		const signature = await hashSignature(
			`${reference}${amount_in_cents}${currency}${config.WOMPI_INTEGRITY_HASH}`,
		)

		const params: TransactionNew = {
			acceptance_token,
			accept_personal_auth,
			amount_in_cents,
			currency,
			signature,
			reference,
			customer_email: sandbox.users.pepito.email,
		}

		if (payment_source_id) {
			const { data: paymentSource } =
				await getPaymentSourcesPaymentSourceId(payment_source_id)
			if (!paymentSource) throw new Error('Payment source not found')

			params.payment_source_id = payment_source_id

			// Important: If the payment source is a card then we must provide a number of installments
			if (paymentSource.type === 'CARD') {
				params.payment_method = { installments: 1 }

				// Will work only for cards: MasterCard or VISA see https://docs.wompi.co/docs/colombia/fuentes-de-pago/#transacciones-con-cof
				if (recurrent === 'true') {
					params.recurrent = true
				}
			}
		} else {
			params.payment_method = {
				type: 'NEQUI',
				phone_number: sandbox.nequi.approved,
			}
		}

		const response = await postTransactions(params)
		res.json(response.data)
	} catch (error) {
		handleError(res)(error)
	}
})

app.get('/transaction/:transaction_id', async (req, res) => {
	getTransactionsTransactionId(req.params.transaction_id)
		.then(({ data }) => res.json(data))
		.catch(handleError(res))
})

app.get('/payment-source/nequi', async (req, res) => {
	try {
		const { acceptance_token, accept_personal_auth } =
			await getAcceptanceToken()

		const { data: token } = await postTokensNequi(
			{ phone_number: sandbox.nequi.approved },
			// Important: use public key as authorization to generate the token: https://docs.wompi.co/docs/colombia/fuentes-de-pago/#cuentas-nequi
			{ headers: { Authorization: `Bearer ${config.WOMPI_PUBLIC_API_KEY}` } },
		)

		if (!token?.id) throw new Error('Nequi token not found')

		const { data: payment_source } = await postPaymentSources({
			type: 'NEQUI',
			token: token.id,
			customer_email: sandbox.users.pepito.email,
			acceptance_token,
			accept_personal_auth,
		})

		res.json({ payment_source })
	} catch (error) {
		handleError(res)(error)
	}
})

// e.g. http://localhost:3000/payment-source/181384  // nequi
// e.g. http://localhost:3000/payment-source/181387  // card
app.get('/payment-source/:payment_source_id', async (req, res) => {
	getPaymentSourcesPaymentSourceId(Number(req.params.payment_source_id))
		.then(({ data }) => res.json(data))
		.catch(handleError(res))
})

// e.g. http://localhost:3000/payment-source/card
app.get('/payment-source/card', async (req, res) => {
	try {
		const { acceptance_token, accept_personal_auth } =
			await getAcceptanceToken()

		const { data: token } = await postTokensCards(
			{
				number: sandbox.cards.approved, // Número de tarjeta (como un string, sin espacios)
				exp_month: '06', // Mes de expiración (como string de 2 dígitos)
				exp_year: '29', // Año de expiración (como string de 2 dígitos)
				cvc: '123', // Código de seguridad (como string de 3 o 4 dígitos)
				card_holder: 'Pedro Pérez', // Nombre del tarjeta habiente (string de mínimo 5 caracteres)
			},
			// Important: use public key as authorization to generate the token: https://docs.wompi.co/docs/colombia/fuentes-de-pago/#cuentas-nequi
			{ headers: { Authorization: `Bearer ${config.WOMPI_PUBLIC_API_KEY}` } },
		)
		if (!token?.id) throw new Error('Nequi token not found')

		const { data: payment_source } = await postPaymentSources({
			type: 'CARD',
			token: token.id,
			customer_email: sandbox.users.pepito.email,
			acceptance_token,
			accept_personal_auth,
		})

		res.json({ payment_source })
	} catch (error) {
		handleError(res)(error)
	}
})

// TODO: implement webhook endpoint, and logic to check event authenticity @see https://docs.wompi.co/docs/colombia/eventos/
app.post('/webhook', (req, res) => {
	res.json('TODO')
})

app.get('/banks', (req, res) => {
	getBanks({
		headers: { Authorization: `Bearer ${config.WOMPI_PUBLIC_API_KEY}` },
	})
		.then((banks) => {
			res.json(banks)
		})
		.catch(handleError(res))
})

app.get('/accounts', (req, res) => {
	axios
		.get('/accounts?origin=wompi', {
			headers: { Authorization: `Bearer ${config.WOMPI_PUBLIC_API_KEY}` },
		})
		.then((response) => {
			res.json(response.data)
		})
		.catch(handleError(res))
})

app.get('/limits', (req, res) => {
	axios
		.get('/limits')
		.then((response) => {
			res.json(response.data)
		})
		.catch(handleError(res))
})

app.get('/payouts', (req, res) => {
	axios
		.get('/payouts')
		.then((response) => {
			res.json(response.data)
		})
		.catch(handleError(res))
})

app.listen(3000, () => {
	console.info('Server is running on port http://localhost:3000')
})
