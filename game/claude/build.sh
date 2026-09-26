#!/bin/sh
# Inlines every src/*.js module (in filename order) into src/shell.html,
# producing the single self-contained game file: index.html
set -e
cd "$(dirname "$0")"
node -e '
const fs = require("fs");
const files = fs.readdirSync("src").filter(f => f.endsWith(".js")).sort();
const js = files.map(f => "// ==== " + f + " ====\n" + fs.readFileSync("src/" + f, "utf8")).join("\n");
const shell = fs.readFileSync("src/shell.html", "utf8");
fs.writeFileSync("index.html", shell.replace("/*__GAME_JS__*/", () => "(function(){\n" + js + "\n})();"));
console.log("built index.html from " + files.length + " modules, " + (fs.statSync("index.html").size / 1024).toFixed(1) + " KB");
'
