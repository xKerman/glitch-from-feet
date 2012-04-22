// -*- coding: utf-8 -*-

(function () {
    'use strict';


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

    var loadImageAsPNG = function (file, callback) {
        if (!/^image\//.test(file.type)) {
            return;
        }
        var img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        img.addEventListener('load', function (e) {
            var width = img.width;
            var height = img.height;
            var canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            var context = canvas.getContext('2d');
            context.drawImage(img, 0, 0);
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

    var glitch = function (png) {
        var interval = (function () {
            var start = Date.now();
            png.write();
            var end = Date.now();
            return Math.max((end - start) * 2, 100);
        }());
        var glitchHeight = Math.max(Math.ceil(png.height * (interval / 10000)), 5);
        var start = png.height - 1;
        var end = Math.max(start - glitchHeight, 0);
        var cid = setInterval(function () {
            if (start < 0) {
                clearInterval(cid);
                var downloadButton = document.getElementById('download-button');
                downloadButton.style.opacity = 1;
                downloadButton.disabled = false;
                downloadFile = png.write();
                return;
            }
            for (var i = start; i >= end; --i) {
                png.getline(i)[0] = PNG.FILTER_PAETH;
            }
            var blob = png.write();
            var url = URL.createObjectURL(blob);
            var img = document.getElementById('target');
            img.src = url;
            start = end - 1;
            end = Math.max(start - glitchHeight, 0);
        }, interval);
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
            var width = img.width;
            var height = img.height;
            if (width > height) {
                img.width = Math.min(width, 500);
            }
            else {
                img.height = Math.min(height, 500);
            }
            URL.revokeObjectURL(img.src);
        }, false);
        var insertPoint = document.getElementById('canvas-container');
        insertPoint.appendChild(img);
    };


    var dropCircle = document.getElementById('canvas-container');
    var targetFile;
    var downloadFile;
    dropCircle.addEventListener('dragenter', stopEvent, false);
    dropCircle.addEventListener('dragover', stopEvent, false);
    dropCircle.addEventListener('drop', function (e) {
        stopEvent(e);
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
    }, false);
    var glitchButton = document.getElementById('glitch-button');
    glitchButton.addEventListener('click', function (ev) {
        removeGlitchButton();
        loadImageAsPNG(targetFile, glitch);
    }, false);
    var downloadButton = document.getElementById('download-button');
    downloadButton.addEventListener('click', function (ev) {
        var filename = 'glitched_' + targetFile.name;
        filename = filename.replace(/\.\w+$/, '.png');
        download(downloadFile, filename);
    }, false);
}());
