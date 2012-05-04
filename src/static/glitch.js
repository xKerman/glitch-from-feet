// -*- coding: utf-8 -*-

jQuery(document).ready(function () {
    'use strict';


    var BlobBuilder = window.BlobBuilder || window.MozBlobBuilder || window.WebKitBlobBuilder;
    var URL = window.URL || window.webkitURL;

    var stopEvent = function (event) {
        event.stopPropagation();
        event.preventDefault();
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
        jQuery('<img>')
            .prop({src: URL.createObjectURL(file)})
            .load(function (e) {
                var width = jQuery(this).prop('width');
                var height = jQuery(this).prop('height');
                var size = {};
                if ((!maxWidth && !maxHeight) ||
                    (width <= maxWidth && height <= maxHeight)) {
                    size = {width: width, height: height};
                }
                else if (width > height) {
                    size.width = maxWidth;
                    size.height = Math.round(height * (maxWidth / width));
                }
                else {
                    size.width = Math.round(width * (maxHeight / height));
                    size.height = maxHeight;
                }
                var $canvas = jQuery('<canvas>').prop(size);
                var context = $canvas[0].getContext('2d');
                context.drawImage(this, 0, 0, width, height,
                                  0, 0, size.width, size.height);
                var png = PNG.fromCanvas($canvas[0], srcFilters);
                callback(png);
                URL.revokeObjectURL(jQuery(this).prop('src'));
            });
    };

    var emulateClick = function (link) {
        var event = document.createEvent('MouseEvents');
        jQuery(link).appendTo(document.body);
        event.initMouseEvent('click', true, true, window, 0, 0, 0, 0, 0,
                             false, false, false, false, 0, null);
        link.dispatchEvent(event);
        jQuery(link).remove();
    };

    var download = function (blob, filename) {
        var a = document.createElement('a');
        jQuery(a).css({opacity: 0});
        if ('download' in a) {
            jQuery(a).prop({
                download: filename,
                href: URL.createObjectURL(blob)
            });
            emulateClick(a);
            URL.revokeObjectURL(jQuery(a).prop('href'));
            return;
        }
        var reader = new FileReader();
        var $progress = jQuery('#progress-bar').animate({opacity: 1});
        reader.onloadstart = function (e) {
            $progress.prop({value: 0.0});
        };
        reader.onprogress = function (e) {
            $progress.prop({value: e.loaded / e.total});
        };
        reader.onload = function (e) {
            var url = e.target.result;
            url = url.replace(/^data:image\/png/, 'data:application/octet-stream');
            $progress.prop({value: 1.0});
            jQuery(a).prop({href: url});
            emulateClick(a);
        };
        reader.onloadend = function (e) {
            setTimeout(function () {
                $progress.animate({opacity: 0});
            }, 1500);
        };
        reader.readAsDataURL(blob);
    };

    var glitch = function (png, start, end) {
        for (var i = start; i < end; ++i) {
            png.getline(i)[0] = destFilter;
        }
        return png;
    };

    var showImage = function (file) {
        jQuery('#canvas-container').empty();
        jQuery('<img>').prop({
            src: URL.createObjectURL(file),
            id: 'target'
        }).load(function (e) {
            URL.revokeObjectURL(jQuery(this).prop('src'));
        }).appendTo('#canvas-container');
    };

    var getFilter = function (type) {
        var context = '#control-panel .' + type + '-filter';
        var replacer = function (filter) {
            return PNG['FILTER_' + filter.toUpperCase()];
        };
        switch (type) {
        case 'src':
            var result = [];
            jQuery('input:checked', context).each(function () {
                result.push(replacer(jQuery(this).val()));
            });
            return result.filter(function (filter) {
                return typeof filter !== 'undefined';
            });
        case 'dest':
            return replacer(jQuery('input:checked', context).val());
        default:
            throw new Error('type invalid');
        }
    };

    var initCheckbox = function () {
        jQuery([
            '#src-sub-filter',
            '#src-up-filter',
            '#src-average-filter',
            '#dest-paeth-filter'
        ].join(',')).prop({checked: true});
        jQuery([
            '#controller-button',
            '#src-none-filter',
            '#src-paeth-filter',
            '#dest-none-filter',
            '#dest-up-filter',
            '#dest-sub-filter',
            '#dest-average-filter'
        ].join(',')).prop({checked: false});
    };

    var targetFile;
    var downloadFile;
    var glitching = false;
    var srcFilters;
    var destFilter;
    jQuery('#canvas-container').bind('dragenter dragover', function (e) {
        stopEvent(e);
        if (glitching) {
            return;
        }
        jQuery(this).css({
            backgroundColor: 'rgb(200, 200, 200)',
            border: '5px dotted gray'
        });
    }).bind('dragleave drop', function (e) {
        stopEvent(e);
        jQuery(this).removeAttr('style');
    }).bind('drop', function (e) {
        if (glitching) {
            return;
        }
        var dt = e.originalEvent.dataTransfer;
        if (dt.files.length != 1) {
            return;
        }
        targetFile = dt.files[0];
        if (!/^image\//.test(targetFile.type)) {
            alert('This file is not image.');
            return;
        }
        jQuery('#glitch-button')
            .prop({disabled: false})
            .css({opacity: 1, display: 'inline'});
        jQuery('#download-button').prop({disabled: true}).css({opacity: 0});
        showImage(targetFile);
        downloadFile = null;
    });
    jQuery('#glitch-button').click(function (ev) {
        srcFilters = getFilter('src');
        destFilter = getFilter('dest');
        if (srcFilters.length === 0) {
            alert('source filter is not specified.');
            return;
        }
        jQuery(this).prop({disabled: true}).animate({opacity: 0});
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
            var $img = jQuery('#target');
            var $progress = jQuery('#progress-bar').animate({opacity: 1});
            var cid = setInterval(function () {
                if (end === 0) {
                    clearInterval(cid);
                    glitching = false;
                    jQuery('#download-button')
                        .prop({disabled: false})
                        .css({opacity: 1});
                    $progress.prop({value: 1.0}).animate({opacity: 0});
                    return;
                }
                png = glitch(png, start, end);
                var blob = png.writeAsBlob(0);
                $img.prop({src: URL.createObjectURL(blob)});
                end = start;
                start = Math.max(end - glitchHeight, 0);
                $progress.prop({value: (png.height - end) / png.height});
            }, interval);
        });
    });
    jQuery('#download-button').click(function (ev) {
        var filename = [
            'glitched-',
            targetFile.name.replace(/\.\w+$/, ''),
            '-',
            srcFilters.join('_'),
            'to',
            destFilter,
            '.png'
        ].join('');
        var $that = jQuery(this);
        $that.prop({disabled: true});
        if (downloadFile) {
            download(downloadFile, filename);
            $that.prop({disabled: false});
            return;
        }
        loadImageAsPNG(targetFile, function (png) {
            png = glitch(png, 0, png.height);
            var worker = new Worker('src/static/worker.js');
            worker.addEventListener('message', function (e) {
                var bb = new BlobBuilder();
                bb.append(e.data);
                downloadFile = bb.getBlob();
                download(downloadFile, filename);
                $that.prop({disabled: false});
                worker.terminate();
            }, false);
            worker.postMessage({png: png, level: 9});
        });
    });
    jQuery('#controller-button').change(function (e) {
        var $target = jQuery('#control-panel > fieldset');
        if (jQuery(this).prop('checked')) {
            $target.fadeIn();
        }
        else {
            $target.fadeOut(function () {
                initCheckbox();
            });
        }
    });
    initCheckbox();
});
