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

function convertBrushMain() {
  const sourceDir = process.argv[3];
  const distDir = process.argv[4];

  const srcDirMyb = sourceDir ? sourceDir.trim() : "packs_brushes";
  const pathBrushes = path.join(__dirname, srcDirMyb);

  if (!fs.existsSync(pathBrushes)) {
    console.error(new Error(`File path not exists "${pathBrushes}"`));
    process.exit(1);
  }

  const saveBrushes = distDir
    ? path.join(__dirname, distDir.trim())
    : path.join(__dirname, "brushes");

  const filterPropsMissing = ["#"];
  const useJsonFile = true;

  function isInvalidProp(str) {
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

  function readDataOldMyb(data, options) {
    let lines = data.split("\n");
    lines = lines.filter((line) => line.trim() !== "" && !isInvalidProp(line));
    lines = lines.map((line) => getData(line, options.filename));

    const nulls = lines.filter((v) => v === null);
    if (nulls.length > 0) {
      return null;
    }

    let endObj;
    lines.forEach((prop) => {
      endObj = { ...endObj, ...prop };
    });
    return endObj;
  }

  function readFileAsync(pathFile, options) {
    return new Promise((res, rej) => {
      fs.readFile(pathFile, "utf8", (err, data) => {
        if (err) rej(err);

        let endObj;
        try {
          const jsonData = JSON.parse(data);
          endObj = getDataJSON(jsonData, options);
        } catch (error) {
          // console.log("Not JSON file!");
          endObj = readDataOldMyb(data, options);
          if (endObj === null) rej({});
        }

        res({ data: endObj, options });
      });
    });
  }

  function readPacksDir(_dir) {
    // const saveBrushes = path.join(__dirname, "brushes");
    // const pathBrushes = path.join(__dirname, "packs_brushes");
    const promises = [];

    function readDirectories(dir) {
      const files = fs.readdirSync(dir, {
        withFileTypes: true,
      });

      files.forEach((file) => {
        const pathFile = path.resolve(dir, file.name);
        const relativePath = path.relative(pathBrushes, dir);
        const dest = path.join(saveBrushes, relativePath);
        const destToFile = path.join(dest, file.name);

        if (file.isDirectory()) {
          fs.mkdirSync(destToFile, {
            recursive: true,
          });

          return readDirectories(pathFile);
        }

        const ext = path.extname(pathFile).slice(1);
        let filename = path.parse(pathFile).name;

        if (ext === "myb") {
          filename = correctionFilename(filename);
          promises.push(readFileAsync(pathFile, { filename, dest }));
        }

        if (ext === "png") {
          filename = correctionFilename(filename);
          filename = filename.replace("_prev", "");
          fs.copyFileSync(pathFile, path.join(dest, `${filename}.${ext}`));
        }
      });
    }

    // First run directory
    readDirectories(_dir);

    let countComplete = 0;
    Promise.all(promises).then((results) => {
      results.forEach((response) => {
        if (!Object.keys(response).length) return true;

        const {
          data,
          options: { filename, dest },
        } = response;

        const dataToText = !useJsonFile
          ? `var ${filename} = ${JSON.stringify(data)}`
          : JSON.stringify(data);

        const fileSave = fs.createWriteStream(
          path.join(dest, `${filename}.myb.${!useJsonFile ? "js" : "json"}`)
        );

        fileSave.write(dataToText);
        countComplete += 1;
      });

      console.log(`Files converted ${countComplete} of ${promises.length}!`);

      runMakeJSONAfterConvert();
    });
  }

  // Read direcory packs_brushes
  readPacksDir(path.join(__dirname, "packs_brushes"));

  // New version myb (json)
  function getDataJSON(pen, options) {
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

    return { data: mybjs, options };
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
}

async function getAvailableBrushes() {
  const listBrushed = {
    brushes: [],
  };
  const sourceDir = path.join(__dirname, "brushes");

  async function readDir(dir) {
    const files = fs.readdirSync(dir, {
      withFileTypes: true,
    });

    files.forEach((file) => {
      const source = path.join(dir, file.name);

      if (file.isDirectory()) {
        if (!listBrushed.hasOwnProperty.call(listBrushed, file.name)) {
          listBrushed[file.name] = [];
        }
        return readDir(source);
      }

      const pathFile = path.resolve(dir, file.name);

      const { ext, name: filename } = path.parse(pathFile);
      let pathRelative = path.relative(sourceDir, dir);

      if (ext === ".json") {
        let keyObject = pathRelative;
        if (pathRelative === "") {
          keyObject = "brushes";
        }

        listBrushed[keyObject].push({
          // file: file.name,
          filename: filename.replace(".myb", ""),
          path: pathRelative,
          // path_json: path.join(pathRelative, file.name),
        });
      }
    });

    return files;
  }

  await readDir(sourceDir);
  fs.writeFileSync(
    path.join(__dirname, "js", "brushes_data.json"),
    JSON.stringify(listBrushed)
  );
  console.log(
    `Complete:
Brushes files get: ${Object.keys(listBrushed).reduce(
      (acc, cur) => acc + listBrushed[cur].length,
      0
    )}, foldres ${Object.keys(listBrushed).length}`
  );
}

function runMakeJSONAfterConvert() {
  const readline = require("readline");
  const readLine = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  readLine.question("Make json file avaiables brushes?: ", (textInput) => {
    const answer = textInput.trim().toLowerCase();
    if (["y", "yes", "1", "ok"].includes(answer)) {
      getAvailableBrushes();
    }
    readLine.close();
  });
}

function init() {
  if (!process.argv[2] || process.argv[2] === "convert") {
    convertBrushMain();
  }

  if (process.argv[2] === "getbrush") {
    getAvailableBrushes();
  }
}

init();
