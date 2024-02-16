const fs = require("fs");
const path = require("path");
const pathBrushes = path.join(__dirname, "08");
const saveBrushes = path.join(__dirname, "08_save");

const filterPropsMissing = ["#", "version"];

function isinValidProp(str) {
  for (let p of filterPropsMissing) {
    if (str.startsWith(p)) return true;
  }
  return false;
}

const readFileAsync = (pathFile, options) => {
  return new Promise((res, rej) => {
    fs.readFile(pathFile, "utf8", (err, data) => {
      if (err) rej(err);

      let lines = data.split("\n");
      lines = lines.filter(
        (line) => line.trim() !== "" && !isinValidProp(line)
      );
      lines = lines.map((line) => getData(line));

      let endObj;
      lines.forEach((prop) => {
        endObj = { ...endObj, ...prop };
      });

      res({ data: endObj, options });
    });
  });
};

fs.mkdirSync(saveBrushes, {
  recursive: true,
});

fs.readdir(
  pathBrushes,
  {
    withFileTypes: true,
  },
  (err, files) => {
    if (err) throw err;

    const promises = [];

    files.forEach((file) => {
      if (file.isDirectory()) return;

      const pathFile = path.resolve(pathBrushes, file.name);

      const ext = path.extname(pathFile).slice(1);
      let filename = path.parse(pathFile).name;
      let filename_ext = file.name;

      if (ext === "myb") {
        if (/^[0-9]/g.test(filename)) {
          let filenameDigit = filename.match(/^([0-9]+)/)[0];
          filename = `${filename.replace(filenameDigit, "")}${filenameDigit}`;
          filename_ext = `${filename.replace(
            filenameDigit,
            ""
          )}${filenameDigit}.${ext}`;
        }
        promises.push(readFileAsync(pathFile, { filename_ext, filename }));
      }
    });

    Promise.all(promises).then((results) => {
      results.forEach((response) => {
        if (response) {
          const {
            data,
            options: { filename, filename_ext },
          } = response;
          const dataToText = `var ${filename} = ${JSON.stringify(data)}`;
          const fileSave = fs.createWriteStream(
            path.join(saveBrushes, `${filename_ext}.js`)
          );

          fileSave.write(dataToText);
          console.log(`Файл ${filename_ext}.js создан!`);
        }
      });
      console.log("Файлы созданы!");
    });
  }
);

// New version myb (json)
function convertMybToJs(pen) {
  let mybjs = {};
  for (let prop in pen.settings) {
    let { base_value, inputs: pointsList } = pen.settings[prop];
    if (Object.keys(pointsList).length) {
      const objp = {};
      Object.keys(pointsList).forEach((v) => {
        const currP = pointsList[v];
        if (Array.isArray(currP)) {
          objp[v] = currP.flat();
        }
      });

      mybjs[prop] = { base_value, pointsList: objp };
    } else {
      mybjs[prop] = { base_value };
    }
  }

  return mybjs;
}

// Old version myb
function getData(str) {
  const obj = {};
  if (str.includes("|")) {
    let vals = str.split("|").map((v) => v.trim());
    if (vals.length === 2) {
      const [name, propValue] = vals[0].split(" ").map((v) => v.trim());
      let propval = vals[1].split(" ").map((v) => v.trim());
      const propname = propval.shift();
      propval = propval.map((str) => Number(str.replace(/[(),]/g, "")));

      obj[name] = {
        base_value: parseFloat(propValue),
        pointsList: { [propname]: propval },
      };
    } else {
      console.log(`Error length > 2 -> ${vals}`);
    }
  } else {
    const [name, propValue] = str.split(" ").map((v) => v.trim());
    obj[name] = { base_value: parseFloat(propValue) };
  }
  return obj;
}
