/* eslint-disable @next/next/no-page-custom-font */
import {Html, Head, Main, NextScript} from 'next/document.js';

export default function Document() {
	return (
		<Html>
			<Head>
				<link rel='icon' href='/favicon.ico' />
				<link href='https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap' rel='stylesheet' />
			</Head>

			<body>
				<Main />
				<NextScript />
			</body>

		</Html>
	);
}
