import pInterval from 'interval-promise';

export default function pIntervalStoppable(function_: (iterationNumber: number) => unknown, interval: number, {leadingEdge = true} = {}) {
	let isStopped = false;

	void pInterval(async (iterationNumber, stop) => {
		if (isStopped) {
			stop();
			return;
		}

		await function_(iterationNumber + 1);
	}, iterationNumber => leadingEdge && iterationNumber === 1 ? 0 : interval);

	return () => {
		isStopped = true;
	};
}
