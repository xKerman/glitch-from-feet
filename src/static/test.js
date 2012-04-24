// -*- coding: utf-8 -*-

(function () {
    'use strict';

    module('zlib');
    test('crc32', function () {
        equal(zlib.crc32(new Uint8Array(0)), 0);
        equal(zlib.crc32(new Uint8Array([73, 72, 68, 82])), -1465799158);
        equal(zlib.crc32(new Uint8Array([0, 0, 2, 0, 0, 0, 2, 0, 8, 2, 0, 0, 0]), -1465799158), 2065318829);
        equal(zlib.crc32(new Uint8Array([73, 72, 68, 82, 0, 0, 2, 0, 0, 0, 2, 0, 8, 2, 0, 0, 0])), 2065318829);
    });
    test('crc32 random', function () {
        var crc32Simple = function (data, start) {
            var i = 0;
            var j = 0;
            var len = data.length;
            if (typeof crc32Simple.table === 'undefined') {
                crc32Simple.table = new Uint32Array(256);
                var crc = 0;
                var polynomial = 0xEDB88320;
                for (i = 0; i < 256; ++i) {
                    crc = i;
                    for (j = 0; j < 8; ++j) {
                        crc = (crc & 1)? polynomial ^ (crc >>> 1): (crc >>> 1);
                    }
                    crc32Simple.table[i] = crc;
                }
            }
            var result = ~(start || 0);
            for (i = 0; i < len; ++i) {
                result = (result >>> 8) ^ crc32Simple.table[(result & 0xFF) ^ data[i]];
            }
            return ~result;
        };
        var data;
        var length = 0;
        var j = 0;
        for (var i = 0; i < 100; ++i) {
            length = Math.floor(Math.random() * 100000);
            data = new Uint8Array(length);
            for (j = 0; j < length; ++j) {
                data[j] = j;
            }
            equal(zlib.crc32(data), crc32Simple(data), 'length = ' + length);
        }
    });
    test('crc32 subarray', function () {
        var buffer = new ArrayBuffer(11);
        var bytes = new Uint8Array(buffer);
        bytes.set([97, 104, 101, 108, 108, 111, 97, 97, 97, 97, 97]);
        equal(zlib.crc32(bytes.subarray(1, 6)), 907060870);
    });
    test('adler32', function () {
        equal(zlib.adler32(new Uint8Array(0)), 1);
        equal(zlib.adler32(new Uint8Array([104, 101, 108, 108, 111])), 103547413);
    });
    test('adler32 random', function () {
        var adler32Simple = function (data) {
            var base = 65521;
            var a = 1;
            var b = 0;
            for (var i = 0, len = data.length; i < len; ++i) {
                a = (a + (data[i] & 0xFF)) % base;
                b = (a + b) % base;
            }
            return ((b << 16 | a) >>> 0);
        };
        var data;
        var length = 0;
        var j = 0;
        for (var i = 0; i < 100; ++i) {
            length = Math.floor(Math.random() * 100000);
            data = new Uint8Array(length);
            for (j = 0; j < length; ++j) {
                data[j] = j;
            }
            equal(zlib.adler32(data), adler32Simple(data), 'length = ' + length);
        }
    });
    test('adler32 subarray', function () {
        var buffer = new ArrayBuffer(11);
        var bytes = new Uint8Array(buffer);
        bytes.set([97, 104, 101, 108, 108, 111, 97, 97, 97, 97, 97]);
        equal(zlib.adler32(bytes.subarray(1, 6)), 103547413);
    });
    test('compress - no compression', function () {
        var data = new Uint8Array([104, 101, 108, 108, 111]);
        var result = zlib.compress(data, 0);
        var resultView = new Uint8Array(result);
        ok(result instanceof ArrayBuffer);
        equal(result.byteLength, 16);
        equal(resultView[0], 120);
        equal(resultView[1], 1);
        equal(resultView[2], 1);
        equal(resultView[3], 5);
        equal(resultView[4], 0);
        equal(resultView[5], 250);
        equal(resultView[6], 255);
        equal(resultView[7], 104);
        equal(resultView[8], 101);
        equal(resultView[9], 108);
        equal(resultView[10], 108);
        equal(resultView[11], 111);
        equal(resultView[12], 6);
        equal(resultView[13], 44);
        equal(resultView[14], 2);
        equal(resultView[15], 21);
    });
    test('decompress', function () {
        var data = new Uint8Array([120, 1, 1, 5, 0, 250, 255, 104, 101, 108, 108, 111, 6, 44, 2, 21]);
        var result = zlib.decompress(data);
        var resultView = new Uint8Array(result);
        ok(result instanceof ArrayBuffer);
        equal(result.byteLength, 5);
        equal(resultView[0], 104);
        equal(resultView[1], 101);
        equal(resultView[2], 108);
        equal(resultView[3], 108);
        equal(resultView[4], 111);
    });
    test('compress -> decompress', function () {
        var data = new Uint8Array([104, 101, 108, 108, 111]);
        var result = zlib.decompress(zlib.compress(data));
        var resultView = new Uint8Array(result);
        ok(result instanceof ArrayBuffer);
        equal(resultView.length, data.length);
        for (var i = 0; i < resultView.length; ++i) {
            equal(resultView[i], data[i]);
        }
    });
    test('compress -> decompress 0xFFFF + 1', function () {
        var data = new Uint8Array(0xFFFF + 1);
        for (var i = 0; i < data.length; ++i) {
            data[i] = 255;
        }
        var compressed = zlib.compress(data, 0);
        var result = zlib.decompress(new Uint8Array(compressed));
        var resultView = new Uint8Array(result);
        equal(result.byteLength, data.length);
        deepEqual(resultView, data);
    });

    module('PNG');
    asyncTest('parse', function () {
        var req = new XMLHttpRequest();
        req.addEventListener('load', function (e) {
            var buffer = e.target.response;
            var png = new PNG(buffer);
            ok(png instanceof PNG);
            equal(png.width, 512);
            equal(png.height, 512);
            equal(png.header.width, 512);
            equal(png.header.height, 512);
            equal(png.header.bitdepth, 8);
            equal(png.header.colortype, 2);
            equal(png.header.compression, 0);
            equal(png.header.filter, 0);
            equal(png.header.interlace, 0);
            equal(png.raw.length, 512 * (512 * 3 + 1));
            start();
        }, false);
        req.open('GET', '/static/lena.png');
        req.responseType = 'arraybuffer';
        req.send(null);
    });
    asyncTest('write', function () {
        var req = new XMLHttpRequest();
        req.addEventListener('load', function (e) {
            var buffer = e.target.response;
            var png = new PNG(buffer);
            var blob = png.write();
            var reader = new FileReader();
            reader.onload = function (e) {
                var buffer = e.target.result;
                var result = new PNG(buffer);
                var index = 0;
                ok(blob instanceof Blob);
                equal(result.width, png.width);
                equal(result.height, png.height);
                equal(result.header.width, png.header.width);
                equal(result.header.height, png.header.height);
                equal(result.header.bitdepth, png.header.bitdepth);
                equal(result.header.colortype, png.header.colortype);
                equal(result.header.compression, png.header.compression);
                equal(result.header.filter, png.header.filter);
                equal(result.header.interlace, png.header.interlace);
                equal(result.raw.length, png.raw.length);
                start();
            };
            reader.readAsArrayBuffer(blob);
        }, false);
        req.open('GET', '/static/lena.png');
        req.responseType = 'arraybuffer';
        req.send(null);
    });
    test('none filter', function () {
        var currentline = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
        var prevline = new Uint8Array(12);
        var bpp = 3;
        var result = PNG.noneFilter(currentline, prevline, bpp);
        ok(result instanceof Uint8Array);
        deepEqual(result, currentline);
    });
    test('sub filter', function () {
        var currentline = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
        var prevline = new Uint8Array(12);
        var bpp = 3;
        var result = PNG.subFilter(currentline, prevline, bpp);
        var answer = new Uint8Array([0, 1, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3]);
        ok(result instanceof Uint8Array);
        deepEqual(result, answer);
    });
    test('up filter', function () {
        var currentline = new Uint8Array([10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]);
        var prevline = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
        var bpp = 3;
        var result = PNG.upFilter(currentline, prevline, 3);
        var answer = new Uint8Array([10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10]);
        ok(result instanceof Uint8Array);
        deepEqual(result, answer);
    });
    test('average filter', function () {
        var currentline = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
        var prevline = new Uint8Array([0, 0, 1, 2, 3, 4, 5 ,6 ,7, 8, 9, 10]);
        var bpp = 3;
        var result = PNG.averageFilter(currentline, prevline, 3);
        var answer = new Uint8Array([0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]);
        ok(result instanceof Uint8Array);
        deepEqual(result, answer);
    });
    test('paeth filter', function () {
        var currentline = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
        var prevline = new Uint8Array([0, 0, 1, 2, 3, 4, 5 ,6 ,7, 8, 9, 10]);
        var bpp = 3;
        var result = PNG.paethFilter(currentline, prevline, 3);
        var answer = new Uint8Array([0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
        ok(result instanceof Uint8Array);
        deepEqual(result, answer);
    });
}());
