const pngToIco = require('png-to-ico').default;
const fs = require('fs');
const path = require('path');

const inputPng = path.join(__dirname, 'src', 'assets', 'logo.png');
const outputIco = path.join(__dirname, 'public', 'app-icon.ico');

pngToIco(inputPng)
  .then(buf => {
    fs.writeFileSync(outputIco, buf);
    console.log('ICO file created successfully at:', outputIco);
  })
  .catch(err => {
    console.error('Error converting PNG to ICO:', err);
    process.exit(1);
  });
