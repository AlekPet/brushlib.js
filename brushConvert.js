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

function correctionFilename(filename) {
  if (/^[0-9]/g.test(filename)) {
    let filenameDigit = filename.match(/^([0-9]+)/)[0];
    filename = `${filename.replace(filenameDigit, "")}${filenameDigit}`;
  }

  if (filename.includes("-")) filename = filename.replaceAll("-", "_");
  filename = filename.replaceAll(/\W+/g, "");

  return filename;
}

const readFileAsync = (pathFile, options) => {
  return new Promise((res, rej) => {
    fs.readFile(pathFile, "utf8", (err, data) => {
      if (err) rej(err);

      let lines = data.split("\n");
      lines = lines.filter(
        (line) => line.trim() !== "" && !isinValidProp(line)
      );
      lines = lines.map((line) => getData(line, options.filename));

      const nulls = lines.filter((v) => v === null);
      if (nulls.length > 0) {
        res({});
      }

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

      if (ext === "myb") {
        filename = correctionFilename(filename);
        promises.push(readFileAsync(pathFile, { filename }));
      }
    });

    let countComplete = 0;
    Promise.all(promises).then((results) => {
      results.forEach((response) => {
        if (!Object.keys(response).length) return true;

        const {
          data,
          options: { filename },
        } = response;

        const dataToText = `var ${filename} = ${JSON.stringify(data)}`;
        const fileSave = fs.createWriteStream(
          path.join(saveBrushes, `${filename}.myb.js`)
        );

        fileSave.write(dataToText);
        countComplete += 1;
      });
      console.log(`FIles converted ${countComplete} of ${promises.length}!`);
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
function getData(str, filename) {
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
      const [name, propValue] = vals[0].split(" ").map((v) => v.trim());
      obj[name] = {
        base_value: parseFloat(propValue),
        pointsList: {},
      };

      for (let i = 1; i < vals.length; i++) {
        let propval = vals[i].split(" ").map((v) => v.trim());
        const propname = propval.shift();
        propval = propval.map((str) => Number(str.replace(/[(),]/g, "")));

        obj[name].pointsList = {
          ...obj[name].pointsList,
          ...{ [propname]: propval },
        };
      }
    }
  } else {
    const [name, propValue] = str.split(" ").map((v) => v.trim());
    obj[name] = { base_value: parseFloat(propValue) };
  }
  return obj;
}
