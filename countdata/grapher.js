const Jimp = require('jimp');

const GRAPH_WIDTH = 1024;
const GRAPH_HEIGHT = 256;

const BACKGROUND_GRADIENT = {
    0: [50, 16, 92],
    1: [25, 11, 54]
};

const CURVE_GRADIENT = {
    0: [255, 50, 200],
    1.2: [0, 0, 0]
};

function lerp(a, b, t) {
    if (typeof(a) != typeof(b)) throw new Error('Lerp: A and B must be of the same type, got '+typeof(a)+' and '+typeof(b));

    if (typeof(a) == 'number') {
        return a + (b - a) * t;
    } else if(a.length && b.length && a.length == b.length) {
        return a.map((v, i) => lerp(v, b[i], t));
    } else {
        throw new Error('Lerp: Arrays must have the same, non-zero length.');
    }
}

function gradient(points, t) {
    const keys = Object.keys(points).map(k => parseFloat(k));
    keys.sort();

    let keyA = undefined;
    let keyB = undefined;

    for (const key of keys) {
        if (key <= t && (keyA === undefined || keyA < key)) {
            keyA = key;
        }

        if (key > t && (keyB === undefined || keyB > key)) {
            keyB = key;
        }
    }

    const subT = (t - keyA) / (keyB - keyA);

    if (keyA == undefined) console.log('undef A');
    if (keyB == undefined) console.log('undef B, '+t);

    return lerp(points[keyA], points[keyB], subT);
}

async function createGraph(timedNumbers, filePath) {
    const image = new Jimp(GRAPH_WIDTH, GRAPH_HEIGHT);

    let minTime = Infinity;
    let maxTime = -Infinity;

    for (const time of Object.keys(timedNumbers).map(k => parseFloat(k))) {
        if (minTime > time) minTime = time;
        if (maxTime < time) maxTime = time; 
    }

    let lastCurveHeight;
    for (let x = 0; x<GRAPH_WIDTH; x++) {
        const value = gradient(timedNumbers, minTime + x / GRAPH_WIDTH * (maxTime - minTime));
        const curveHeight = value / 1000 * GRAPH_HEIGHT;
        image.scan(x, 0, 1, GRAPH_HEIGHT, function (_x, y, offset) {
            let pixelColor = [0, 0, 0];

            function addColor(col) { pixelColor[0]+=col[0]; pixelColor[1]+=col[1]; pixelColor[2]+=col[2]; };

            addColor(gradient(BACKGROUND_GRADIENT, y / GRAPH_HEIGHT));


            if (GRAPH_HEIGHT-y < Math.floor(curveHeight)) {
                addColor(gradient(CURVE_GRADIENT, y / GRAPH_HEIGHT));
            }

            pixelColor = pixelColor.map(comp => Math.min(comp, 255));
            
            this.bitmap.data.writeUInt32BE(Jimp.rgbaToInt(pixelColor[0], pixelColor[1], pixelColor[2], 255), offset, true);
        });

        if (lastCurveHeight !== undefined) {
            for (let i = 0; i<Math.abs(lastCurveHeight-curveHeight); i++) {
                let y = GRAPH_HEIGHT - (lastCurveHeight < curveHeight ? (lastCurveHeight + i) : (lastCurveHeight - i));
                image.setPixelColor(Jimp.rgbaToInt(CURVE_GRADIENT[0][0],CURVE_GRADIENT[0][1],CURVE_GRADIENT[0][2],255), x, y);
            }
        }

        lastCurveHeight = curveHeight;
    }

    await image.writeAsync(filePath);
}

exports.createGraph = createGraph;