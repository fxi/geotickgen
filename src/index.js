/**
 * Style in style_gtg.css
 */
const DEFAULT_OPTIONS = {
  ticks: {
    sizeMinor: 10,
    sizeMajor: 20,
    nStepMinor: 50,
    nStepMajor: 10, // nStepMinor divider
    enableLat: true,
    enableLng: true,
    fontSize: 12,
    offsetLabel: 4,
    offsets: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
  },
};

/***
 * mapbox gl plugin to display lat/long ticks in left and bottom border of the map
 */
export class GeoTickGen {
  constructor(map, userOptions = {}) {
    const gtg = this;
    gtg.map = map;
    gtg.options = { ...DEFAULT_OPTIONS, ...userOptions };

    gtg.init();
  }

  init() {
    const gtg = this;
    const container = gtg.map.getContainer();
    gtg.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    gtg.svg.classList.add("gtg-container");
    container.appendChild(gtg.svg);
    gtg.map.once("load", () => {
      gtg.map.on("move", () => gtg.update());
      gtg.update();
    });
  }

  /**
   * Mouse debug
   * gtg.map.on("click", gtg.mouseDebug.bind(gtg));
   */
  mouseDebug(e) {
    const x = e.point.x;
    const y = e.point.y;
    const lat = e.lngLat.lat;
    const lng = e.lngLat.lng;
    console.table({
      lat,
      lng,
      x,
      y,
    });
  }

  clear() {
    const gtg = this;
    while (gtg.svg.firstChild) {
      gtg.svg.removeChild(gtg.svg.firstChild);
    }
  }

  get size() {
    const gtg = this;
    return gtg.map.getContainer().getBoundingClientRect();
  }

  get width() {
    const gtg = this;
    return gtg.size.width;
  }
  get height() {
    const gtg = this;
    return gtg.size.height;
  }

  update() {
    const gtg = this;
    gtg.clear();
    const addLat = gtg.options.ticks.enableLat;
    const addLng = gtg.options.ticks.enableLng;
    if (addLat) gtg.buildTicks("lat");
    if (addLng) gtg.buildTicks("lng");
  }
  buildTicks(type) {
    const gtg = this;
    // Create series
    const series = gtg.createSeries(type);

    // For each value in the series
    for (let i = 0, iL = series.length; i < iL; i++) {
      const isFirst = i === 0;
      const item = series[i];
      const label = item.label;
      const tick = item.tick;

      const rect = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "rect"
      );
      rect.classList.add("gtg-outline");
      rect.setAttribute("x", tick.x);
      rect.setAttribute("y", tick.y);
      rect.setAttribute("width", tick.width);
      rect.setAttribute("height", tick.height);

      gtg.svg.appendChild(rect);

      // Add label for major ticks
      if (label && !isFirst) {
        const text = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "text"
        );
        text.classList.add("gtg-outline");
        text.setAttribute("x", label.x);
        text.setAttribute("y", label.y);
        text.setAttribute(
          "transform",
          `rotate(${label.rotation}, ${label.x}, ${label.y})`
        );
        text.style.fontSize = `${label.size}px`;
        text.textContent = label.text;

        gtg.svg.appendChild(text);
      }
    }
  }

  get bounds() {
    const gtg = this;
    const x = gtg.width;
    const y = gtg.height;
    /*
     *
     *  nw 0,0       ne x,0
     *    ┌──────────┐
     *    │          │
     *    │          │
     *    │          │
     *    │          │
     *    │          │
     *    └──────────┘
     *  sw 0,y       se x,y
     */
    const nw = gtg.map.unproject([0, 0]);
    const se = gtg.map.unproject([x, y]);
    const sw = gtg.map.unproject([0, y]);
    const ne = gtg.map.unproject([x, 0]);
    return { ne, se, sw, nw };
  }

  createSeries(type) {
    const gtg = this;
    const series = [];
    const nStepMinor = gtg.options.ticks.nStepMinor;
    const nStepMajor = gtg.options.ticks.nStepMajor;
    const sizeMn = gtg.options.ticks.sizeMinor;
    const sizeMj = gtg.options.ticks.sizeMajor;
    const sizeFont = gtg.options.ticks.fontSize;
    const lo = gtg.options.ticks.offsetLabel;
    const h = gtg.height;
    const isLat = type === "lat";

    if (nStepMinor % nStepMajor !== 0) {
      throw new Error("nStepMajor must be a divider of nStepMinor");
    }

    const b = gtg.bounds;

    const min = isLat
      ? { lng: b.sw.lng, lat: b.sw.lat }
      : { lng: b.sw.lng, lat: b.sw.lat };
    const max = isLat
      ? { lng: b.nw.lng, lat: b.nw.lat }
      : { lng: b.se.lng, lat: b.se.lat };

    const stepLat = (max.lat - min.lat) / nStepMinor;
    const stepLng = (max.lng - min.lng) / nStepMinor;

    for (let i = 0; i <= nStepMinor; i++) {
      const dLat = min.lat + i * stepLat;
      const dLng = min.lng + i * stepLng;
      const isMajor = i % (nStepMinor / nStepMajor) === 0;
      const size = isMajor ? sizeMj : sizeMn;
      const pixelPoint = gtg.map.project([dLng, dLat]);

      const tick = {
        y: isLat ? pixelPoint.y : h - size,
        x: isLat ? 0 : pixelPoint.x,
        height: isLat ? 1 : size,
        width: isLat ? size : 1,
      };
      const item = {
        tick,
      };
      if (isMajor) {
        item.label = {
          y: isLat ? tick.y + sizeFont / 2 : h - sizeMj - lo,
          x: isLat ? size + lo : tick.x,
          text: gtg.convertDMS(isLat ? dLat : dLng),
          rotation: isLat ? 0 : -45,
          size: sizeFont,
        };
      }
      series.push(item);
    }
    return series;
  }

  convertDMS(degree) {
    const isSouth = degree < 0;
    const absDegree = Math.abs(degree);
    const degrees = Math.floor(absDegree);
    const minFloat = (absDegree - degrees) * 60;
    const minutes = Math.floor(minFloat);
    const secFloat = (minFloat - minutes) * 60;
    const seconds = secFloat.toFixed(0);
    return `${isSouth ? "S" : "N"} ${degrees}° ${minutes}' ${seconds}" `;
  }
}
