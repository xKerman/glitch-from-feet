// -*- coding: utf-8 -*-

(function () {
    'use strict';

    module('zlib');
    test('crc32', function () {
        equal(0, zlib.crc32(new Uint8Array(0)));
        equal(-1465799158, zlib.crc32(new Uint8Array([73, 72, 68, 82])));
        equal(2065318829, zlib.crc32(new Uint8Array([0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x02,0x00, 0x08, 0x02, 0x00, 0x00, 0x00]), -1465799158));
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
            equal(crc32Simple(data), zlib.crc32(data), 'length = ' + length);
        }
    });
    test('adler32', function () {
        equal(1, zlib.adler32(new Uint8Array(0)));
        equal(103547413, zlib.adler32(new Uint8Array([104, 101, 108, 108, 111])));
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
            equal(adler32Simple(data), zlib.adler32(data), 'length = ' + length);
        }
    });

    module('PNG');
}());