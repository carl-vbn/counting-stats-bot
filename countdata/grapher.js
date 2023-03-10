const Jimp = require('jimp');

const GRAPH_WIDTH = 512;
const GRAPH_HEIGHT = 256;

const BACKGROUND_GRADIENT = {
    0: [50, 16, 92],
    1: [25, 11, 54]
};

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function gradient(points, t) {
    const keys = Object.keys(points);
    keys.sort();

    let keyA = undefined;
    let keyB = undefined;

    for (const key of keys) {
        if (key <= t && (keyA === undefined || keyA < key)) {
            keyA = key;
        }

        if (key >= t && (keyB === undefined || keyB > key)) {
            keyB = key;
        }
    }

    const subT = (t - keyA) / (keyB - keyA);

    return Jimp.rgbaToInt(lerp(points[keyA][0], points[keyB][0], subT), lerp(points[keyA][1], points[keyB][1], subT), lerp(points[keyA][2], points[keyB][2], subT), 255);
}

async function createChart(countingData) {
    const image = new Jimp(GRAPH_WIDTH, GRAPH_HEIGHT);
    image.scan(0, 0, GRAPH_WIDTH, GRAPH_HEIGHT, function (x, y, offset) {
        this.bitmap.data.writeUInt32BE(gradient(BACKGROUND_GRADIENT, y / GRAPH_HEIGHT), offset, true);
    });

    for (let x = 0; x < GRADIENT_WIDTH; x++) {

    }

    await image.writeAsync('graph.png');
}

exports.createChart = createChart;