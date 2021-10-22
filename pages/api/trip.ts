import type {NextApiRequest, NextApiResponse} from 'next';
import at from 'auckland-transport';

export interface Trip {
	path: Array<[number, number]>;
}

export default async function tripInfo(request: NextApiRequest, response: NextApiResponse<Trip>) {
	const [{
		shape_id: shapeId,
	}] = await at<Array<{
		route_id: string;
		service_id: string;
		trip_id: string;
		trip_headsign: string;
		direction_id: number;
		block_id: string | null;
		shape_id: string;
		trip_short_name: string | null;
		trip_type: number | null;
	}>>(`gtfs/trips/tripId/${request.query.tripId as string}`, {
		apiKey: process.env.AT_HOP_KEY,
	});

	const shape = await at<Array<{
		shape_id: string;
		shape_pt_lat: number;
		shape_pt_lon: number;
		shape_pt_sequence: number;
		shape_dist_traveled: number | null;
	}>>(`gtfs/shapes/shapeId/${shapeId}`, {
		apiKey: process.env.AT_HOP_KEY,
	});

	response.statusCode = 200;
	response.setHeader('Cache-Control', 'Cache-Control: maxage=30, stale-while-revalidate=30, public');
	response.json({
		path: shape.map(({shape_pt_lat: latitude, shape_pt_lon: longitude}) => [longitude, latitude]),
	});
}
