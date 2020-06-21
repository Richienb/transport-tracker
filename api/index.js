const ejs = require("ejs")
const path = require("path")

module.exports = async (_, response) => {
	response.send(await ejs.renderFile(path.resolve(__dirname, "../views/index.ejs")))
}
