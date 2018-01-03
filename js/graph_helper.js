(function (exports) {
    'use strict';
    // book1: Top Bar Chart (x0)
    // book2: Bottom Bar Chart (x1)
    // connections: connect top bars with bottom bars
    // y-axis: 0 to config.chunk_size for book1 and book2
    // x-axis: decided by maxValues function which returns {book1, book2, peek}
    // vertical layout :: 60 + 60

    exports.openPanel = null; // will be assigned as an event
    exports.closePanel = null; // will be assigned as an event
    exports.animating = false;
    exports.initData = initData;
    exports.setMaxValue = setMaxValue;
    exports.createChart = createChart;
    exports.setLayout = setLayout;
    exports.restoreCanvas = restoreCanvas;
    exports.drawChart = drawChart;
    exports.updateChart = updateChart;

    var clipPathId = "clipDrawing";
    var clipPath = "url('#clipDrawing')";

    var margin = {
        top: 40,
        right: 20,
        bottom: 20,
        left: 60
    },
        padding = {
            top: 40,
            right: 0,
            bottom: 40,
            left: 60
        },
        barMaxHeight = 150;

    var max, width, height,
        outerWidth, outerHeight = 530, innerWidth, innerHeight;

    var selectedLine = null;
    var connColor = '#FFCC66', connHColor = '#ff9600',
        hoverStrokeWidth = 3, barWidth = 0.5;

    var chartData = null, chartMetaData, refLinesData = null, hoverLines = [{}, {}];
    var chartBox, svgD3, drawingG, marksG, clipRect, x0ScaleNode, x1ScaleNode, bookDetails;
    var book1Bars, connections, book2Bars, brushG;

    var xScale, xScaleIdentity, x0Axis, x1Axis;
    var y0Scale, y0Axis, y1Scale, y1Axis;
    var brushHandle = d3.brushX().on("end", brushEnded);

    var xIdentityDomain, currentXDomain,
        duration1 = 700;

    var toolTipDiv;

    function initData(data) {
        chartData = data;
        console.log(chartData[0]);
    }

    var maxValues = {
        book1: null, //13000,
        book2: null, //13500,
        peek: null, //13871,
    }
    function setMaxValue(chunkCounts) {
        maxValues.book1 = chunkCounts[0];
        maxValues.book2 = chunkCounts[1];
        maxValues.peek = Math.max(chunkCounts[0], chunkCounts[1]);
    }

    function createChart() {
        //max = maxValues;
        //console.log("max vlaue" + max.peek);
        toolTipDiv = d3.select("body").append("div").attr("class", "tooltip").style("display", "none").style("opacity", 0.9);

        chartBox = document.getElementById('chartBox');
        svgD3 = d3.select(chartBox).append("svg").attr("class", "chartGroup");
        brushG = svgD3.append("g").attr("class", "brush");
        drawingG = svgD3.append("g").attr("class", "drawing").attr("clip-path", clipPath);
        marksG = svgD3.append("g").attr("class", "markings");


        book1Bars = drawingG.append("g").attr("id", "firstchart");
        connections = drawingG.append("g").attr("class", "connections");
        book2Bars = drawingG.append("g").attr("id", "secondchart");

        xScale = d3.scaleLinear();
        xScaleIdentity = d3.scaleLinear();
        y0Scale = d3.scaleLinear().domain([0, config.chunk_size]).range([barMaxHeight, 0]);
        y1Scale = d3.scaleLinear().domain([0, config.chunk_size]).range([0, barMaxHeight]);
        y0Axis = d3.axisLeft(y0Scale).ticks(5);
        y1Axis = d3.axisLeft(y1Scale).ticks(5);

        // - Book1 xAxis Scale::
        x0ScaleNode = marksG.append("g")
            .attr("class", "x0 axis")
            .attr("transform", "translate(0," + barMaxHeight + ")");

        // - Book2 xAxis Scale::
        x1ScaleNode = marksG.append("g")
            .attr("class", "x1 axis")
            .attr("transform", "translate(0," + barMaxHeight * 2 + ")");

        // - Book1 yAxis Scale::
        marksG.append("g")
            .attr("class", "y0 axis")
            .call(y0Axis);

        // - Book2 xAxis Scale::
        marksG.append("g")
            .attr("class", "y1 axis")
            .call(y1Axis)
            .attr("transform", "translate(0," + barMaxHeight * 2 + ")");

        // - Clip Path (Masking) ::
        clipRect = svgD3.append("defs").append("clipPath")
            .attr("id", clipPathId)
            .append("rect");

    }

    function setLayout() {

        outerWidth = chartBox.offsetWidth;
        innerWidth = outerWidth - margin.left - margin.right;
        innerHeight = outerHeight - margin.top - margin.bottom;
        width = innerWidth - padding.left - padding.right;
        height = innerHeight - 20;

        svgD3.attr("width", outerWidth)
            .attr("height", outerHeight);

        drawingG.attr("transform", "translate(" + margin.left + "," + margin.top + ")");
        brushG.attr("transform", "translate(" + margin.left + "," + margin.top + ")");
        marksG.attr("transform", "translate(" + margin.left + "," + margin.top + ")");
        book2Bars.attr("transform", "translate(0,300)");

        clipRect.attr("width", width)
            .attr("height", height);
        // --- Set Scales on Basis of the chartData ::

        max = maxValues;
        xIdentityDomain = [0, max.peek];
        currentXDomain || (currentXDomain = xIdentityDomain);
        xScale.domain(currentXDomain).range([1, width - 1]);
        xScaleIdentity.domain(xIdentityDomain).range([1, width - 1]);
        x0Axis = d3.axisBottom(xScale);
        x1Axis = d3.axisTop(xScale).tickValues([1, max.book2]);
        brushHandle.extent([[0, 0], [width, height]]);
        refLinesData = [
            { x: 1, y: 0, yScale: y0Scale },
            { x: max.book1, y: 0, yScale: y0Scale },
            { x: 1, y: barMaxHeight * 2, yScale: y1Scale },
            { x: max.book2, y: barMaxHeight * 2, yScale: y1Scale }
        ];
        hoverLines = [
            { x: 150, y: 0, yScale: y0Scale, visible: false },
            { x: 150, y: barMaxHeight * 2, yScale: y0Scale, visible: false }
        ];
    }
    function drawChart() {


        // - Hover Lines ::
        drawingG.selectAll(".dotted-bar-lines")
            .data(hoverLines)
            .enter().insert("line", ":first-child")
            .attr("clip-path", clipPath)
            .attr("class", "dotted-bar-lines")
            .attr("opacity", 0);

        // --- Draw Book1 Bar Chart [START] :::
        var book1BarNodes = book1Bars.selectAll(".bar")
            .data(chartData);

        book1BarNodes.enter().append("line")
            .attr("class", "bar")
            .attr("stroke-width", barWidth);

        book1BarNodes.exit().remove();
        // --- Draw Book1 Bar Chart [END] :::

        // --- Draw Connections Curves [START] :::
        var connectionNodes = connections.selectAll("path")
            .data(chartData);

        connectionNodes.enter().append("path")
            .attr("class", "connection")
            .attr("stroke", connColor);

        connectionNodes.exit().remove();
        // --- Draw Connections Curves [END] :::

        // --- Draw Book2 Bar Chart [START] :::
        var book2BarNodes = book2Bars.selectAll(".bar")
            .data(chartData);

        book2BarNodes.enter().append("line")
            .attr("class", "bar")
            .attr("stroke-width", barWidth);

        book2BarNodes.exit().remove();
        // --- Draw Book2 Bar Chart [END] :::

        // - Append Brush
        brushG.call(brushHandle)
            .select('.overlay')
            .on("dblclick", restoreCanvas);

        // - Max Marking ::
        marksG.selectAll(".max-reference-lines")
            .data(refLinesData)
            .enter().append("line")
            .attr("clip-path", clipPath)
            .attr("class", "max-reference-lines");
    }
    function updateChart(duration) {

        var t = svgD3.transition().duration(duration || 0);

        exports.animating = true;
        t.on('end', function () {
            exports.animating = false;
        });

        // - render Bars of Book1 and Book2 ::
        book1Bars.selectAll(".bar")
            .on("mouseover", mouseOver)
            .on("mouseout", mouseOut)
            .on("click", selectLineOnClicked)
            .transition(t)
            .attr("x1", function (d) { return xScale(d.book1_chunk); })
            .attr("x2", function (d) { return xScale(d.book1_chunk); })
            .attr("y1", function (d) { return y0Scale(d.book1_y1); })
            .attr("y2", function (d) { return y0Scale(d.book1_y2); });

        // - render Connection Curves ::
        connections.selectAll("path")
            .on("mouseover", mouseOver)
            .on("mouseout", mouseOut)
            .on("click", selectLineOnClicked)
            .transition(t)
            .attr("d", function (d) {
                return "M " + xScale(d.book1_chunk) + " 150 C " + xScale(d.book1_chunk) + " 250," + xScale(d.book2_chunk) + " 220 , " + xScale(d.book2_chunk) + " " + 300;
            });

        // - render Bars of Book2 ::
        book2Bars.selectAll(".bar")
            .on("mouseover", mouseOver)
            .on("mouseout", mouseOut)
            .on("click", selectLineOnClicked)
            .transition(t)
            .attr("x1", function (d) { return xScale(d.book2_chunk); })
            .attr("x2", function (d) { return xScale(d.book2_chunk); })
            .attr("y1", function (d) { return y1Scale(d.book2_y1); })
            .attr("y2", function (d) { return y1Scale(d.book2_y2); });

        // - render X Axis of Book1 ::
        x0Axis.tickValues(selectedLine ? [1, selectedLine.book1_chunk, max.book1] : [1, max.book1]);
        x0ScaleNode.transition(t).call(x0Axis)
            .selectAll("text")
            .attr("x", 10)
            .attr("y", -5)
            .attr("transform", "rotate(90)")
            .style("text-anchor", "start");

        // - render X Axis of Book2 ::
        x1Axis.tickValues(selectedLine ? [1, selectedLine.book2_chunk, max.book2] : [1, max.book2]);
        x1ScaleNode.transition(t).call(x1Axis)
            .selectAll("text")
            .attr("x", -10)
            .attr("y", 2)
            .attr("transform", "rotate(90)")
            .style("text-anchor", "end");

        // - render Reference Lines Min and Max ::
        marksG.selectAll(".max-reference-lines").transition(t)
            .attr("x1", function (d) { return xScale(d.x); })
            .attr("x2", function (d) { return xScale(d.x); })
            .attr("y1", function (d) { return d.yScale(0) + d.y; })
            .attr("y2", function (d) { return d.yScale(config.chunk_size) + d.y; });

        return t;
    }

    function brushEnded() {
        if (!d3.event.sourceEvent) return; // Only transition after input.
        var sel = d3.event.selection;
        if (!sel) {
            selectedLine && exports.closePanel();
            return;
        }

        currentXDomain = sel.map(function (d) {
            return Math.round(xScale.invert(d));
        });
        xScale.domain(currentXDomain);
        zoom();
    }
    function restoreCanvas() {
        if (exports.animating) return;

        if (selectedLine) {
            selectedLine = null;
            makeLinesVisible();
        }
        currentXDomain = xIdentityDomain;
        xScale.domain(currentXDomain);
        setTimeout(zoom, 0);
    }
    function zoom() {
        brushG.call(brushHandle.move, null);
        updateChart(duration1);
    }
    function focusOnLine(d1) {
        var a = d1.book1_chunk;
        var b = d1.book2_chunk;
        var min = Math.min(a, b) - xScaleIdentity.invert(5);
        var max = Math.max(a, b) + xScaleIdentity.invert(5);

        currentXDomain = [min, max];
        xScale.domain(currentXDomain);
        zoom();
    }

    function getConnections() {
        return connections.selectAll("path");
    }
    function getBars() {
        return drawingG.selectAll("#firstchart .bar, #secondchart .bar");
    }
    function filterSelected(d1, nodesD3) {
        return nodesD3
            .filter(function (d) {
                return d === d1;
            });
    }
    function showToolTip(d1) {
        var html = 'Book1: #' + d1.book1_chunk + ' (' + d1.book1_y1 + '-' + d1.book1_y2 + ')<br/>'
            + 'Book2: #' + d1.book2_chunk + '' + ' (' + d1.book2_y1 + '-' + d1.book2_y2 + ')';

        toolTipDiv
            .style("display", null);

        toolTipDiv.html(html)
            .style("left", (d3.event.pageX) + "px")
            .style("top", (d3.event.pageY - 28) + "px");
    }
    function hideToolTip() {
        toolTipDiv
            .style("display", "none");
    }
    function mouseOver(d1) {
        filterSelected(d1, getConnections())
            .attr("stroke", connHColor)
            .attr("stroke-width", hoverStrokeWidth)
            .attr("opacity", null);

        filterSelected(d1, getBars())
            .attr("stroke-width", hoverStrokeWidth)
            .attr("opacity", null);

        // - render Dotted Bars for book1 and book2 on hover/click ::
        hoverLines[0].x = d1.book1_chunk;
        hoverLines[1].x = d1.book2_chunk;
        drawingG.selectAll(".dotted-bar-lines")
            .attr("x1", function (d) { return xScale(d.x); })
            .attr("x2", function (d) { return xScale(d.x); })
            .attr("y1", function (d) { return d.yScale(0) + d.y; })
            .attr("y2", function (d) { return d.yScale(config.chunk_size) + d.y; })
            .attr("opacity", null);
        showToolTip(d1);
    }
    function mouseOut(d1) {
        if (selectedLine === d1) return;

        filterSelected(d1, getConnections()).transition()
            .attr("stroke", connColor)
            .attr("stroke-width", null)
            .attr("opacity", opacityOnMouseOut);

        filterSelected(d1, getBars()).transition()
            .attr("stroke-width", barWidth)
            .attr("opacity", opacityOnMouseOut);

        drawingG.selectAll(".dotted-bar-lines")
            .attr("opacity", 0);

        hideToolTip();

        function opacityOnMouseOut(d) {
            return d.hidden ? 0.1 : null
        }
    }
    function selectLineOnClicked(d1) {
        if (d1 === selectedLine) return;
        exports.openPanel(d1);

        selectedLine && clearSelectedLine();
        selectedLine = d1;

        getConnections()
            .each(function hideOthers(d) {
                d.hidden = d !== d1;
            })
            .filter(filterHidden)
            .attr("opacity", 0.1);

        getBars()
            .filter(filterHidden)
            .attr("opacity", 0.1);

        drawingG.selectAll(".dotted-bar-lines")
            .attr("opacity", 0);

        hideToolTip();
        setTimeout(focusOnLine, 0, d1);

        function filterHidden(d) {
            return d.hidden;
        }
    }
    function clearSelectedLine() {
        var d2 = selectedLine;
        selectedLine = null;
        d2.hidden = true;
        mouseOut(d2);
    }
    function makeLinesVisible() {
        getConnections()
            .each(function hideOthers(d) {
                delete d.hidden;
            })
            .attr("stroke", connColor)
            .attr("stroke-width", null)
            .attr("opacity", null);

        getBars()
            .attr("stroke-width", barWidth)
            .attr("opacity", null);

        drawingG.selectAll(".dotted-bar-lines")
            .attr("opacity", 0);

        hideToolTip();
    }

})(window.graphHelper = {});