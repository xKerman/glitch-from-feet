// -*- coding: utf-8 -*-

(function () {
    'use strict';


    var BlobBuilder = window.BlobBuilder || window.MozBlobBuilder || window.WebKitBlobBuilder;
    var URL = window.URL || window.webkitURL;
    var requestAnimationFrame = window.requestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.msRequestAnimationFrame;

    var stopEvent = function (event) {
        event.stopPropagation();
        event.preventDefault();
    };

    var clearPreviousImage = function () {
        var range = document.createRange();
        range.selectNodeContents(document.getElementById('canvas-container'));
        range.deleteContents();
        range.detach();
    };

    // maxWidth and maxHeight are optional parameters.
    var loadImageAsPNG = function (file, maxWidth, maxHeight, callback) {
        if (arguments.length === 2) {
            maxWidth = maxHeight = null;
            callback = arguments[1];
        }
        if (!/^image\//.test(file.type)) {
            return;
        }
        var img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        img.addEventListener('load', function (e) {
            var width = img.width;
            var height = img.height;
            var canvas = document.createElement('canvas');
            if ((!maxWidth && !maxHeight) ||
                (width <= maxWidth && height <= maxHeight)) {
                canvas.width = width;
                canvas.height = height;
            }
            else if (width > height) {
                canvas.width = maxWidth;
                canvas.height = Math.round(height * (maxWidth / width));
            }
            else {
                canvas.height = maxHeight;
                canvas.width = Math.round(width * (maxHeight / height));
            }
            var context = canvas.getContext('2d');
            context.drawImage(img, 0, 0, width, height,
                              0, 0, canvas.width, canvas.height);
            var png = PNG.fromCanvas(canvas);
            callback(png);
            URL.revokeObjectURL(img.src);
        }, false);
    };

    var removeGlitchButton = function () {
        var glitchButton = document.getElementById('glitch-button');
        var start = Date.now();
        var step = function (timestamp) {
            var opacity = (timestamp - start) / 200;
            if (opacity > 1) {
                glitchButton.style.opacity = 0;
                return;
            }
            glitchButton.style.opacity = 1 - opacity;
            requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
        glitchButton.disabled = true;
    };

    var emulateClick = function (link) {
        var event = document.createEvent('MouseEvents');
        document.body.appendChild(link);
        event.initMouseEvent('click', true, true, window, 0, 0, 0, 0, 0,
                             false, false, false, false, 0, null);
        link.dispatchEvent(event);
        document.body.removeChild(link);
    };

    var download = function (blob, filename) {
        var a = document.createElement('a');
        a.style.opacity = 0;
        if ('download' in a) {
            a.download = filename;
            a.href = URL.createObjectURL(blob);
            emulateClick(a);
            URL.revokeObjectURL(a.href);
            return;
        }
        var reader = new FileReader();
        var progress = document.createElement('progress');
        progress.max = 1.0;
        progress.value = 0.0;
        var insertPoint = document.getElementById('button-container');
        insertPoint.appendChild(progress);
        reader.onloadstart = function (e) {
            progress.value = 0.0;
        };
        reader.onprogress = function (e) {
            progress.value = e.loaded / e.total;
        };
        reader.onload = function (e) {
            var url = e.target.result;
            a.href = url.replace(/^data:image\/png/, 'data:application/octet-stream');
            progress.value = 1.0;
            emulateClick(a);
        };
        reader.onloadend = function (e) {
            setTimeout(function () {
                insertPoint.removeChild(progress);
            }, 1500);
        };
        reader.readAsDataURL(blob);
    };

    var glitch = function (png, start, end) {
        for (var i = start; i < end; ++i) {
            png.getline(i)[0] = PNG.FILTER_PAETH;
        }
        return png;
    };

    var showImage = function (file) {
        var glitchButton = document.getElementById('glitch-button');
        glitchButton.style.opacity = 1;
        glitchButton.disabled = false;
        var downloadButton = document.getElementById('download-button');
        downloadButton.style.opacity = 0;
        downloadButton.disabled = true;
        clearPreviousImage();
        var img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        img.id = 'target';
        img.addEventListener('load', function (e) {
            URL.revokeObjectURL(img.src);
        }, false);
        var insertPoint = document.getElementById('canvas-container');
        insertPoint.appendChild(img);
    };

    var showDroppable = function () {
        var dropCircle = document.getElementById('canvas-container');
        var style = dropCircle.style;
        style.backgroundColor = 'rgb(200, 200, 200)';
        style.border = '5px dotted gray';
    };

    var resetDropCircle = function () {
        var dropCircle = document.getElementById('canvas-container');
        var style = dropCircle.style;
        style.backgroundColor = 'white';
        style.border = '5px solid gray';
    };

    var dropCircle = document.getElementById('canvas-container');
    var targetFile;
    var downloadFile;
    var glitching = false;
    dropCircle.addEventListener('dragenter', function (e) {
        stopEvent(e);
        if (glitching) {
            return;
        }
        showDroppable();
    }, false);
    dropCircle.addEventListener('dragover', function (e) {
        stopEvent(e);
        if (glitching) {
            return;
        }
        showDroppable();
    }, false);
    dropCircle.addEventListener('dragleave', function (e) {
        stopEvent(e);
        resetDropCircle();
    });
    dropCircle.addEventListener('drop', function (e) {
        stopEvent(e);
        resetDropCircle();
        if (glitching) {
            return;
        }
        var dt = e.dataTransfer;
        if (dt.files.length != 1) {
            return;
        }
        targetFile = dt.files[0];
        if (!/^image\//.test(targetFile.type)) {
            alert('This file is not image.');
            return;
        }
        showImage(targetFile);
        downloadFile = null;
    }, false);
    var glitchButton = document.getElementById('glitch-button');
    glitchButton.addEventListener('click', function (ev) {
        removeGlitchButton();
        glitching = true;
        loadImageAsPNG(targetFile, 500, 500, function (png) {
            var interval = (function () {
                var start = Date.now();
                png.writeAsArrayBuffer(0);
                var end = Date.now();
                return Math.max((end - start) * 2, 100);
            }());
            var glitchHeight = Math.max(Math.ceil(png.height * (interval / 10000)), 5);
            var start = Math.max(png.height - glitchHeight, 0);
            var end = png.height - 1;
            var img = document.getElementById('target');
            var progress = document.createElement('progress');
            progress.max = 1.0;
            progress.value = 0.0;
            var cid = setInterval(function () {
                if (end === 0) {
                    clearInterval(cid);
                    downloadButton.style.opacity = 1;
                    downloadButton.disabled = false;
                    glitching = false;
                    document.getElementById('button-container').removeChild(progress);
                    progress.value = 1.0;
                    return;
                }
                var blob = glitch(png, start, end).writeAsBlob(0);
                img.src = URL.createObjectURL(blob);
                end = start;
                start = Math.max(end - glitchHeight, 0);
                progress.value = (png.height - end) / png.height;
            }, interval);
            document.getElementById('button-container').appendChild(progress);
        });
    }, false);
    var downloadButton = document.getElementById('download-button');
    downloadButton.addEventListener('click', function (ev) {
        var filename = 'glitched_' + targetFile.name;
        filename = filename.replace(/\.\w+$/, '.png');
        downloadButton.disabled = true;
        if (downloadFile) {
            download(downloadFile, filename);
            downloadButton.disabled = false;
            return;
        }
        loadImageAsPNG(targetFile, function (png) {
            png = glitch(png, 0, png.height);
            var worker = new Worker('/static/worker.js');
            worker.addEventListener('message', function (e) {
                var bb = new BlobBuilder();
                bb.append(e.data);
                downloadFile = bb.getBlob();
                download(downloadFile, filename);
                downloadButton.disabled = false;
                worker.terminate();
            }, false);
            worker.postMessage({png: png, level: 9});
        });
    }, false);
}());
