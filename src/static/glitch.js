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
        img.src = window.URL.createObjectURL(file);
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
        img.addEventListener('click', function (ev) {
            var reader = new FileReader();
            reader.addEventListener('load', function (e) {
                var buffer = e.target.result;
                var png = new PNG(buffer);
                for (var i = png.height - 1; i; --i) {
                    png.getline(i)[0] = PNG.FILTER_PEATH;
                }
                console.time('write');
                var blob = png.write();
                console.timeEnd('write');
                var url = URL.createObjectURL(blob);
                img.src = url;
            }, false);
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
