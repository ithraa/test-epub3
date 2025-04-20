const fs = require("fs");
const files = [
  "src/assets/43/OEBPS/Text/cover.xhtml",
  "src/assets/43/OEBPS/css/general-ithraa-template-v1.1.css"
];
files.forEach(file => {
  const content = fs.readFileSync(file);
  fs.writeFileSync(file, content, { encoding: "utf8" });
});
