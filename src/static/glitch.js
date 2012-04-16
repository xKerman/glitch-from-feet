// -*- coding: utf-8 -*-

(function () {
    'use strict';


    var URL = window.URL || window.webkitURL;

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

    var processImage = function (file, callback) {
        if (!/^image\//.test(file.type)) {
            return;
        }
        if (PNG.isPNG(file)) {
            var reader = new FileReader();
            reader.onload = function (ev) {
                var buffer = ev.target.result;
                var png = PNG(buffer);
                callback(png);
            };
            reader.readAsArrayBuffer(file);
        }
        else {
            loadImageAsPNG(file, callback);
        }
    };

    var glitch = function (png) {
        var start = png.height - 1;
        var end = Math.max(start - 10, 0);
        var glitchButton = document.getElementById('glitch-button');
        var id = setInterval(function () {
            var opacity = glitchButton.style.opacity;
            if (opacity <= 0) {
                clearInterval(id);
                return;
            }
            glitchButton.style.opacity = opacity - 0.1;
        }, 20);
        glitchButton.disabled = true;
        var cid = setInterval(function () {
            if (start <= 0) {
                clearInterval(cid);
                alert('finished!');
                return;
            }
            for (var i = start; i > end; --i) {
                png.getline(i)[0] = PNG.FILTER_PAETH;
            }
            var blob = png.write();
            var url = URL.createObjectURL(blob);
            var img = document.getElementById('target');
            img.src = url;
            start = end;
            end = Math.max(start - 10, 0);
        }, 250);
    };

    var showImage = function (file) {
        var glitchButton = document.getElementById('glitch-button');
        glitchButton.style.opacity = 1;
        glitchButton.disabled = false;
        clearPreviousImage();
        var img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        img.id = 'target';
        img.style.opacity = 0;
        img.addEventListener('load', function (e) {
            var width = img.width;
            var height = img.height;
            if (width > height) {
                img.width = Math.min(width, 500);
            }
            else {
                img.height = Math.min(height, 500);
            }
            img.style.opacity = 1;
            URL.revokeObjectURL(img.src);
        }, false);
        glitchButton.addEventListener('click', function handler (ev) {
            processImage(file, glitch);
            glitchButton.removeEventListener('click', handler, false);
        }, false);
        var insertPoint = document.getElementById('canvas-container');
        insertPoint.appendChild(img);
    };


    var dropCircle = document.getElementById('canvas-container');
    dropCircle.addEventListener('dragenter', stopEvent, false);
    dropCircle.addEventListener('dragover', stopEvent, false);
    dropCircle.addEventListener('drop', function (e) {
        stopEvent(e);
        var dt = e.dataTransfer;
        if (dt.files.length != 1) {
            return;
        }
        var file = dt.files[0];
        showImage(file);
    }, false);
}());
