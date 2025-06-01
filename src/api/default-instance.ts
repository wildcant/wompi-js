import Axios, { type AxiosRequestConfig } from 'axios'
import { config } from '../../examples/express/config'

const AXIOS_INSTANCE = Axios.create({
	baseURL: config.WOMPI_URL,
	headers: {
		Authorization: `Bearer ${config.WOMPI_PRIVATE_API_KEY}`,
	},
})

export const defaultInstance = <T>(
	config: AxiosRequestConfig,
	options?: AxiosRequestConfig,
): Promise<T> => {
	return AXIOS_INSTANCE({
		...config,
		...options,
	})
}
