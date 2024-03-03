const chalk = require('chalk');
const dayjs = require('dayjs');

const format = '{tstamp} {tag} {txt}\n';

function error(content) {
  write(content, 'black', 'bgRed', 'ERROR', 'red', true);
}

function warn(content) {
  write(content, 'black', 'bgYellow', 'WARN', 'yellow', false);
}

function typo(content) {
  write(content, 'black', 'bgCyan', 'TYPO', 'cyan', false);
}

function command(content) {
  write(content, 'black', 'bgMagenta', 'CMD', 'green', false);
}

// function button(content) {
//   write(content, 'white', 'bgMagenta', 'BTN', 'green', false);
// }

// function modal(content) {
//   write(content, 'white', 'bgMagenta', 'MDL', 'green', false);
// }

// function selectMenu(content) {
//   write(content, 'white', 'bgMagenta', 'SLM', 'green', false);
// }

function event(content) {
  write(content, 'black', 'bgGreen', 'EVT', 'green', false);
}

function client(content) {
  write(content, 'black', 'bgBlue', 'CLIENT', 'blue', false);
}

function clientError(content) {
  write(content, 'black', 'bgRed', 'CLIENT', 'red', false);
}

function write(content, tagColor, bgTagColor, tag, textColor, error = false) {
  const timestamp = `[${dayjs().format('DD/MM - HH:mm:ss')}]`;
  const logTag = `[${tag}]`;
  const stream = error ? process.stderr : process.stdout;

  const item = format
    .replace('{tstamp}', chalk.gray(timestamp))
    .replace('{tag}', chalk[bgTagColor][tagColor](logTag))
    .replace('{txt}', chalk[textColor](content));

  stream.write(item);
}

module.exports = { error, warn, typo, command, event, client, clientError };