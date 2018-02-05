// -*- coding: utf-8 -*-

(function () {
    'use strict';

    importScripts('jsziptools.min.js', 'png.js');

    self.addEventListener('message', function (e) {
        var png = e.data.png;
        var level = e.data.level;
        self.postMessage(PNG.prototype.writeAsArrayBuffer.call(png, level));
    }, false);
}());
