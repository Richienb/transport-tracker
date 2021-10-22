import process from 'node:process';
import type {NextApiRequest, NextApiResponse} from 'next';
import at from 'auckland-transport';

export interface Vehicle {
	latitude: number;
	longitude: number;
	vehicleType: string;
	vehicleId: string;
	capacity: number;
	shortName?: string;
	longName?: string;
	licensePlate?: string;
	speed: number;
	tripId?: string;
}

export type Vehicles = Vehicle[];

const vehicleTypeMap = new Map([
	[2, 'rail'],
	[3, 'bus'],
	[4, 'ferry'],
]);

export default async function vehicleLocations(_request: NextApiRequest, response: NextApiResponse<Vehicles>) {
	const {entity} = await at<{
		header: {
			timestamp: number;
			gtfs_realtime_version: string;
			incrementality: number;
		};
		entity: Array<{
			id: string;
			vehicle: {
				trip?: {
					trip_id: string;
					start_time: string;
					start_date: string;
					schedule_relationship: number;
					route_id: string;
					direction_id: number;
				};
				position: {
					latitude: number;
					longitude: number;
					bearing?: number;
					odometer?: number;
					speed: number;
				};
				timestamp: number;
				vehicle: {
					id: string;
					label: string;
					license_plate: string;
				};
				occupancy_status?: number;
			};
			is_deleted: boolean;
		}>;
	}>('public/realtime/vehiclelocations', {apiKey: process.env.AT_HOP_KEY});

	const routes = await at<Array<{
		route_id: string;
		agency_id: string;
		route_short_name: string;
		route_long_name: string;
		route_desc: string | null;
		route_type: number;
		route_url: string | null;
		route_color: string | null;
		route_text_color: string | null;
	}>>('gtfs/routes', {apiKey: process.env.AT_HOP_KEY});

	const ferries = await at<Array<{
		mmsi: string;
		callsign: string;
		eta: string;
		lat: number;
		lng: number;
		operator: string;
		timestamp: string;
		vessel: string;
	}>>('public/realtime/ferrypositions', {apiKey: process.env.AT_HOP_KEY});

	response.statusCode = 200;
	response.setHeader('Cache-Control', 'Cache-Control: maxage=10, stale-while-revalidate=10, public');
	response.json([
		...entity
			.filter(({vehicle}) => vehicle.trip)
			.map(({vehicle}) => {
				const {route_type: vehicleType, route_short_name: shortName, route_long_name: longName} = routes.find(({route_id}) => vehicle.trip.route_id === route_id);

				return {
					routeId: vehicle.trip?.route_id,
					latitude: vehicle.position.latitude,
					longitude: vehicle.position.longitude,
					bearing: vehicle.position.bearing,
					licensePlate: vehicle.vehicle.license_plate,
					vehicleId: vehicle.vehicle.id,
					// https://developers.google.com/transit/gtfs-realtime/reference#enum-occupancystatus
					capacity: typeof vehicle.occupancy_status === 'number' ? vehicle.occupancy_status : undefined,
					vehicleType: vehicleTypeMap.get(vehicleType),
					shortName,
					longName,
					speed: vehicle.position.speed,
					vehicle,
					tripId: vehicle.trip?.trip_id,
				};
			}),
		...ferries.map(({lat: latitude, lng: longitude, callsign}) => {
			const {vehicle} = entity.find(({vehicle}) => vehicle.vehicle.license_plate === callsign);

			return {
				latitude,
				longitude,
				vehicleType: 'ferry',
				vehicle: entity.find(({vehicle}) => vehicle.vehicle.license_plate === callsign),
				vehicleId: vehicle.vehicle.id,
				capacity: typeof vehicle.occupancy_status === 'number' ? vehicle.occupancy_status : undefined,
				licensePlate: callsign,
				speed: vehicle.position.speed,
				tripId: vehicle.trip?.trip_id,
			};
		}),
	]);
}
