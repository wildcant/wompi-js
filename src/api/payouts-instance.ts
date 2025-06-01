import Axios, { type AxiosRequestConfig } from 'axios'
import { config } from '../../examples/express/config'

const AXIOS_INSTANCE = Axios.create({
	baseURL: config.WOMPI_PAYOUTS_URL,
	headers: {
		'x-api-key': config.WOMPI_PAYOUTS_API_KEY,
		'user-principal-id': config.WOMPI_PAYOUTS_USER_ID,
	},
})

export const payoutsInstance = <T>(
	config: AxiosRequestConfig,
	options?: AxiosRequestConfig,
): Promise<T> => {
	return AXIOS_INSTANCE({
		...config,
		...options,
	}).then((response) => response.data)
}
