const ejs = require("ejs")

module.exports = (_, response) => {
	response.send(ejs.renderFile("index.ejs"))
}
