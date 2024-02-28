// Wacom Browser Plugin can be download from
// http://www.wacom.com/CustomerCare/Plugin.aspx

function findPos(obj) {
  var curleft = (curtop = 0);
  if (obj.offsetParent) {
    curleft = obj.offsetLeft;
    curtop = obj.offsetTop;
    while ((obj = obj.offsetParent)) {
      curleft += obj.offsetLeft;
      curtop += obj.offsetTop;
    }
  }
  return { x: curleft, y: curtop };
}

async function getDataJSON(url) {
  try {
    const response = await fetch(url);
    const jsonData = await response.json();

    return jsonData;
  } catch (error) {
    return new Error(error);
  }
}

class Manager {
  _instance = null;
  constructor() {
    if (Manager._instance) {
      return Manager._instance;
    }

    Manager._instance = this;

    this.basePath = `/brushlib.js`;

    this.surface;
    this.brush;
    this.brushName = "charcoal";
    this.currentBrushSetting = {};
    this.t1;
    this.canvas;

    this.onLoad();
  }

  async onLoad() {
    if (null != document.getElementById("NotSupported")) {
      alert(
        "Many apologies.  This demo is not supported on Internet Explorer. Please try Firefox!"
      );
      return;
    }

    this.canvas = document.createElement("canvas");
    this.canvas.width = 800;
    this.canvas.height = 500;
    document.querySelector(".box__canvas").append(this.canvas);

    this.surface = new MypaintSurface(this.canvas);

    this.currentBrushSetting = await getDataJSON(
      `${this.basePath}/brushes/${this.brushName}.myb.json`
    );
    this.brush = new MypaintBrush(this.currentBrushSetting, this.surface);

    this.pointerMoveHandler = this.pointermove.bind(this);
    this.canvas.addEventListener("pointerdown", this.pointerdown.bind(this));
    this.canvas.addEventListener("pointerup", this.pointerup.bind(this));
    this.canvas.addEventListener("pointermove", this.pointerMoveHandler);

    // --- color h,s,v
    this.color_h = document.getElementById("color_h");
    this.color_s = document.getElementById("color_s");
    this.color_v = document.getElementById("color_v");

    this.color_h.addEventListener("change", this.colorchanged.bind(this));
    this.color_s.addEventListener("change", this.colorchanged.bind(this));
    this.color_v.addEventListener("change", this.colorchanged.bind(this));

    // ---
    this.divelapse = document.getElementById("divelapse");
    // --
    this.mousepressure = document.getElementById("mousepressure");
    this.mousepressure.addEventListener(
      "change",
      this.pressurechanged.bind(this)
    );
    // ---
    this.dab_count = document.getElementById("dab_count");
    this.getcolor_count = document.getElementById("getcolor_count");
    // ---
    this.colorbox = document.getElementById("colorbox");
    // ---
    this.bsel = document.getElementById("brushselector");
    this.bsel.addEventListener("change", this.selectbrush.bind(this));

    const brushesData = await getDataJSON(
      `${this.basePath}/js/brushes_data.json`
    );

    let currentDir = null;
    Object.keys(brushesData).forEach((dir) => {
      const currentDirVals = brushesData[dir];
      if (!currentDir) currentDir = dir;

      if (currentDir !== dir) {
        const option = document.createElement("option");
        option.value = "separator";
        option.textContent = `-------------- ${dir} --------------`;
        currentDir = dir;
        this.bsel.append(option);
      }

      currentDirVals.forEach((brushData) => {
        const { filename, path } = brushData;
        const option = document.createElement("option");
        option.value = filename;
        option.textContent = filename[0].toUpperCase() + filename.slice(1);
        option.dataset.path = `brushes/${path}/`;

        if (filename === "charcoal") option.selected = true;

        this.bsel.append(option);
        currentDir = dir;
      });
    });

    // ---
    this.brush_img = document.getElementById("brush_img");

    this.brush_img.onerror = function () {
      this.src = "/brushlib.js/assets/img/image_invalid.svg";
    };

    this.cls = document.getElementById("cls_canvas");
    this.cls.addEventListener("click", this.clearCanvas.bind(this));

    this.updateui(this.currentBrushSetting);
  }

  clearCanvas() {
    this.surface.clearCanvas();
  }

  pointerdown(evt) {
    // console.log('down', evt)
    let curX = evt.clientX;
    let curY = evt.clientY;

    this.canvas.addEventListener("pointermove", this.pointerMoveHandler);

    this.t1 = new Date().getTime();
    this.brush.new_stroke(curX, curY);

    this.divelapse.innerHTML = `X: ${curX} Y: ${curY}`;
  }

  pointerup(evt) {
    // console.log("up", evt);
    this.canvas.removeEventListener("pointermove", this.pointerMoveHandler);

    this.updatestatus();
  }

  pointermove(evt) {
    const plugin = document.embeds["wacom-plugin"];
    let { pressure: pressurePointer, pointerType, button } = evt;
    let pressure = this.mousepressure.value / 100;
    let isEraser;
    let curX = 0;
    let curY = 0;

    // Pen
    if (pointerType === "pen") {
      if (plugin) {
        pressure = plugin.pressure;
        isEraser = plugin.isEraser;
      }

      // Pointer pressure
      if (!pressure) pressure = pressurePointer;
      if (button === 5) isEraser = true;

      if (!isEraser) isEraser = false;
      if ((!pressure && !pressurePointer) || pressure === 0)
        pressure = this.mousepressure.value / 100;
    }

    // Mouse
    if (pointerType === "mouse" || pointerType === "touch") {
      if (pressure === undefined || pressure === 0) {
        pressure = this.mousepressure.value / 100;
      }
      isEraser = false;
    }

    curX = evt.clientX;
    curY = evt.clientY;

    this.mousepressure.nextElementSibling.textContent = pressure;

    this.divelapse.innerHTML = `X: ${curX} Y: ${curY}`;

    const time = (new Date().getTime() - this.t1) / 1000;
    this.brush.stroke_to(this.surface, curX, curY, pressure, 90, 0, time);
  }

  updatestatus() {
    //how many dab is drawn for this stroke ?
    this.dab_count.innerHTML = this.surface.dab_count;
    //how may calls to getcolor ?
    this.getcolor_count.innerHTML = this.surface.getcolor_count;
    //time elpase for this stroke
    this.divelapse.innerHTML = new Date().getTime() - this.t1;
  }

  updateui() {
    this.color_h.value = this.currentBrushSetting.color_h.base_value * 100;
    this.color_s.value = this.currentBrushSetting.color_s.base_value * 100;
    this.color_v.value = this.currentBrushSetting.color_v.base_value * 100;

    this.color_h.nextElementSibling.textContent = this.color_h.value;
    this.color_s.nextElementSibling.textContent = this.color_s.value;
    this.color_v.nextElementSibling.textContent = this.color_v.value;

    this.colorbox.innerHTML = this.brushName;

    this.colorchanged();
  }

  pressurechanged() {
    this.mousepressure.nextElementSibling.textContent = (
      this.mousepressure.value / 100
    ).toFixed(2);
  }

  colorchanged() {
    const bs = this.currentBrushSetting;

    bs.color_h.base_value = this.color_h.value / 100;
    bs.color_s.base_value = this.color_s.value / 100;
    bs.color_v.base_value = this.color_v.value / 100;
    this.brush.readmyb_json(bs);

    this.color_h.nextElementSibling.textContent =
      bs.color_h.base_value.toFixed(2);
    this.color_s.nextElementSibling.textContent =
      bs.color_s.base_value.toFixed(2);
    this.color_v.nextElementSibling.textContent =
      bs.color_v.base_value.toFixed(2);

    const colorhsv = new ColorHSV(
      bs.color_h.base_value,
      bs.color_s.base_value,
      bs.color_v.base_value
    );
    colorhsv.hsv_to_rgb_float();

    let rr = Math.floor(colorhsv.r * 255).toString(16);
    let gg = Math.floor(colorhsv.g * 255).toString(16);
    let bb = Math.floor(colorhsv.b * 255).toString(16);

    if (rr.length < 2) rr = `0${rr}`;
    if (gg.length < 2) gg = `0${gg}`;
    if (bb.length < 2) bb = `0${bb}`;

    this.colorbox.style.backgroundColor = "#" + rr + gg + bb;
  }

  async selectbrush() {
    const brushName = this.bsel.options[this.bsel.selectedIndex].value;
    const pathToBrush = this.bsel.options[this.bsel.selectedIndex].dataset.path;

    if (brushName === "separator" || !pathToBrush) {
      console.error("Not isset path dataset or brush name incorrect!");
      return;
    }

    this.brushName = brushName;

    const pathToJsonBrush = `${this.basePath}/${pathToBrush}${this.brushName}`;
    this.currentBrushSetting = await getDataJSON(`${pathToJsonBrush}.myb.json`);

    this.brush = new MypaintBrush(this.currentBrushSetting, this.surface);
    this.brush_img.src = `${pathToJsonBrush}.png`;

    this.updateui();
  }
}

document.addEventListener("DOMContentLoaded", () => new Manager());
