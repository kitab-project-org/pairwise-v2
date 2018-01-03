'use strict';
(function () {

  window.renderVisual = renderVisual;
  function renderVisual(srtFileName, bookUris) {

    // book1: Top Bar Chart (x0)
    // book2: Bottom Bar Chart (x1)
    // connections: connect top bars with bottom bars
    // y-axis: 0 to 100 for book1 and book2
    // x-axis: decided by maxValues function which returns {book1, book2, peek}
    // vertical layout :: 60 + 60

    var isPanelOpened;
    var duration1 = 700, duration2 = 400;

    var bookDiv = document.getElementById('book-details');
    var graph = graphHelper;
    var bookDetails;
    graph.openPanel = openPanel;
    graph.closePanel = closePanel;

    marked.setOptions({
      renderer: new marked.Renderer(),
      gfm: true,
      tables: true,
      breaks: false,
      pedantic: false,
      sanitize: false,
      smartLists: true,
      smartypants: false
    });

    // use mapDataWithIndex function when there is no header
    // d3.tsv('data-live.txt', mapData, function (error, data) {
    d3.queue()
      .defer(d3.text, utils.replaceParams(config.srt_data_path, { 'file_name': srtFileName }))
      .defer(d3.text, config.meta_data_path)
      .await(function (error, srtDataText, metaDataText) {
        if (!srtDataText && metaDataText) {
          throw new Error('Data is undefined');
        }
        var selectedMetadata = dataLoader.parseMetaDataFile(metaDataText, bookUris);
        graph.setMaxValue(selectedMetadata.map(function (d) {
          return d.book_chunk_count;
        }));

        var srtData = dataLoader.parseSrtFile(srtDataText);
        graph.initData(srtData);
        graph.setLayout();

        setTimeout(function () {
          graph.drawChart();
          graph.updateChart();
        }, 500);

        bookDetails = d3.select(bookDiv).append('g');
        bookDetails.selectAll('.book-details')
          .data(selectedMetadata)
          .enter().append('div').attr('class', 'books-details')
          .append('a').attr('class', 'a-width')
          .attr('href', function (d) { return d.github_url; })
          .text(function (d) { return 'Github Book URL: ' + utils.replaceParams(config.book_content_url, { 'book_id': d.book_id }); });

        bookDetails.selectAll('div')
          .append('p')
          .text(function (d) { return 'Book Author: ' + d.book_author; });

        bookDetails.selectAll('div')
          .append('p')
          .text(function (d) { return 'Word Count: ' + d.book_word_count; });

        bookDetails.selectAll('div')
          .append('p')
          .text(function (d) { return 'Book Title: ' + d.book_title; });

        bookDetails.selectAll('div')
          .append('p')
          .text(function (d) { return 'Book URI: ' + d.book_uri; });

        eventBindings();
      });

    graph.createChart();
    // graph.setLayout();

    function eventBindings() {
      d3.select('#closeBtn').on('click', closePanel);
      window.onresize = onResize;
      config.bookSequence.forEach(bookName => {
        d3.select('#' + bookName + 'StartBtn').on('click', dataLoader.loadBackwardContent.bind(null, bookName));
        d3.select('#' + bookName + 'EndBtn').on('click', dataLoader.loadForwardContent.bind(null, bookName));
      });
    }

    function onResize() {
      graph.setLayout();
      graph.drawChart();
      graph.updateChart(duration2);
    }

    // --- Panel Events [START] :::
    function openPanel(itemData) {
      if (graph.animating) return;

      isPanelOpened = true;
      d3.select('#mySidenav').style('display', null);
      d3.select('#bottomPanelRaw').style('display', null);
      setTimeout(function () {
        d3.select('#mySidenav').style('opacity', null);
      }, duration1);

      dataLoader.loadBooks(itemData);
    }

    function closePanel() {
      if (graph.animating) return;

      isPanelOpened = false;
      graph.restoreCanvas();
      graph.setLayout();
      graph.drawChart();
      setTimeout(function () {
        d3.select('#bottomPanelRaw').style('display', 'none');
        d3.select('#mySidenav').style('opacity', 0);
      }, 500);
    }

    // --- Panel Events [END] :::
  };
})();