function ellipseTool(editor) {
    "use strict";
    var canvas, ctx, fromBlock, oldTo, currentColor, filledEllipse, blocks;

    function createCanvas() {
        canvas = ElementHelper.create("canvas", {"width": editor.getColumns() * editor.codepage.fontWidth, "height": editor.getRows() * editor.codepage.fontHeight});
        ctx = canvas.getContext("2d");
    }

    function createBlocks() {
        var i, canvas, ctx, imageData;
        blocks = [];
        for (i = 0; i < 32; i++) {
            canvas = ElementHelper.create("canvas", {"width": editor.codepage.fontWidth, "height": editor.codepage.fontHeight});
            ctx = canvas.getContext("2d");
            imageData = ctx.createImageData(canvas.width, canvas.height);
            if (i < 16) {
                imageData.data.set(editor.codepage.upperBlock(i), 0);
            } else {
                imageData.data.set(editor.codepage.lowerBlock(i - 16), 0);
            }
            ctx.putImageData(imageData, 0, 0);
            blocks[i] = canvas;
        }
    }

    createBlocks();

    function translateCoords(fromBlockX, fromBlockY, toBlockX, toBlockY) {
        return {
            "blockX": fromBlockX,
            "blockY": fromBlockY,
            "width": Math.abs(fromBlockX - toBlockX) + 1,
            "height": Math.abs(fromBlockY - toBlockY) + 1
        };
    }

    function canvasDown(coords) {
        fromBlock = coords;
        filledEllipse = coords.shiftKey;
    }

    function clearEllipse() {
        var newCoords;
        if (oldTo) {
            newCoords = translateCoords(fromBlock.blockX, fromBlock.blockY, oldTo.blockX, oldTo.blockY);
            ctx.clearRect((newCoords.blockX - newCoords.width - 1) * editor.codepage.fontWidth, (newCoords.blockY - newCoords.height - 1) * (editor.codepage.fontHeight / 2), (newCoords.width * 2 + 3) * editor.codepage.fontWidth, (newCoords.height * 2 + 3) * (editor.codepage.fontHeight / 2));
        }
    }

    function drawEllipse(x0, y0, width, height, setPixel, setLine) {
        var a2, b2, fa2, fb2, x, y, sigma;
        a2 = width * width;
        b2 = height * height;
        fa2 = 4 * a2;
        fb2 = 4 * b2;

        for (x = 0, y = height, sigma = 2 * b2 + a2 * (1 - 2 * height); b2 * x <= a2 * y; ++x) {
            if (filledEllipse) {
                setLine(x0 - x, x * 2, y0 + y);
                setLine(x0 - x, x * 2, y0 - y);
            } else {
                setPixel(x0 + x, y0 + y);
                setPixel(x0 - x, y0 + y);
                setPixel(x0 + x, y0 - y);
                setPixel(x0 - x, y0 - y);
            }
            if (sigma >= 0) {
                sigma += fa2 * (1 - y);
                --y;
            }
            sigma += b2 * ((4 * x) + 6);
        }

        for (x = width, y = 0, sigma = 2 * a2 + b2 * (1 - 2 * width); a2 * y <= b2 * x; ++y) {
            if (filledEllipse) {
                setLine(x0 - x, x * 2, y0 + y);
                setLine(x0 - x, x * 2, y0 - y);
            } else {
                setPixel(x0 + x, y0 + y);
                setPixel(x0 - x, y0 + y);
                setPixel(x0 + x, y0 - y);
                setPixel(x0 - x, y0 - y);
            }
            if (sigma >= 0) {
                sigma += fb2 * (1 - x);
                --x;
            }
            sigma += a2 * ((4 * y) + 6);
        }
    }

    function canvasDrag(coords) {
        var newCoords, halfHeight;
        halfHeight = editor.codepage.fontHeight / 2;

        function setPixel(px, py) {
            if (((py + 1) % 2) === 1) {
                ctx.drawImage(blocks[currentColor], px * editor.codepage.fontWidth, py * halfHeight);
            } else {
                ctx.drawImage(blocks[currentColor + 16], px * editor.codepage.fontWidth, py * halfHeight - halfHeight);
            }
        }

        function setLine(fromX, lineWidth, py) {
            var px;
            for (px = fromX; px < fromX + lineWidth; px++) {
                if (((py + 1) % 2) === 1) {
                    ctx.drawImage(blocks[currentColor], px * editor.codepage.fontWidth, py * halfHeight);
                } else {
                    ctx.drawImage(blocks[currentColor + 16], px * editor.codepage.fontWidth, py * halfHeight - halfHeight);
                }
            }
        }

        clearEllipse();
        newCoords = translateCoords(fromBlock.blockX, fromBlock.blockY, coords.blockX, coords.blockY);
        drawEllipse(newCoords.blockX, newCoords.blockY, newCoords.width, newCoords.height, setPixel, setLine);
        oldTo = coords;
    }

    function canvasUp(coords) {
        clearEllipse();
        editor.takeUndoSnapshot();
        editor.setBlocks(!coords.altKey, currentColor, function (setBlock) {
            var columns, rows, newCoords, px, block;
            columns = editor.getColumns();
            rows = editor.getRows();

            function setPixel(px, py) {
                if (px >= 0 && px < columns && py >= 0 && py < (rows * 2)) {
                    block = editor.getBlock(px, py);
                    setBlock(block, currentColor);
                }
            }

            function setLine(fromX, lineWidth, py) {
                for (px = fromX; px < fromX + lineWidth; ++px) {
                    setPixel(px, py);
                }
            }

            newCoords = translateCoords(fromBlock.blockX, fromBlock.blockY, oldTo.blockX, oldTo.blockY);
            drawEllipse(newCoords.blockX, newCoords.blockY, newCoords.width, newCoords.height, setPixel, setLine);
        });
    }

    function canvasOut() {
        clearEllipse();
    }

    function colorChange(col) {
        currentColor = col;
    }

    createCanvas();

    editor.addResizeListener(createCanvas);

    function init() {
        editor.addMouseDownListener(canvasDown);
        editor.addMouseDragListener(canvasDrag);
        editor.addMouseUpListener(canvasUp);
        editor.addMouseOutListener(canvasOut);
        editor.addColorChangeListener(colorChange);
        currentColor = editor.getCurrentColor();
        editor.addOverlay(canvas, "ellipse", function () {
            return canvas;
        });
        return true;
    }

    function remove() {
        editor.removeMouseDownListener(canvasDown);
        editor.removeMouseDragListener(canvasDrag);
        editor.removeMouseUpListener(canvasUp);
        editor.removeMouseOutListener(canvasOut);
        editor.removeColorChangeListener(colorChange);
        editor.removeOverlay("ellipse");
    }

    function toString() {
        return "Ellipse";
    }

    return {
        "init": init,
        "remove": remove,
        "toString": toString,
        "uid": "ellispe"
    };
}

AnsiEditController.addTool(ellipseTool, "tools-right", 105);