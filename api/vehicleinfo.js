require("dotenv").config()

const mem = require("mem")
const at = require("auckland-transport")

const getData = mem(async ({ routeId }) => {
	const [route] = await at(`gtfs/routes/routeId/${routeId}`, {
		key: process.env.AT_HOP_KEY
	})
	const { route_long_name: longName, route_short_name: shortName } = route
	return { longName, shortName }
}, {
	maxAge: 30000
})

module.exports = async (request, response) => {
	response.json(await getData({ routeId: request.query.routeId }))
}
