const path = require("path");
const fs = require("fs");
const Handlebars = require("C:/Program Files/Foundry Virtual Tabletop/resources/app/node_modules/handlebars");

const dir = path.join(__dirname, "..", "templates");
let bad = 0;
for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith(".hbs")) continue;
  const src = fs.readFileSync(path.join(dir, f), "utf8");
  try {
    Handlebars.precompile(src);
    console.log("OK   " + f);
  } catch (e) {
    bad++;
    console.log("FAIL " + f + " :: " + e.message);
  }
}
process.exit(bad ? 1 : 0);
