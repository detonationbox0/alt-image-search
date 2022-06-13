
var key = undefined;



var stage;
var layer;
var trLayer;
var tr;


/**
 * DOCUMENT IS
 */
$(function() {
//#region
    console.log("Hello.");

    /**
     * Make Konva Stage
     */

     stage = new Konva.Stage({
       container: 'canvas',
       width: 300,
       height: 400,
     });
    //  stage.container().style.backgroundColor = 'green';

     /**
      * STAGE SETTINGS. IMPORTED FROM UBIQUITOUS-GIGGLE:
      * https://github.com/detonationbox0/ubiquitous-giggle/blob/master/js/app.js
      * COLLAPSE FOR SANITY
      */
     //--------------------------------------------------------------------------------------------
        //#region <-- Collapse
            // Give the Konva stage a border
            // stage.getContainer().style.border = '1px solid white';


            // Create a new layer in the Stage
            layer = new Konva.Layer();

            // Create a new layer in the Stage for the Transformer
            trLayer = new Konva.Layer();

            stage.add(layer);
            stage.add(trLayer);





            // Create a Transformer for the selection
            tr = new Konva.Transformer({
                // nodes: [imgNode],
                rotateAnchorOffset: 30,
                enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right']
            });

            // Add the transformer to the Layer
            trLayer.add(tr);



            /**
             * -----------------------------------------------------------------------------------
             * Add Guides for Snapping
             * -----------------------------------------------------------------------------------
             * 
             */
            //#region

            // Add the top-right guide
            var topRight = new Konva.Rect({
                x: 200,
                y: 0,
                width: 100,
                height: 100,
                // fill: 'green',
                stroke: '#00FFFF',
                strokeWidth: 1,
                dash: [10, 10],
                name:"guide"
            });

            layer.add(topRight);

            //#endregion

            /**
             * -----------------------------------------------------------------------------------
             * Snapping shapes
             * -----------------------------------------------------------------------------------
             * Adapted from https://konvajs.org/docs/sandbox/Objects_Snapping.html
             * 
             * This aligns the node to other nodes, but doesn't snap
             * I can't work out how to get one node to "snap" to another
             * We probably need to get the x + y and w + h of the snap-to node,
             * and the x + y and w + h of the selected node, and do
             * some math to figure out how close the selected node is to the snap-to node
             * if it's close enough, change the x + y and w + h of the selected node to
             * match the snap-to node...
             * 
             */
            //#region

                var GUIDELINE_OFFSET = 5;

                // were can we snap our objects?
                function getLineGuideStops(skipShape) {
                    // we can snap to stage borders and the center of the stage
                    var vertical = [0, stage.width() / 2, stage.width()];
                    var horizontal = [0, stage.height() / 2, stage.height()];

                    // and we snap over edges and center of each object on the canvas
                    stage.find('.guide').forEach((guideItem) => {
                        if (guideItem === skipShape) {
                            return;
                        }

                        var box = guideItem.getClientRect();
                        // and we can snap to all edges of shapes
                        vertical.push([box.x, box.x + box.width, box.x + box.width / 2]);
                        horizontal.push([box.y, box.y + box.height, box.y + box.height / 2]);
                    });
                    return {
                        vertical: vertical.flat(),
                        horizontal: horizontal.flat(),
                    };
                }

                // what points of the object will trigger to snapping?
                // it can be just center of the object
                // but we will enable all edges and center
                function getObjectSnappingEdges(node) {

                    var box = node.getClientRect();
                    var absPos = node.absolutePosition();

                    return {
                        vertical: [
                            {
                                guide: Math.round(box.x),
                                offset: Math.round(absPos.x - box.x),
                                snap: 'start',
                            },
                            {
                                guide: Math.round(box.x + box.width / 2),
                                offset: Math.round(absPos.x - box.x - box.width / 2),
                                snap: 'center',
                            },
                            {
                                guide: Math.round(box.x + box.width),
                                offset: Math.round(absPos.x - box.x - box.width),
                                snap: 'end',
                            },
                        ],
                        horizontal: [
                            {
                                guide: Math.round(box.y),
                                offset: Math.round(absPos.y - box.y),
                                snap: 'start',
                            },
                            {
                                guide: Math.round(box.y + box.height / 2),
                                offset: Math.round(absPos.y - box.y - box.height / 2),
                                snap: 'center',
                            },
                            {
                                guide: Math.round(box.y + box.height),
                                offset: Math.round(absPos.y - box.y - box.height),
                                snap: 'end',
                            },
                        ],
                        };
                }

                // find all snapping possibilities
                function getGuides(lineGuideStops, itemBounds) {
                    var resultV = [];
                    var resultH = [];

                    lineGuideStops.vertical.forEach((lineGuide) => {
                    itemBounds.vertical.forEach((itemBound) => {
                        var diff = Math.abs(lineGuide - itemBound.guide);
                        // if the distance between guild line and object snap point is close we can consider this for snapping
                        if (diff < GUIDELINE_OFFSET) {
                        resultV.push({
                            lineGuide: lineGuide,
                            diff: diff,
                            snap: itemBound.snap,
                            offset: itemBound.offset,
                        });
                        }
                    });
                    });

                    lineGuideStops.horizontal.forEach((lineGuide) => {
                    itemBounds.horizontal.forEach((itemBound) => {
                        var diff = Math.abs(lineGuide - itemBound.guide);
                        if (diff < GUIDELINE_OFFSET) {
                        resultH.push({
                            lineGuide: lineGuide,
                            diff: diff,
                            snap: itemBound.snap,
                            offset: itemBound.offset,
                        });
                        }
                    });
                    });

                    var guides = [];

                    // find closest snap
                    var minV = resultV.sort((a, b) => a.diff - b.diff)[0];
                    var minH = resultH.sort((a, b) => a.diff - b.diff)[0];
                    if (minV) {
                    guides.push({
                        lineGuide: minV.lineGuide,
                        offset: minV.offset,
                        orientation: 'V',
                        snap: minV.snap,
                    });
                    }
                    if (minH) {
                    guides.push({
                        lineGuide: minH.lineGuide,
                        offset: minH.offset,
                        orientation: 'H',
                        snap: minH.snap,
                    });
                    }
                    return guides;
                }

                function drawGuides(guides) {
                    guides.forEach((lg) => {
                    if (lg.orientation === 'H') {
                        var line = new Konva.Line({
                            points: [-6000, 0, 6000, 0],
                            stroke: 'rgb(0, 161, 255)',
                            strokeWidth: 1,
                            name: 'guid-line',
                            dash: [4, 6],
                        });
                        layer.add(line);
                        line.absolutePosition({
                            x: 0,
                            y: lg.lineGuide,
                        });
                    } else if (lg.orientation === 'V') {
                        var line = new Konva.Line({
                            points: [0, -6000, 0, 6000],
                            stroke: 'rgb(0, 161, 255)',
                            strokeWidth: 1,
                            name: 'guid-line',
                            dash: [4, 6],
                        });
                        layer.add(line);
                        line.absolutePosition({
                            x: lg.lineGuide,
                            y: 0,
                        });
                    }
                    });
                }


                layer.on('dragmove', function (e) {
                    // clear all previous lines on the screen
                    layer.find('.guid-line').forEach((l) => l.destroy());

                    // find possible snapping lines
                    var lineGuideStops = getLineGuideStops(e.target);
                    // find snapping points of current object
                    var itemBounds = getObjectSnappingEdges(e.target);

                    // now find where can we snap current object
                    var guides = getGuides(lineGuideStops, itemBounds);

                    // do nothing of no snapping
                    if (!guides.length) {
                        return;
                    }

                    drawGuides(guides);

                    var absPos = e.target.absolutePosition();
                    // now force object position
                    guides.forEach((lg) => {
                    switch (lg.snap) {
                        case 'start': {
                        switch (lg.orientation) {
                            case 'V': {
                                absPos.x = lg.lineGuide + lg.offset;
                                break;
                            }
                            case 'H': {
                                absPos.y = lg.lineGuide + lg.offset;
                                break;
                            }
                        }
                        break;
                        }
                        case 'center': {
                        switch (lg.orientation) {
                            case 'V': {
                                absPos.x = lg.lineGuide + lg.offset;
                                break;
                            }
                            case 'H': {
                                absPos.y = lg.lineGuide + lg.offset;
                                break;
                            }
                        }
                        break;
                        }
                        case 'end': {
                        switch (lg.orientation) {
                            case 'V': {
                                absPos.x = lg.lineGuide + lg.offset;
                                break;
                            }
                            case 'H': {
                                absPos.y = lg.lineGuide + lg.offset;
                                break;
                            }
                        }
                        break;
                        }
                    }
                    });
                    e.target.absolutePosition(absPos);
                });

                layer.on('dragend', function (e) {
                    // clear all previous lines on the screen
                    layer.find('.guid-line').forEach((l) => l.destroy());
                });


        //#endregion

//#endregion    
});

/**
 * USER CLICKS SEARCH BUTTON
 */
$("#btn-search").on("click", function() {
//#region
    // Get the search query
    var query = $("#query").val();

    // If query is empty, do nothing
    if (query.length == 0) {
        console.log("Please enter a search query.");
        return;
    }

    
    // Build URL including search query
    var url = `https://openclipart.org/api/v2@beta/search?q=${encodeURI(query)}`;

    // Make AJAX request
    // Only if there's a key
    if (key != undefined) {

        var ajxReq = $.ajax({
            url:url,
            contentType:"application/json",
            dataType:"json",
            type:"GET",
            beforeSend: function (xhr) {
                xhr.setRequestHeader("x-openclipart-apikey", key);
            },
            success: function(msg) {

                // API Response:
                console.log(msg)

                // // Clear current results
                $("#results").empty();

                var resultData = msg.data.files;

                for (var i = 0; i < resultData.length; i++) {

                    // Make a DOM element
                    var dom = `
                        <div class="img-thumb">
                            <img class="img" id="${resultData[i].id}" src="${resultData[i].thumbnails.medium}" svg-link="${resultData[i].svg_file}" />
                            <pre class="svg-name">ID: ${resultData[i].id}</pre>
                        </div>
                    `
                    $("#results").append(dom);
                }
            }
        }); 
    } else {
        alert("You do not have an access token.");
    }
//#endregion
});

/**
 * USER LOGS IN
 */
$("#login").on("click", function() {
//#region
    // Get username / password
    key = $("#un").val();
    $("#login-area").hide();
    $("#app-container").css("display", "flex");


//#endregion
});

/**
 * USER CLICKS ON A SEARCH RESULT
 */
$(document).on("click", ".img-thumb", function() {

    var svgUrl = $(this).find("img").attr("svg-link");
    // var svgID = $(this).find("img").attr("id");

    // https://forum.freesvg.org/viewtopic.php?id=31
    // var svgURL = `https://freesvg.org/storage/zip/blog/${svgName}`;

    console.log(svgUrl)


    // //Given URL, import into Konva
    // //Imported from Ubiquitous Giggle
    // // Create Image Node to be added to the layer
    Konva.Image.fromURL(svgUrl, function (imgNode) { // <- This line is for GitHub's relative link
        // Konva.Image.fromURL('/logo-mail-shark.svg', function (imgNode) { // <- This line is for debugging locally
        // Konva.Image.fromURL('https://images.getbento.com/accounts/63e50d3a0270f2fe2c25af59b44fc235/media/images/logo-hero-white.png', function (imgNode) {
           // ↑ This line uses a raster logo
    
            imgNode.setAttrs({
                x: 0,
                y: 0,
                scaleX: 0.2,
                scaleY: 0.2,
                draggable: true,
                name:"selectable"
            });
    
            // Add the Image Node to the Layer
            layer.add(imgNode);
            imgNode.moveToTop();
    
            // Add the image to the Transformer
            tr.nodes([imgNode])
            
    
            // Draw the layer
            layer.draw();
    
    
            // Attach events to the Image Node
            
            imgNode.on('mouseover', function() {
                document.body.style.cursor = 'pointer';            
            });
    
            imgNode.on('mouseout', function() {
                document.body.style.cursor = 'default';
            });
       
    
            // ... more events available https://konvajs.org/docs/events/Binding_Events.html
    
    });


    // window.open(svgURL);

})


/**
 * USER PRESSES ENTER TO LOG IN OR SEARCH
 */

$("#un, #pw").on("keydown", function(event) {
    var key = (event.keyCode ? event.keyCode : event.which);
    console.log(key);
    if (key == 13) {
        $("#login").click();
    }
});

$("#query").on("keydown", function(event) {
    var key = (event.keyCode ? event.keyCode : event.which);
    console.log(key);
    if (key == 13) {
        $("#btn-search").click();
    }
})
