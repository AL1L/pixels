const fs = require('fs');
const path = require('path')

const dir = fs.readdirSync("rooms");

for(let roomFile of dir) {
  const data = JSON.parse(fs.readFileSync(path.join("rooms", roomFile)));

  console.log(data.name);
}
