const { promisify } = require("util");
const { glob } = require("glob");
const pGlob = promisify(glob);
const Logger = require("../Logger");

module.exports = async client => {
    (await pGlob(`${process.cwd()}/buttons/*/*.js`)).map(async buttonFile => {
        const button = require(buttonFile);


        if (!button.name) return Logger.warn(`Button name not found  ↓↓↓\nButton file: ${buttonFile}`);

        client.buttons.set(button.name, button);

        Logger.button(`Load -> ${button.name}`);
    })
}