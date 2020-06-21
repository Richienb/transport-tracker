require("dotenv").config()

const mem = require("mem")
const dotProp = require("dot-prop")
const at = require("auckland-transport")

const getData = mem(async () => {
	const { entity } = await at("public/realtime/vehiclelocations", { key: process.env.AT_HOP_KEY })
	return entity.map(({ vehicle }) => ({
		routeId: dotProp.get(vehicle, "trip.route_id"),
		latitude: vehicle.position.latitude,
		longitude: vehicle.position.longitude,
		licensePlate: vehicle.vehicle.license_plate
	}))
}, {
	maxAge: 30000
})

module.exports = async (_, response) => {
	response.json(await getData())
}
