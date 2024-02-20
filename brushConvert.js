/*
 * Title: BrushConverter
 * Author: Aleksey Petrov (AlekPet)
 * Guthub: https://github.com/AlekPet
 * -----------------------------------
 * Info:
 * Old brush packs: https://github.com/mypaint/mypaint-brushes/releases/tag/pre_json_brushes
 * Folder "08" it is pack brush, put in root project
 * Folder "08_save" folder converted brush from mybrushlib.js
 * File "select_options.txt" includes after converted option tags for select tag brushes.
 */

const fs = require("fs");
const path = require("path");

const srcDirMyb = process.argv[2] ? process.argv[2] : "08";
const saveDir = process.argv[3] ? process.argv[saveDir] : `${srcDirMyb}_save`;

const pathBrushes = path.join(__dirname, srcDirMyb);
const saveBrushes = path.join(__dirname, saveDir);

if (!fs.existsSync(pathBrushes)) {
  console.error(new Error(`File path not exists "${pathBrushes}"`));
  process.exit(1);
}

const filterPropsMissing = ["#"];
const useJsonFile = true;

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

      if (ext === "png") {
        filename = correctionFilename(filename);
        filename = filename.replace("_prev", "");
        fs.copyFileSync(pathFile, path.join(saveBrushes, `${filename}.${ext}`));
      }
    });

    let countComplete = 0;
    let optionValues = "";
    Promise.all(promises).then((results) => {
      results.forEach((response) => {
        if (!Object.keys(response).length) return true;

        const {
          data,
          options: { filename },
        } = response;

        const dataToText = !useJsonFile
          ? `var ${filename} = ${JSON.stringify(data)}`
          : JSON.stringify(data);
        const fileSave = fs.createWriteStream(
          path.join(
            saveBrushes,
            `${filename}.myb.${!useJsonFile ? "js" : "json"}`
          )
        );

        optionValues += `<option value="${filename}" data-path="08_save/">${
          filename[0].toUpperCase() + filename.slice(1)
        }</option>\n`;

        fileSave.write(dataToText);
        countComplete += 1;
      });

      console.log(`Files converted ${countComplete} of ${promises.length}!`);
      const fileSaveOptions = fs.createWriteStream(
        path.join(__dirname, `select_options.txt`)
      );
      fileSaveOptions.write(optionValues, (err) => {
        if (err) console.log(err);
        console.log(`File 'select_options.txt' created!`);
      });
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
