const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "node_modules", "expo-crypto", "tsconfig.json");

if (!fs.existsSync(target)) {
  process.exit(0);
}

const raw = fs.readFileSync(target, "utf8");
const from = '"extends": "expo-module-scripts/tsconfig.base"';
const to = '"extends": "../expo-module-scripts/tsconfig.base.json"';

if (!raw.includes(from)) {
  process.exit(0);
}

const next = raw.replace(from, to);
fs.writeFileSync(target, next, "utf8");
