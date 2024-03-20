const Greeting = require("./Base");

module.exports = class Welcome extends Greeting {
    constructor() {
        super();
        this.textTitle = "A rejoint";
        this.textMessage = "Bienvenue sur {server}";
        this.message = "Hop ! Un nouveau membre !";
        this.colorTitle = "#03A9F4";
    }
};
