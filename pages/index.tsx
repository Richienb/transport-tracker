import Head from 'next/head';
import {useEffect, useState} from 'react';
import ky from 'ky';
import MapGL, {Source, Layer, GeolocateControl, Popup} from 'react-map-gl';
import type {EventData, MapMouseEvent, MapboxGeoJSONFeature} from 'mapbox-gl';
import type {FeatureCollection, Feature} from 'geojson';
import roundTo from 'round-to';
import {LinearProgress} from '@mui/material';
import pIntervalStoppable from '../utils/p-interval-stoppable';
import type {Trip} from './api/trip';
import type {Vehicle, Vehicles} from './api/vehicles';

type MapInteractionEvent = MapMouseEvent & {
	features?: MapboxGeoJSONFeature[];
} & EventData;

const maxSafeTimeout = 2_147_483_647;

function composeVehicleLocationSource(vehicleLocations: Vehicles): FeatureCollection {
	return {
		type: 'FeatureCollection',
		features: vehicleLocations.map(({latitude, longitude, vehicleType, ...vehicle}) => ({
			type: 'Feature',
			properties: {
				icon: vehicleType,
				latitude,
				longitude,
				...vehicle,
			},
			geometry: {
				type: 'Point',
				coordinates: [longitude, latitude],
			},
		})),
	};
}

function composePathSource(coordinates: Trip['path']): Feature {
	return {
		type: 'Feature',
		properties: {},
		geometry: {
			type: 'LineString',
			coordinates,
		},
	};
}

const vehiclesId = 'vehicles';

const capacityMap = [
	['Empty'],
	['Many seats available'],
	['Few seats available'],
	['Only standing room'],
	['Limited standing room'],
	['Full'],
	['Full and not accepting passengers'],
];

function Capacity({value}: {
	value?: number;
}) {
	if (typeof value !== 'number') {
		return null;
	}

	return (
		<>
			<label htmlFor='capacity'>Passenger capacity:</label>

			<meter id='capacity'
				min={0} max={6}
				optimum={0} low={2} high={4}
				value={value}
				style={{
					marginLeft: 10,
				}}
			>
				{capacityMap[value]}
			</meter>
		</>
	);
}

function VehiclePopup({
	value,
	onPath,
}: {
	value: Vehicle;
	onPath: (newPath: Array<[number, number]>) => void;
}) {
	const [trip, setTrip] = useState<Trip | 'loading' | false>(typeof value.tripId === 'string' ? 'loading' : false);

	useEffect(() => {
		setTrip(typeof value.tripId === 'string' ? 'loading' : false);
	}, [value]);

	useEffect(() => {
		if (trip === 'loading') {
			const controller = new AbortController();
			const {signal} = controller;

			(async () => {
				try {
					setTrip(await ky('/api/trip', {
						searchParams: {
							tripId: value.tripId,
						},
						timeout: maxSafeTimeout,
						signal,
					}).json<Trip>());
				} catch (error: unknown) {
					if ((error as Error)?.name !== 'AbortError') {
						throw error;
					}
				}
			})();

			return () => {
				controller.abort();
			};
		}

		if (trip !== false) {
			onPath(trip.path);
		}
	}, [value, trip, onPath]);

	return (
		<div style={{
			marginTop: 12,
		}}
		>
			{(value.shortName && value.longName) && <DestinationSign shortName={value.shortName} longName={value.longName} />}
			{value.licensePlate && <>License plate: {value.licensePlate}<br /></>}
			Speed: {value.speed === 0 ? 'Not moving' : `${roundTo(value.speed, 1)} km/h`}<br />
			<Capacity value={value.capacity} />
			{trip !== false && (<>
				<br />
				{trip === 'loading' && <div style={{
					marginTop: 10,
				}}
				>
					<LinearProgress />
				</div>}
			</>)}
		</div>
	);
}

function DestinationSign({
	shortName,
	longName,
}: {
	shortName: string;
	longName: string;
}) {
	const [destination, via] = longName.split(' Via ');

	return (
		<div style={{
			fontWeight: 'bold',
			color: '#FFA000',
			backgroundColor: 'black',
			display: 'flex',
			padding: 16,
			gap: 20,
			fontSize: 20,
			marginBottom: 10,
			alignItems: 'center',
		}}
		>
			{via ? <div style={{
				display: 'flex',
				flexDirection: 'column',
				textAlign: 'center',
			}}
			>
				<div>{destination}</div>
				<div>via {via}</div>
			</div> : <span>{longName}</span>}
			<span style={{
				marginLeft: 'auto',
				fontSize: 40,
			}}
			>{shortName}</span>
		</div>
	);
}

export default function Home() {
	const [viewport, setViewport] = useState({
		latitude: -36.850_213_1,
		longitude: 174.870_305_2,
		zoom: 10,
	});
	const [vehicles, setVehicles] = useState<Vehicles>([]);

	const [vehiclePopup, setVehiclePopup] = useState<Vehicle>();

	const [interactiveLayerIds, setInteractiveLayerIds] = useState<string[]>([]);

	const [isLoading, setIsLoading] = useState<boolean>(true);

	const [path, setPath] = useState<Array<[number, number]>>([]);

	if (process.env.NODE_ENV !== 'development') {
		useEffect(() => {
			console.log('%chttps://github.com/Richienb/transport-tracker', 'font-size: 16px; font-weight: bold');
		}, []);
	}

	useEffect(() => pIntervalStoppable(async () => {
		setIsLoading(true);

		setVehicles(await ky('/api/vehicles', {
			timeout: maxSafeTimeout,
		}).json<Vehicles>());

		setIsLoading(false);

		if (interactiveLayerIds.length === 0) {
			setInteractiveLayerIds([vehiclesId]);
		}
	}, 10_000), [interactiveLayerIds]);

	useEffect(() => {
		if (vehiclePopup) {
			setVehiclePopup(vehicles.find(({vehicleId}) => vehicleId === vehiclePopup.vehicleId));
		}
	}, [vehicles, vehiclePopup]);

	return (
		<>
			<Head>
				<title>AT Tracker</title>
				<meta name='description' content='Interactive map of Auckland Transport vehicles.' />
				<meta name='author' content='Richie Bendall' />
			</Head>

			<main>
				<MapGL
					{...viewport}
					width='100vw'
					height='100vh'
					mapStyle='mapbox://styles/mapbox/streets-v11'
					mapboxApiAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
					interactiveLayerIds={interactiveLayerIds}
					onViewportChange={setViewport}
					onNativeClick={({features}) => {
						const vehicleFeature = (features as MapInteractionEvent['features']).find(({layer}) => layer.id === vehiclesId);

						if (!vehicleFeature || vehicleFeature.properties.vehicleId === vehiclePopup?.vehicleId) {
							return;
						}

						setVehiclePopup(undefined);
						setVehiclePopup(vehicleFeature.properties as Vehicle);
					}}
				>
					{isLoading && <LinearProgress />}
					<GeolocateControl positionOptions={{
						enableHighAccuracy: true,
					}} style={{
						right: 0,
						margin: 16,
					}}
					/>
					<Source type='geojson' data={composeVehicleLocationSource(vehicles)}>
						<Layer id={vehiclesId} type='symbol' layout={{
							'icon-image': '{icon}',
							'icon-allow-overlap': true,
						}} paint={{
							'icon-opacity': 1,
						}}
						/>
					</Source>
					<Source type='geojson' data={composePathSource(path)}>
						<Layer
							type='line'
							layout={{
								'line-join': 'round',
								'line-cap': 'round',
							}}
							paint={{
								'line-color': 'rgba(3, 170, 238, 0.5)',
								'line-width': 5,
							}}
						/>
					</Source>
					{vehiclePopup && <Popup
						latitude={vehiclePopup.latitude}
						longitude={vehiclePopup.longitude}
						onClose={() => {
							setPath([]);
							setVehiclePopup(undefined);
						}}
					>
						<VehiclePopup value={vehiclePopup} onPath={(newPath: Array<[number, number]>) => {
							setPath(newPath);
						}}
						/>
					</Popup>}
				</MapGL>
			</main>
		</>
	);
}
