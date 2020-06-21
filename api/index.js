const ejs = require("ejs")

module.exports = async (_, response) => {
	response.send(await ejs.renderFile("views/index.ejs"))
}
