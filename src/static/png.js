// -*- coding: utf-8 -*-

(function (global) {
    'use strict';

    // var crc32 = jz.algorithms.crc32;
    var BlobBuilder = global.BlobBuilder || global.MozBlobBuilder || global.WebKitBlobBuilder;

    var zlib = {};
    zlib.crc32 = (function(){
        // crc32([0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x02,0x00, 0x08, 0x02, 0x00, 0x00, 0x00], -1465799158) =>  2065318829
        var table = (function () {
            var poly = 0xEDB88320;
            var table = new Uint32Array(1024);
            var u, i, j;
            for(i = 0; i < 256; ++i){
                u = i;
                for(j = 0; j < 8; ++j){
                    u = u & 1 ? (u >>> 1) ^ poly : u >>> 1;
                }
                table[i] = u;
            }
            return table;
        }());

        return function (buffer, start) {
            var result = start || 0;
            var bytes = (buffer instanceof Uint8Array)? buffer: new Uint8Array(buffer);
            var t = table;
            result = ~result;
            for (var i = 0, len = bytes.length; i < len; ++i) {
                result = (result >>> 8) ^ t[(bytes[i] ^ result) & 0xFF];
            }
            return ~result;
        };
    }());
    zlib.adler32 = function (data) {
        var bytes = (data instanceof Uint8Array)? data: new Uint8Array(data);
        var a = 1;
        var b = 0;
        var base = 65521;
        var len = bytes.length;
        var tlen = 5550;
        var i = 0;
        while (len) {
            tlen = Math.min(5550, len);
            len -= tlen;
            do {
                a += bytes[i++];
                b += a;
            } while (--tlen);
            a %= base;
            b %= base;
        }
        return ((b << 16) | a) >>> 0;
    };
    zlib.deflate = function (data) {
        var ibytes = (data instanceof Uint8Array)? data: new Uint8Array(data);
        var length = ibytes.length;
        var len;
        var ioffset = 0;
        var ooffset = 0;
        var bfinal = 0;
        var btype = 0;
        var header = 0;
        var numblock = Math.ceil(length / 0xFFFF);
        var result = new ArrayBuffer(length + numblock * 5);
        var resultView = new DataView(result);
        var resultView8 = new Uint8Array(result);
        while (ioffset < length) {
            len = Math.min(0xFFFF, length);
            bfinal = (length === 0)? 1: 0;
            header = (btype << 2) | bfinal;
            resultView8[ooffset] = header;
            resultView.setInt16(ooffset+1, len, true);
            resultView.setInt16(ooffset+3, (~len & 0xFFFF), true);
            ooffset += 5;
            resultView8.set(ibytes.subarray(ioffset, ioffset+len), ooffset);
            ioffset += len;
            ooffset += len;
        }
        return result;
    };
    zlib.compress = function (data) {
        var cm = 8;
        var cinfo = 7;
        var cmf = (cinfo << 4) | cm;
        var fdict = 0;
        var flevel = 0;
        var flg = (flevel << 6) | (fdict << 5);
        var fcheck = 31 - (cmf * 256 + flg) % 31;
        flg |= fcheck;
        var compressed = zlib.deflate(data);
        var checksum = zlib.adler32(data);
        var iview = new Uint8Array(compressed);
        var result = new ArrayBuffer(2 + iview.length + 4);
        var resultView = new DataView(result);
        var resultView8 = new Uint8Array(result);
        resultView8.set([cmf, flg], 0);
        resultView8.set(iview, 2);
        resultView.setInt32(2+iview.length, checksum, false);
        return result;
    };

    var PNG = function (buf) {
        if (!(this instanceof PNG)) {
            return new PNG(buf);
        }
        this._parser = new PNGParser();
        this._writer = new PNGWriter();
        var result = this._parser.parse(buf);
        this.header = result.header;
        this.chunks = result.chunks;
        this.raw = result.raw;
        this.width = this.header.width;
        this.height = this.header.height;
    };
    PNG.SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10]; // '\x89PNG\r\n\x1a\n'
    PNG.MAX_CHUNK_LEN = Math.pow(2, 31) - 1;
    PNG.FILTER_NONE = 0;
    PNG.FILTER_SUB = 1;
    PNG.FILTER_UP = 2;
    PNG.FILTER_AVERAGE = 3;
    PNG.FILTER_PAETH = 4;
    PNG.isPNG = function (file) {
        return /image\/png/i.test(file.type);
    };
    PNG.noneFilter = function (curline, prevline, bpp) {
        return curline;
    };
    PNG.subFilter = function (curline, prevline, bpp) {
        var len = curline.length;
        var result = new Uint8Array(len);
        var left = 0;
        for (var i = 0; i < len; ++i) {
            left = (i - bpp < 0)? 0: curline[i - bpp];
            result[i] = curline[i] - left;
        }
        return result;
    };
    PNG.upFilter = function (curline, prevline, bpp) {
        if (prevline === null) {
            return curline;
        }
        var len = curline.length;
        var result = new Uint8Array(len);
        for (var i = 0; i < len; ++i) {
            result[i] = curline[i] - prevline[i];
        }
        return result;
    };
    PNG.averageFilter = function (curline, prevline, bpp) {
        var len = curline.length;
        var result = new Uint8Array(len);
        var left = 0;
        prevline = prevline || new Uint8Array(len);
        for (var i = 0; i < len; ++i) {
            left = (i - bpp < 0)? 0: curline[i-bpp];
            result[i] = curline[i] - Math.floor((left + prevline[i]) / 2);
        }
        return result;
    };
    PNG.paethFilter = function (curline, prevline, bpp) {
        var len = curline.length;
        var result = new Uint8Array(len);
        var left = 0;
        var adove = 0;
        var upperleft = 0;
        var p = 0;
        var pa = 0;
        var pb = 0;
        var pc = 0;
        var predicted = 0;
        prevline = prevline || new Uint8Array(curline.length);
        for (var i = 0; i < len; ++i) {
            if (i - bpp < 0) {
                left = 0;
                upperleft = 0;
            }
            else {
                left = curline[i - bpp];
                upperleft = prevline[i - bpp];
            }
            adove = prevline[i];
            p = left + adove - upperleft;
            pa = Math.abs(p - left);
            pb = Math.abs(p - adove);
            pc = Math.abs(p - upperleft);
            if (pa <= pb && pa <= pc) {
                predicted = left;
            }
            else if (pb <= pc) {
                predicted = adove;
            }
            else {
                predicted = upperleft;
            }
            result[i] = curline[i] - predicted;
        }
        return result;
    };
    PNG.chooseFilter = function (curline, prevline, bpp, filterToUse) {
        var filterFuncs = Object.create(null);
        filterToUse = filterToUse || [PNG.FILTER_NONE, PNG.FILTER_SUB,
                                      PNG.FILTER_UP, PNG.FILTER_AVERAGE,
                                      PNG.FILTER_PAETH];
        filterToUse.forEach(function (filter) {
            switch (filter) {
            case PNG.FILTER_NONE:
                filterFuncs[filter] = PNG.noneFilter;
                break;
            case PNG.FILTER_SUB:
                filterFuncs[filter] = PNG.subFilter;
                break;
            case PNG.FILTER_UP:
                filterFuncs[filter] = PNG.upFilter;
                break;
            case PNG.FILTER_AVERAGE:
                filterFuncs[filter] = PNG.averageFilter;
                break;
            case PNG.FILTER_PAETH:
                filterFuncs[filter] = PNG.paethFilter;
                break;
            }
        });
        var filterFunc;
        var minsum = Infinity;
        var sum = 0;
        var resultline;
        var i;
        var choosenFilter;
        var choosenLine;
        var hasOwn = Object.prototype.hasOwnProperty;
        for (var filter in filterFuncs) {
            if (!hasOwn.call(filterFuncs, filter)) {
                continue;
            }
            filterFunc = filterFuncs[filter];
            resultline = filterFunc(curline, prevline, bpp);
            for (i = 0; i < resultline.length; ++i) {
                sum += resultline[i];
            }
            if (sum < minsum) {
                choosenFilter = filter;
                choosenLine = resultline;
                minsum = sum;
            }
            sum = 0;
        }
        return {
            filter: choosenFilter,
            line: choosenLine
        };
    };
    PNG.fromCanvas = function (canvas) {
        var context = canvas.getContext('2d');
        var width = canvas.width;
        var height = canvas.height;
        var pixels = context.getImageData(0, 0, width, height).data;
        var rgb = new Uint8Array(width * 3 * height);
        for (var i = 0, o = 0, len = pixels.length; i < len; i += 4, o += 3) {
            rgb[o + 0] = pixels[i + 0];
            rgb[o + 1] = pixels[i + 1];
            rgb[o + 2] = pixels[i + 2];
        }
        var bpp = 3;
        var ilinelength = 3 * width;
        var olinelength = 1 + width * 3;
        var raw = new Uint8Array(height * olinelength);
        var prevline;
        var curline;
        var result;
        var filters = [PNG.FILTER_SUB, PNG.FILTER_UP, PNG.FILTER_AVERAGE];
        for (var y = 0; y < height; ++y) {
            prevline = (y === 0)? null: rgb.subarray((y - 1) * ilinelength, y * ilinelength);
            curline = rgb.subarray(y * ilinelength, (y + 1) * ilinelength);
            result = PNG.chooseFilter(curline, prevline, bpp, filters);
            raw[y * olinelength] = result.filter;
            raw.set(result.line, y * olinelength + 1);
        }
        var png = {
            header: {
                width: width,
                height: height,
                bitdepth: 8,
                colortype: 2,
                compression: 0,
                filter: 0,
                iterlace: 0
            },
            chunks: [
                {type: 'IDAT', data: zlib.compress(raw)},
                {type: 'IEND', data: new Uint8Array(0)}
            ],
            raw: raw,
            width: width,
            height: height,
            _parser: new PNGParser(),
            _writer: new PNGWriter()
        };
        for (var prop in PNG.prototype) {
            png[prop] = PNG.prototype[prop];
        }
        return png;
    };
    PNG.prototype.bps = function () { // byte per sample
        var colortype = this.header.colortype;
        var bitdepth = this.header.bitdepth;
        switch (colortype) {
        case 0:
            return (bitdepth / 8);     //GrayScale
        case 2:
            return (bitdepth / 8) * 3; // RBG
        case 3:
            return 3;                  // RGB (always 8bit)
        case 4:
            return (bitdepth / 8) * 2; // Grayscale + alpha
        case 6:
            return (bitdepth / 8) * 4; // RGB + alpha
        default:
            throw new Error('invalid colorType for PNG');
        }
    };
    PNG.prototype.getline = function (lineno) {
        if (lineno < 0 || lineno >= this.height) {
            throw new Error('range Error for PNG line number.');
        }
        var bps = this.bps();
        var linelength = 1 + bps * this.width; // filter + data
        var begin = lineno * linelength;
        var end = (lineno + 1) * linelength;
        return this.raw.subarray(begin, end);
    };
    PNG.prototype.write = function () {
        return this._writer.write(this);
    };

    var PNGParser = function () {
        if (!(this instanceof PNGParser)) {
            return new PNGParser();
        }
        this._offset = 0;
    };
    PNGParser.prototype.parse = function (buf) {
        var dataview = new DataView(buf);
        this._parseSignature(dataview);
        var header = this._parseIHDRChunk(dataview);
        var chunkType = 'IHDR';
        var chunks = [];
        while (this._offset < dataview.byteLength && chunkType !== 'IEND') {
            var chunk = this._parseChunk(dataview);
            chunkType = chunk.type;
            chunks.push(chunk);
        }
        if (chunkType !== 'IEND' || this._offset !== dataview.byteLength) {
            throw new Error('IEND is not end of chunk ' + chunkType);
        }
        chunks = this._concatIDAT(chunks);
        var raw = this._deflateIDAT(chunks);
        return {
            header: header,
            chunks: chunks,
            raw: raw
        };
    };
    PNGParser.prototype._parseSignature = function (dataview) {
        var signature = new Uint8Array(dataview.buffer, this._offset, PNG.SIGNATURE.length);
        if (!this._isValidSignature(signature)) {
            throw new Error('file format is not PNG');
        }
        this._offset += PNG.SIGNATURE.length;
    };
    PNGParser.prototype._isValidSignature = function (signature) {
        for (var i = 0, len = signature.length; i < len; ++i) {
            if (signature[i] !== PNG.SIGNATURE[i]) {
                return false;
            }
        }
        return true;
    };
    PNGParser.prototype._parseChunkLength = function (dataview) {
        var length = dataview.getInt32(this._offset, false);
        this._offset += 4;
        if (length < 0 || length > PNG.MAX_CHUNK_LEN) {
            throw new Error('chunk length is not valid');
        }
        return length;
    };
    PNGParser.prototype._parseChunkType = function (dataview) {
        var chunkType = new Uint8Array(dataview.buffer, this._offset, 4);
        this._offset += 4;
        var result = String.fromCharCode.apply(null, Array.prototype.slice.call(chunkType));
        return result;
    };
    PNGParser.prototype._parseIHDRChunk = function (dataview) {
        var length = this._parseChunkLength(dataview);
        var type = this._parseChunkType(dataview);
        if (type !== 'IHDR') {
            throw new Error('chunk type is not IHDR, ' + type);
        }
        var header = {};
        header.width = dataview.getInt32(this._offset, false);
        this._offset += 4;
        header.height = dataview.getInt32(this._offset, false);
        this._offset += 4;
        var remainder = new Uint8Array(dataview.buffer, this._offset, 5);
        this._offset += 5;
        header.bitdepth = remainder[0];
        header.colortype = remainder[1];
        header.compression = remainder[2];
        header.filter = remainder[3];
        header.interlace = remainder[4];
        this._offset += 4;      // for checksum
        return header;
    };
    PNGParser.prototype._parseChunk = function (dataview) {
        var length = this._parseChunkLength(dataview);
        var type = this._parseChunkType(dataview);
        if (!/[A-Z]{4}/i.test(type)) {
            throw new Error('chunk type is not valid');
        }
        var data = new Uint8Array(dataview.buffer, this._offset, length);
        this._offset += length + 4; // for checksum
        return {type: type, data: data};
    };
    PNGParser.prototype._findFirstIDAT = function (chunks) {
        var index = -1;
        for (var i = 0, len = chunks.length; i < len; ++i) {
            if (chunks[i].type === 'IDAT') {
                index = i;
                break;
            }
        }
        return index;
    };
    PNGParser.prototype._concatIDAT = function (chunks) {
        var idats = chunks.filter(function (chunk) {
            return chunk.type === 'IDAT';
        });
        if (idats.length === 0) {
            throw new Error('IDAT not found');
        }
        var index = this._findFirstIDAT(chunks);
        var result = new Uint8Array(idats.reduce(function (a, b) {
            return a + b.data.length;
        }, 0));
        var offset = 0;
        idats.forEach(function (idat) {
            var data = idat.data;
            result.set(data, offset);
            offset += data.length;
        });
        chunks.splice(index, idats.length, {type: 'IDAT', data: result});
        return chunks;
    };
    PNGParser.prototype._deflateIDAT = function (chunks) {
        var idat = chunks[this._findFirstIDAT(chunks)];
        return new Uint8Array(zlib.decompress(idat.data));
    };

    var PNGWriter = function () {
        if (!(this instanceof PNGWriter)) {
            return new PNGWriter();
        }
        this._bb = new BlobBuilder();
    };
    PNGWriter.prototype.write = function (png) {
        this._writeSignature();
        this._writeHeader(png.header);
        var that = this;
        png.chunks.forEach(function (chunk) {
            switch (chunk.type) {
            case 'IDAT':
                that._writeIDATChunk(png.raw);
                break;
            default:
                that._writeChunk(chunk);
                break;
            }
        });
        var result = this._bb.getBlob();
        this._bb = new BlobBuilder();
        return result;
    };
    PNGWriter.prototype._writeSignature = function () {
        var arraybuf = new ArrayBuffer(8);
        var view = new Uint8Array(arraybuf);
        view.set(PNG.SIGNATURE);
        this._bb.append(arraybuf);
    };
    PNGWriter.prototype._writeLength = function (length) {
        var arraybuf = new ArrayBuffer(4);
        var dataview = new DataView(arraybuf);
        dataview.setInt32(0, length, false);
        this._bb.append(arraybuf);
    };
    PNGWriter.prototype._writeType = function (type) {
        var arraybuf = new ArrayBuffer(4);
        var view = new Uint8Array(arraybuf);
        var slice = Array.prototype.slice;
        var value = slice.call(type).map(function (s) {
            return s.charCodeAt(0);
        });
        view.set(value);
        this._bb.append(arraybuf);
    };
    PNGWriter.prototype._writeChecksum = function (data, type) {
        var slice = Array.prototype.slice;
        var t = slice.call(type).map(function (s) { return s.charCodeAt(0); });
        var start = zlib.crc32(t);
        var arraybuf = new ArrayBuffer(4);
        var dataview = new DataView(arraybuf);
        var checksum = zlib.crc32(new Uint8Array(data), start);
        dataview.setInt32(0, checksum, false);
        this._bb.append(arraybuf);
    };
    PNGWriter.prototype._writeHeader = function (header) {
        this._writeLength(13);
        this._writeType('IHDR');
        var arraybuf = new ArrayBuffer(13);
        var dataview = new DataView(arraybuf);
        dataview.setInt32(0, header.width, false);
        dataview.setInt32(4, header.height, false);
        dataview.setInt8(8, header.bitdepth);
        dataview.setInt8(9, header.colortype);
        dataview.setInt8(10, header.compression);
        dataview.setInt8(11, header.filter);
        dataview.setInt8(12, header.interlace);
        this._bb.append(arraybuf);
        this._writeChecksum(arraybuf, 'IHDR');
    };
    PNGWriter.prototype._writeChunk = function (chunk) {
        var length = chunk.data.length;
        this._writeLength(length);
        this._writeType(chunk.type);
        var arraybuf = new ArrayBuffer(length);
        var viewInt8 = new Uint8Array(arraybuf);
        viewInt8.set(chunk.data);
        this._bb.append(arraybuf);
        this._writeChecksum(arraybuf, chunk.type);
    };
    PNGWriter.prototype._writeIDATChunk = function (raw) {
        var compressed = zlib.compress(raw);
        var length = compressed.byteLength;
        this._writeLength(length);
        this._writeType('IDAT');
        this._bb.append(compressed);
        this._writeChecksum(compressed, 'IDAT');
    };

    global.PNG = PNG;
}(Function('return this;')()));
