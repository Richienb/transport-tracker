import type {AppProps} from 'next/app';
import Head from 'next/head';
import {ThemeProvider, createTheme} from '@mui/material';
import '../styles/globals.scss';

export default function App({Component, pageProps}: AppProps) {
	return (
		<ThemeProvider theme={createTheme({
			palette: {
				primary: {
					main: '#3f51b5',
				},
				secondary: {
					main: '#f44336',
				},
			},
			typography: {
				fontFamily: 'Inter, Roboto, Helvetica, Arial, sans-serif',
			},
		})}
		>
			<Head>
				<meta name='viewport' content='width=device-width, initial-scale=1' />
			</Head>
			<Component {...pageProps} />
		</ThemeProvider>
	);
}
