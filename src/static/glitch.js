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
        range.selectNodeContents(document.getElementById('right'));
        range.deleteContents();
        range.detach();
    };

    var showImage = function (file) {
        if (!PNG.isPNG(file)) {
            return;
        }
        clearPreviousImage();
        var img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        img.className = 'target';
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
        var glitchButton = document.getElementById('glitch-button');
        glitchButton.addEventListener('click', function (ev) {
            glitchButton.disabled = true;
            var reader = new FileReader();
            reader.onload = function (e) {
                var buffer = e.target.result;
                var png = new PNG(buffer);
                var start = png.height - 1;
                var end = Math.max(start - 10, 0);
                var cid = setInterval(function () {
                    if (start === 0) {
                        clearInterval(cid);
                        glitchButton.disabled = false;
                        alert('finished!');
                        return;
                    }
                    for (var i = start; i > end; --i) {
                        png.getline(i)[0] = PNG.FILTER_PAETH;
                    }
                    var blob = png.write();
                    var url = URL.createObjectURL(blob);
                    img.src = url;
                    start = end;
                    end = Math.max(start - 10, 0);
                }, 250);
            };
            reader.readAsArrayBuffer(file);
        }, false);
        var insertPoint = document.getElementById('right');
        insertPoint.appendChild(img);
    };


    var dropCircle = document.getElementById('dropcircle');
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
