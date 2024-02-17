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

class Manager {
  _instance = null;
  constructor() {
    if (Manager._instance) {
      return Manager._instance;
    }

    Manager._instance = this;

    this.surface;
    this.brush;
    this.brushname = "charcoal";
    this.t1;
    this.canvas;
    this.canvasPos = { x: 0.0, y: 0.0 };
    this.lastX;
    this.lastY;
    this.iPad = navigator.userAgent.match(/iPad/i) !== null;
    this.onLoad();
  }

  onLoad() {
    if (null != document.getElementById("NotSupported")) {
      alert(
        "Many apologies.  This demo is not supported on Internet Explorer. Please try Firefox!"
      );
      return;
    }
    this.canvas = document.getElementById("thecanvas");
    this.canvasPos = findPos(this.canvas);

    this.surface = window.surface = new MypaintSurface("thecanvas");
    this.brush = new MypaintBrush(charcoal);

    this.pointerMoveHandler = this.mousedrag.bind(this);
    this.canvas.addEventListener("pointerdown", this.mousedown.bind(this));
    this.canvas.addEventListener("pointerup", this.mouseup.bind(this));
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
    // ---
    this.dab_count = document.getElementById("dab_count");
    this.getcolor_count = document.getElementById("getcolor_count");
    // ---
    this.colorbox = document.getElementById("colorbox");
    // ---
    this.bsel = document.getElementById("brushselector");
    this.bsel.addEventListener("change", this.selectbrush.bind(this));

    this.brush_img = document.getElementById("brush_img");

    this.updateui(charcoal);
  }

  mousedown(evt) {
    // console.log('down', evt)
    if (this.iPad) {
      const touchEvt = evt.touches.item(0);
      this.lastX = touchEvt.clientX - this.canvasPos.x;
      this.lastY = touchEvt.clientY - this.canvasPos.y;
    } else {
      this.lastX = evt.clientX - this.canvasPos.x;
      this.lastY = evt.clientY - this.canvasPos.y;
    }
    this.canvas.addEventListener("pointermove", this.pointerMoveHandler);

    this.t1 = new Date().getTime();
    this.brush.new_stroke(this.lastX, this.lastY);

    this.mousedrag(evt);
    this.divelapse.innerHTML = `X: ${this.lastX} Y: ${this.lastY}`;
  }

  mouseup(evt) {
    // console.log("up", evt);
    this.canvas.removeEventListener("pointermove", this.pointerMoveHandler);

    this.updatestatus();
  }

  mousedrag(evt) {
    const plugin = document.embeds["wacom-plugin"];
    let { pressure: pressurePointer, pointerType, button } = evt;
    let pressure;
    let isEraser;
    let curX = 0;
    let curY = 0;

    console.log(pressurePointer, pointerType, button, evt.touches);

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

      curX = evt.clientX - this.canvasPos.x;
      curY = evt.clientY - this.canvasPos.y;
    }

    // Touch
    // if (pointerType === "touch") {
    //   const touchEvt = evt.touches.item(0);
    //   curX = touchEvt.clientX - this.canvasPos.x;
    //   curY = touchEvt.clientY - this.canvasPos.y;
    //   evt.preventDefault();
    //   pressure = this.mousepressure.value / 100;
    //   isEraser = false;
    // }

    this.divelapse.innerHTML = `X: ${curX} Y: ${curY}`;

    const time = (new Date().getTime() - this.t1) / 1000;
    this.brush.stroke_to(this.surface, curX, curY, pressure, 90, 0, time);

    this.lastX = curX;
    this.lastY = curY;
  }

  updatestatus() {
    //how many dab is drawn for this stroke ?
    this.dab_count.innerHTML = this.surface.dab_count;
    //how may calls to getcolor ?
    this.getcolor_count.innerHTML = this.surface.getcolor_count;
    //time elpase for this stroke
    this.divelapse.innerHTML = new Date().getTime() - this.t1;
  }

  updateui(brushsetting) {
    this.color_h.value = brushsetting.color_h.base_value * 100;
    this.color_s.value = brushsetting.color_s.base_value * 100;
    this.color_v.value = brushsetting.color_v.base_value * 100;

    this.colorbox.innerHTML = this.brushname;

    this.colorchanged();
  }

  colorchanged() {
    const bs = window[this.brushname];
    bs.color_h.base_value = this.color_h.value / 100;
    bs.color_s.base_value = this.color_s.value / 100;
    bs.color_v.base_value = this.color_v.value / 100;
    this.brush.readmyb_json(bs);

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

  selectbrush() {
    this.brushname = this.bsel.options[this.bsel.selectedIndex].value;

    if (this.brushname === "separator") return;

    const pathToBrush = this.bsel.options[this.bsel.selectedIndex].dataset.path;

    this.brush_img.src = `${pathToBrush}${this.brushname}.png`;

    const script = document.createElement("script");
    script.setAttribute(
      "src",
      "/brushlib.js/" + pathToBrush + this.brushname + ".myb.js"
    );
    script.setAttribute("id", "brushscript");
    document.documentElement.firstChild.append(script);

    const loadbrush = `manager = new Manager();
    manager.brush=new MypaintBrush(${this.brushname});
    manager.updateui(${this.brushname});`;
    setTimeout(loadbrush, 1000); //wait for one second to load the script
  }
}

document.addEventListener("DOMContentLoaded", () => new Manager());
