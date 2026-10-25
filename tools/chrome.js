/* Localiza o executavel do Chrome de forma portavel.
 * Definir a variavel de ambiente CHROME_PATH tem prioridade.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");

function acharChrome() {
  const env = process.env.CHROME_PATH;
  if (env) {
    if (!fs.existsSync(env)) {
      console.error("ERRO: CHROME_PATH aponta para um arquivo inexistente: " + env);
      process.exit(1);
    }
    return env;
  }

  const candidatos = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    path.join(os.homedir(), "AppData\\Local\\Google\\Chrome\\Application\\chrome.exe"),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/snap/bin/chromium",
  ];

  for (const c of candidatos) {
    if (fs.existsSync(c)) return c;
  }

  console.error("ERRO: nao encontrei o Chrome.");
  console.error("Defina a variavel de ambiente CHROME_PATH com o caminho do executavel.");
  process.exit(1);
}

module.exports = { acharChrome };
