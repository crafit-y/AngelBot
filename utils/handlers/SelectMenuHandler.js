const { promisify } = require("util");
const { glob } = require("glob");
const pGlob = promisify(glob);
const Logger = require("../Logger");

module.exports = async client => {
    (await pGlob(`${process.cwd()}/selectmenus/*/*.js`)).map(async selectMenuFile => {
        const selectMenu = require(selectMenuFile);


        if (!selectMenu.name) return Logger.warn(`SelectMenu name not found  ↓↓↓\nSelectMenu file: ${selectMenuFile}`);

        client.selectMenus.set(selectMenu.name, selectMenu);

        Logger.selectMenu(`Load -> ${selectMenu.name}`);
    })
}